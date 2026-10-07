import { SIM_CONFIG as C, type Policy } from './config';
import { BUSINESS_CATALOG, INDUSTRIES, INITIAL_BUSINESSES, TECH_UPGRADES, type BusinessTemplate, type IndustryId } from './industries';
import { GROWTH_DISTRICTS, INITIAL_DISTRICTS, LOTS, LOT_BY_ID, type Lot } from './map';
import { EDUCATION_PROJECTS, INFRA_PROJECTS, type ProjectDef } from './projects';
import { createRng, type Rng } from './random';
import type { Business, GovernmentState, Metrics, Project, SimEvent, TechShockInfo, YearSummary } from './types';

const MONTHS = 12;

/**
 * The economic model. Advances one month at a time and emits events that the
 * visual layer turns into animation. It knows nothing about rendering.
 */
export class Economy {
  policy: Policy;
  rng!: Rng;
  month = 0;
  workforce = 0;
  skills = 0;
  stage = 1;
  businesses: Business[] = [];
  houses: string[] = [];
  occupied = new Set<string>();
  unlocked = new Set<string>();
  gov!: GovernmentState;
  metrics!: Metrics;
  /** One entry per month: metrics at the end of that month. history[0] = start. */
  history: Metrics[] = [];
  /** Businesses that recently released workers (one entry per worker), oldest first. */
  releasedQueue: string[] = [];
  catalogIndex = 0;
  lastFoundingMonth = -99;
  foundedCount = 0;
  hoursFreedTotal = 0;
  transactionsTotal = 0;
  milestones = new Set<string>();
  techUpgrades = 0;
  private yearStart!: { hoursFreedRate: number; businesses: number; industries: number; jobsInNew: number };
  private jobsInNewTotal = 0;
  private events: SimEvent[] = [];
  private nextId = 0;

  constructor(policy: Policy) {
    this.policy = { ...policy };
    this.reset(policy);
  }

  get year() {
    return this.month / MONTHS;
  }

  get finished() {
    return this.month >= C.totalYears * MONTHS;
  }

  reset(policy: Policy = this.policy) {
    this.policy = { ...policy };
    this.rng = createRng(C.seed);
    this.month = 0;
    this.workforce = C.initialWorkers;
    this.skills = 0;
    this.stage = 1;
    this.businesses = [];
    this.houses = [];
    this.occupied = new Set();
    this.unlocked = new Set(INITIAL_DISTRICTS);
    this.unlocked.add('rural');
    this.releasedQueue = [];
    this.catalogIndex = 0;
    this.lastFoundingMonth = -99;
    this.foundedCount = 0;
    this.hoursFreedTotal = 0;
    this.transactionsTotal = 0;
    this.milestones = new Set();
    this.techUpgrades = 0;
    this.jobsInNewTotal = 0;
    this.events = [];
    this.nextId = 0;
    this.gov = {
      reserves: 20_000,
      infraFund: 0,
      eduFund: 0,
      treasury: 20_000,
      taxRevenue: 0,
      operations: 0,
      taxRevenueTotal: 0,
      investedTotal: 0,
      investedThisYear: 0,
      levels: { roads: 0, digital: 0, energy: 0, education: 0 },
      projects: [],
    };

    for (const t of INITIAL_BUSINESSES) this.openBusiness(t, true);
    const targetHouses = Math.ceil(this.population / C.peoplePerHouse);
    while (this.houses.length < targetHouses) this.buildHouse(false);

    this.updateEconomy(0);
    this.history = [this.computeMetrics(0)];
    this.metrics = this.history[0];
    this.yearStart = this.captureYearStart();
    this.events = [];
    this.emit({ type: 'milestone', id: 'start', title: 'A basic local economy', subtitle: 'Farmers work by hand, shops keep paper ledgers and almost every payment is cash.', year: 1 });
  }

  setPolicy(p: Partial<Policy>) {
    this.policy = { ...this.policy, ...p };
  }

  get population() {
    return this.workforce / C.participationRate;
  }

  /** Pull pending events (visual layer consumes them). */
  drainEvents(): SimEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  private emit(e: SimEvent) {
    this.events.push(e);
  }

  // ───────────────────────────────────────────────────────────── stepping

  step() {
    if (this.finished) return;
    this.month += 1;
    const dt = 1 / MONTHS;
    const p = this.policy;
    const g = this.gov;

    // 1. Labour force grows; new businesses attract people.
    const growth = C.workforceGrowth + C.migrationPerBusiness * Math.min(this.foundedCount, 12) * 0.25;
    this.workforce *= 1 + growth * dt;

    // 2. Skills accumulate — slowly, but they compound into productivity.
    this.skills += (C.skillBase + C.skillPerEduLevel * g.levels.education + C.skillPerEduSlider * p.education) * dt;

    // 3. Public projects finishing construction.
    for (const proj of g.projects) {
      if (!proj.done && this.month >= proj.completesAt) {
        proj.done = true;
        g.levels[proj.category] = Math.max(g.levels[proj.category], proj.level);
        this.emit({ type: 'projectCompleted', project: proj });
        this.projectMilestones(proj);
      }
    }

    // 4. Private technology adoption.
    this.adoptTechnology(dt);

    // 5. Production, hiring and releasing.
    this.updateEconomy(dt);

    // 6. Freed hours become new businesses.
    this.createBusinesses();

    // 7. Housing follows population.
    const targetHouses = Math.ceil(this.population / C.peoplePerHouse);
    if (this.houses.length < targetHouses) this.buildHouse(true);

    // 8. Taxes and public finance.
    this.publicFinance(dt);

    // 9. Stage progression.
    this.updateStage();

    // 10. Metrics and milestones.
    this.metrics = this.computeMetrics(dt);
    this.history.push(this.metrics);
    this.checkMilestones();

    if (this.month % MONTHS === 0) this.endYear();
  }

  // ───────────────────────────────────────────────────────────── businesses

  private productivityOf(b: Pick<Business, 'industry' | 'techMult'>) {
    const s = INDUSTRIES[b.industry].sensitivity;
    const L = this.gov.levels;
    return (
      100 *
      (1 + C.roadEffect * L.roads * s.roads) *
      (1 + C.digitalEffect * L.digital * s.digital) *
      (1 + C.energyEffect * L.energy * s.energy) *
      (1 + C.skillEffect * this.skills) *
      b.techMult
    );
  }

  private valuePerHour(industry: IndustryId) {
    return C.baseValuePerHour * INDUSTRIES[industry].valueMult;
  }

  private openBusiness(t: BusinessTemplate, legacy: boolean): Business | null {
    const lot = t.lot ? LOT_BY_ID[t.lot] : this.findLot(t.size === 2 ? 'big' : 'com');
    if (!lot || this.occupied.has(lot.id)) return null;
    this.occupied.add(lot.id);
    const b: Business = {
      id: `biz-${this.nextId++}`,
      name: t.name,
      industry: t.industry,
      style: t.style,
      lotId: lot.id,
      founded: this.year,
      legacy,
      startup: !!t.startup,
      techLevel: 0,
      techMult: 1,
      employees: t.employees,
      hours: t.employees * C.hoursPerWorkerMonth,
      output: 0,
      demand: 0,
      mature: legacy,
      productivity: 100,
      baseHours: t.employees * C.hoursPerWorkerMonth,
      baseProductivity: 100,
      taxesPaid: 0,
      wagesPaid: 0,
      unit: t.unit,
      unitsPerDay: t.unitsPerDay,
    };
    b.productivity = this.productivityOf(b);
    b.baseProductivity = b.productivity;
    b.output = b.hours * MONTHS * this.valuePerHour(b.industry) * (b.productivity / 100);
    b.demand = b.output;
    this.businesses.push(b);
    return b;
  }

  /** Find the best free lot of a kind, opening a new district when the town is full. */
  private findLot(kind: Lot['kind']): Lot | null {
    const free = () =>
      LOTS.filter((l) => l.kind === kind && this.unlocked.has(l.district) && !this.occupied.has(l.id)).sort((a, b) => a.priority - b.priority)[0];
    let lot = free();
    if (lot) return lot;
    for (const d of GROWTH_DISTRICTS) {
      if (this.unlocked.has(d)) continue;
      if (!LOTS.some((l) => l.district === d && l.kind === kind)) continue;
      this.unlockDistrict(d);
      lot = free();
      if (lot) return lot;
    }
    return null;
  }

  unlockDistrict(d: string) {
    if (this.unlocked.has(d)) return;
    this.unlocked.add(d);
    this.emit({ type: 'districtUnlocked', district: d });
  }

  private buildHouse(emitEvent: boolean) {
    const lot = this.findLot('house');
    if (!lot) return;
    this.occupied.add(lot.id);
    this.houses.push(lot.id);
    if (emitEvent) this.emit({ type: 'houseBuilt', lotId: lot.id });
  }

  private adoptTechnology(dt: number) {
    const p = this.policy;
    const L = this.gov.levels;
    const privateCapital = this.privateCapital();
    const prob = (C.techBase + C.techPerSlider * p.techAdoption) * privateCapital * dt;
    const bakery = this.businesses.find((b) => b.name === 'Rosemary Bakery');

    // The story's first productivity shock: the bakery buys electric ovens.
    if (bakery && bakery.techLevel === 0 && this.month === 26) {
      this.upgrade(bakery, 1.62, true);
      return;
    }
    for (const b of this.businesses) {
      // Infrastructure caps how far automation can go: you cannot automate without power and connectivity.
      const cap = Math.min(C.techMaxLevel, 1 + L.digital + L.energy);
      if (b.techLevel >= cap) continue;
      if (this.year - b.founded < 1) continue;
      if (this.month < 18) continue;
      if (this.rng.chance(prob)) {
        const featured = this.milestones.has('shock-food') && !this.milestones.has(`shock-${b.industry}`) && ['agriculture', 'retail'].includes(b.industry) && b.legacy;
        this.upgrade(b, C.techMultStep + this.rng.range(-0.05, 0.08), featured);
      }
    }
  }

  /** Private capital available for upgrades: high taxes leave businesses less to invest. */
  privateCapital() {
    return 1.3 - 1.5 * this.policy.taxRate;
  }

  private upgrade(b: Business, mult: number, featured: boolean) {
    const before = b.employees;
    const prodBefore = this.productivityOf(b);
    b.techLevel += 1;
    b.techMult *= mult;
    this.techUpgrades += 1;
    const prodAfter = this.productivityOf(b);
    // Same output, fewer hours (mature) — the headline mechanism.
    let after = before;
    if (b.mature) {
      const hours = b.demand / (MONTHS * this.valuePerHour(b.industry) * (prodAfter / 100));
      after = Math.max(1, Math.round(hours / C.hoursPerWorkerMonth));
    }
    if (featured) this.milestones.add(`shock-${b.industry}`);
    const info: TechShockInfo = {
      businessId: b.id,
      businessName: b.name,
      upgrade: TECH_UPGRADES[b.industry][Math.min(b.techLevel - 1, 3)],
      unit: b.unit,
      unitsPerDay: b.unitsPerDay,
      workersBefore: before,
      workersAfter: after,
      hoursBefore: before * 8,
      hoursAfter: b.mature ? after * 8 : Math.round((before * 8 * prodBefore) / prodAfter),
      featured,
    };
    this.emit({ type: 'techShock', info });
  }

  private updateEconomy(dt: number) {
    // Taxes take a bite out of disposable income, so demand grows a little slower.
    const demandGrowth = C.matureDemandGrowth * (1.3 - 1.5 * this.policy.taxRate);
    for (const b of this.businesses) {
      b.productivity = this.productivityOf(b);
      const vph = this.valuePerHour(b.industry);
      if (!b.mature && this.year - b.founded >= C.growthPhaseYears) {
        b.mature = true;
        b.demand = b.output;
      }
      if (b.mature) {
        b.demand *= 1 + demandGrowth * dt;
        const hours = b.demand / (MONTHS * vph * (b.productivity / 100));
        const needed = Math.max(1, Math.round(hours / C.hoursPerWorkerMonth));
        if (needed < b.employees) {
          const n = b.employees - needed;
          b.employees = needed;
          for (let k = 0; k < n; k++) this.releasedQueue.push(b.id);
          if (dt > 0) this.emit({ type: 'workersReleased', businessId: b.id, count: n });
        } else if (needed > b.employees && this.idleWorkers() > 0) {
          b.employees += 1;
          if (dt > 0) this.emit({ type: 'workersHired', businessId: b.id, count: 1, sources: this.takeSources(1) });
        }
        b.output = b.demand;
      } else {
        b.output = b.employees * C.hoursPerWorkerMonth * MONTHS * vph * (b.productivity / 100);
      }
      b.hours = b.employees * C.hoursPerWorkerMonth;
    }
  }

  idleWorkers() {
    return Math.round(this.workforce) - this.businesses.reduce((s, b) => s + b.employees, 0);
  }

  private takeSources(n: number) {
    const s: string[] = [];
    for (let k = 0; k < n; k++) s.push(this.releasedQueue.shift() ?? 'home');
    return s;
  }

  private nextTemplate(): BusinessTemplate | null {
    const t = BUSINESS_CATALOG[this.catalogIndex];
    if (!t) return null;
    if (INDUSTRIES[t.industry].stage > this.stage) return null;
    return t;
  }

  private createBusinesses() {
    const idle = this.idleWorkers();
    const t = this.nextTemplate();
    // Less private capital (higher taxes) means founders wait longer for funding.
    const cooldown = C.foundingCooldownMonths + Math.round(Math.max(0, this.policy.taxRate - 0.2) * 20);
    if (t && idle >= t.employees && this.month - this.lastFoundingMonth >= cooldown) {
      const industriesBefore = new Set(this.businesses.map((b) => b.industry));
      const capacityHours = idle * C.hoursPerWorkerMonth;
      const b = this.openBusiness(t, false);
      this.catalogIndex += 1;
      if (!b) return;
      this.lastFoundingMonth = this.month;
      this.foundedCount += 1;
      this.jobsInNewTotal += b.employees;
      this.emit({
        type: 'businessFounded',
        business: b,
        sources: this.takeSources(b.employees),
        newIndustry: !industriesBefore.has(b.industry),
        capacityHours,
        index: this.foundedCount,
      });
      return;
    }
    // No new business is possible yet: idle hands join the youngest growing firms.
    if (idle >= 3) {
      const growing = this.businesses.filter((b) => !b.mature).sort((a, b) => b.founded - a.founded)[0];
      if (growing) {
        growing.employees += 1;
        this.jobsInNewTotal += 1;
        this.emit({ type: 'workersHired', businessId: growing.id, count: 1, sources: this.takeSources(1) });
      }
    }
  }

  private updateStage() {
    const L = this.gov.levels;
    const prod = this.metrics?.avgProductivity ?? 100;
    let s = 1;
    if (prod >= C.stage2Productivity || this.year >= 4) s = 2;
    if (s === 2 && L.digital >= 2 && L.education >= 2) s = 3;
    if (s === 3 && (L.education >= 3 || (prod >= C.stage4Productivity && L.digital >= 3))) s = 4;
    if (s > this.stage) {
      this.stage = s;
      this.emit({ type: 'stageUnlocked', stage: s });
    }
  }

  // ───────────────────────────────────────────────────────────── government

  private publicFinance(dt: number) {
    const g = this.gov;
    const p = this.policy;
    const gdp = this.businesses.reduce((s, b) => s + b.output, 0);
    g.taxRevenue = gdp * p.taxRate;
    g.operations = C.opsPerResident * this.population;
    const taxes = g.taxRevenue * dt;
    const ops = g.operations * dt;
    g.taxRevenueTotal += taxes;
    for (const b of this.businesses) {
      b.taxesPaid += b.output * p.taxRate * dt;
      b.wagesPaid += b.output * C.laborShare * dt;
    }
    const surplus = taxes - ops;
    if (surplus > 0) {
      const share = C.investShareBase + C.investSharePerSlider * (p.infrastructure + p.education) / 2;
      const wI = 0.25 + p.infrastructure;
      const wE = 0.25 + p.education;
      const invest = surplus * Math.min(1, share);
      g.infraFund += (invest * wI) / (wI + wE);
      g.eduFund += (invest * wE) / (wI + wE);
      g.reserves += surplus - invest;
    } else {
      g.reserves += surplus;
      if (g.reserves < 0) {
        // Running costs come out of the investment funds first.
        const cover = Math.min(-g.reserves, g.infraFund + g.eduFund);
        const fromInfra = Math.min(g.infraFund, cover / 2 + Math.max(0, cover / 2 - g.eduFund));
        g.infraFund -= fromInfra;
        g.eduFund -= cover - fromInfra;
        g.reserves += cover;
        g.reserves = Math.max(g.reserves, 0);
      }
    }
    // Reserves above six months of running costs are released for investment.
    const cap = g.operations * 0.5;
    if (g.reserves > cap) {
      const excess = g.reserves - cap;
      g.reserves = cap;
      g.infraFund += excess * 0.6;
      g.eduFund += excess * 0.4;
    }
    this.tryStartProject(INFRA_PROJECTS, 'infraFund', dt);
    this.tryStartProject(EDUCATION_PROJECTS, 'eduFund', dt);
    g.treasury = g.reserves + g.infraFund + g.eduFund;
  }

  private tryStartProject(track: ProjectDef[], fund: 'infraFund' | 'eduFund', dt: number) {
    const g = this.gov;
    const next = track.find((d) => !g.projects.some((p) => p.id === d.id));
    if (!next) {
      // Every big project is built: the budget goes to upkeep and upgrades of what exists.
      const spend = g[fund] * 0.25 * Math.min(1, dt * 12);
      g[fund] -= spend;
      g.investedTotal += spend;
      g.investedThisYear += spend;
      return;
    }
    // Projects in a track are built one at a time, with time to plan the next one.
    const inTrack = g.projects.filter((p) => (fund === 'eduFund' ? p.category === 'education' : p.category !== 'education'));
    if (inTrack.some((p) => !p.done)) return;
    const lastStart = Math.max(-99, ...inTrack.map((p) => p.startedAt));
    if (this.month - lastStart < C.projectSpacingMonths) return;
    if (g[fund] < next.cost) return;
    g[fund] -= next.cost;
    g.investedTotal += next.cost;
    g.investedThisYear += next.cost;
    if (next.unlocks) this.unlockDistrict(next.unlocks);
    const proj: Project = { ...next, startedAt: this.month, completesAt: this.month + C.buildMonths, done: false };
    g.projects.push(proj);
    this.emit({ type: 'projectStarted', project: proj });
  }

  // ───────────────────────────────────────────────────────────── metrics

  private computeMetrics(dt: number): Metrics {
    const bs = this.businesses;
    const gdp = bs.reduce((s, b) => s + b.output, 0);
    const employed = bs.reduce((s, b) => s + b.employees, 0);
    const laborHours = employed * C.hoursPerWorkerMonth;
    const avgProductivity = laborHours > 0 ? bs.reduce((s, b) => s + b.productivity * b.hours, 0) / bs.reduce((s, b) => s + b.hours, 0) : 100;
    const hoursFreedRate = bs.reduce((s, b) => s + b.baseHours * Math.max(0, 1 - b.baseProductivity / b.productivity), 0);
    this.hoursFreedTotal += hoursFreedRate * dt * MONTHS;
    const ticket = C.avgTicket / (1 + 0.3 * this.gov.levels.digital);
    const transactionsPerDay = gdp / 365 / ticket;
    this.transactionsTotal += transactionsPerDay * 30.4 * dt * MONTHS;
    const services = bs.filter((b) => INDUSTRIES[b.industry].services).reduce((s, b) => s + b.output, 0);
    const workers = Math.round(this.workforce);
    return {
      year: 1 + this.year,
      month: this.month,
      population: Math.round(this.population),
      workers,
      employed,
      idleWorkers: Math.max(0, workers - employed),
      businesses: bs.length,
      industries: new Set(bs.map((b) => b.industry)).size,
      gdp,
      gdpPerWorker: gdp / Math.max(1, workers),
      transactionsPerDay,
      transactionsTotal: this.transactionsTotal,
      taxRevenue: this.gov.taxRevenue || gdp * this.policy.taxRate,
      taxRevenueTotal: this.gov.taxRevenueTotal,
      govInvestmentTotal: this.gov.investedTotal,
      treasury: this.gov.treasury,
      avgProductivity,
      laborHours,
      hoursFreedRate,
      hoursFreedTotal: this.hoursFreedTotal,
      servicesShare: gdp > 0 ? services / gdp : 0,
      stage: this.stage,
      houses: this.houses.length,
    };
  }

  /** Metrics 12 months ago (or the start), for trend arrows. */
  metricsAgo(months = 12): Metrics {
    return this.history[Math.max(0, this.history.length - 1 - months)];
  }

  private captureYearStart() {
    return {
      hoursFreedRate: this.metrics.hoursFreedRate,
      businesses: this.businesses.length,
      industries: this.metrics.industries,
      jobsInNew: this.jobsInNewTotal,
    };
  }

  private endYear() {
    const y = this.yearStart;
    const summary: YearSummary = {
      year: Math.round(this.year),
      hoursReleased: Math.max(0, this.metrics.hoursFreedRate - y.hoursFreedRate),
      newBusinesses: this.businesses.length - y.businesses,
      newJobs: this.jobsInNewTotal - y.jobsInNew,
      newMarkets: this.metrics.industries - y.industries,
    };
    this.emit({ type: 'yearEnd', summary });
    this.gov.investedThisYear = 0;
    this.yearStart = this.captureYearStart();
    if (this.finished) {
      const first = this.history[0];
      const m = this.metrics;
      const out = m.gdp / first.gdp;
      const lab = m.laborHours / first.laborHours;
      this.emit({
        type: 'milestone',
        id: 'final',
        title: `The economy produces ${out.toFixed(1)}× more output with only ${lab.toFixed(1)}× more labour`,
        subtitle: 'Twenty years of reinvested productivity.',
        year: 20,
      });
    }
  }

  private milestone(id: string, title: string, subtitle: string) {
    if (this.milestones.has(id)) return;
    this.milestones.add(id);
    this.emit({ type: 'milestone', id, title, subtitle, year: Math.floor(1 + this.year) });
  }

  private projectMilestones(p: Project) {
    if (p.id === 'digital-1') this.milestone('digital', 'Digital payments spread', 'Card terminals replace cash drawers. Shopkeepers stop counting coins and money moves instantly.');
    if (p.id === 'roads-1') this.milestone('roads', 'Road infrastructure improves', 'Paved roads cut delivery times. Trucks move faster and logistics costs fall.');
  }

  private checkMilestones() {
    const m = this.metrics;
    const automated = this.businesses.filter((b) => b.techLevel >= 1).length;
    if (automated >= 7 && this.year >= 6) this.milestone('automation', 'Automation reaches local businesses', 'Machines take over repetitive work in farms, shops and workshops.');
    if (this.month === 9 * MONTHS + 1)
      this.milestone('hours', `${(Math.floor(m.hoursFreedRate / 100) * 100).toLocaleString('en-US')} human hours/month have been released`, 'The town produces its original output with far fewer hours. That time is now free for something new.');
    if (this.businesses.some((b) => b.industry === 'software')) this.milestone('software', 'A software industry emerges', 'Broadband plus trained graduates: freed workers start writing code instead of copying ledgers.');
    if (m.servicesShare > 0.67 && this.year >= 12) this.milestone('services', 'Services become larger than agriculture', 'Most value now comes from knowledge, care and creativity rather than raw materials.');
  }
}
