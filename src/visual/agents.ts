import type { Economy } from '../sim/engine';
import { INDUSTRIES, type IndustryId } from '../sim/industries';
import { LOT_BY_ID, ROAD_LINES } from '../sim/map';
import type { Business, SimEvent } from '../sim/types';
import { roofHeight } from '../components/Building';
import { iso, shade, type Pt } from './iso';
import { FLOW, type FlowKind } from './palette';
import { RoadNetwork, lotCenter, type GP } from './paths';

const NS = 'http://www.w3.org/2000/svg';

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, parent?: Element): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (parent) parent.appendChild(e);
  return e;
}

export type FlywheelSignal = 'productivity' | 'output' | 'hours' | 'business' | 'transactions' | 'income' | 'tax' | 'investment' | 'infrastructure';

interface Person {
  id: number;
  g: SVGGElement;
  body: SVGRectElement;
  halo: SVGCircleElement;
  ring: SVGCircleElement;
  home: string;
  job: string | null;
  path: GP[];
  seg: number;
  segT: number;
  pos: GP;
  inside: boolean;
  wait: number;
  goal: 'work' | 'shop' | 'home' | 'transfer';
  shop: string | null;
  lane: number;
  transfer: number;
  released: boolean;
}

interface Vehicle {
  g: SVGGElement;
  shapeI: SVGGElement;
  shapeJ: SVGGElement;
  path: GP[];
  seg: number;
  segT: number;
  phase: number;
  kind: 'truck' | 'van' | 'bus';
  stops: string[];
}

interface Particle {
  g: SVGGElement;
  trail: SVGCircleElement[];
  from: Pt;
  to: Pt;
  ctrl: Pt;
  t: number;
  dur: number;
  history: Pt[];
  onArrive?: () => void;
}

interface Fx {
  g: SVGGElement;
  t: number;
  dur: number;
  kind: 'label' | 'pulse';
  x: number;
  y: number;
}

export interface AgentCallbacks {
  onPersonClick: (p: { id: number; job: string | null; home: string }) => void;
  onSignal: (s: FlywheelSignal) => void;
  onCaption: (text: string | null) => void;
}

const CONSUMER_INDUSTRIES: IndustryId[] = ['retail', 'food', 'hospitality', 'healthcare', 'media', 'education', 'finance'];

const SUPPLIERS: Record<IndustryId, IndustryId[]> = {
  agriculture: ['retail', 'construction', 'logistics', 'advmfg'],
  retail: ['agriculture', 'food', 'logistics'],
  construction: ['construction', 'retail', 'logistics'],
  food: ['agriculture', 'logistics'],
  hospitality: ['agriculture', 'food', 'retail'],
  logistics: ['retail', 'advmfg', 'finance'],
  professional: ['software', 'retail'],
  healthcare: ['retail', 'professional', 'research'],
  software: ['professional', 'finance', 'media'],
  finance: ['software', 'professional'],
  education: ['software', 'media', 'retail'],
  media: ['software', 'professional'],
  research: ['advmfg', 'software', 'logistics'],
  advmfg: ['logistics', 'research', 'construction'],
};

/**
 * Imperative SVG animation layer: walkers, vehicles, money particles, labels.
 * Runs every animation frame without involving React.
 */
export class AgentSystem {
  private people: Person[] = [];
  private vehicles: Vehicle[] = [];
  private particles: Particle[] = [];
  private fx: Fx[] = [];
  private nextId = 1;
  private txAcc = 0;
  private govAcc = 0;
  private lastLabel = 0;
  private lastRelease = -9;
  private clock = 0;
  private selected: number | null = null;
  private intro: { step: number; t: number } | null = null;
  network: RoadNetwork;
  private unlockedKey = '';

  constructor(
    private econ: () => Economy,
    private peopleLayer: SVGGElement,
    private fxLayer: SVGGElement,
    private cb: AgentCallbacks,
  ) {
    this.network = new RoadNetwork(econ().unlocked);
    this.reset();
  }

  // ───────────────────────────────────────────────────────────── lifecycle

  reset() {
    this.dispose();
    this.cb.onCaption(null);
    this.syncNetwork(true);
    this.syncPopulation();
    this.syncVehicles();
  }

  private syncNetwork(force = false) {
    const key = [...this.econ().unlocked].sort().join(',');
    if (!force && key === this.unlockedKey) return;
    this.unlockedKey = key;
    this.network.rebuild(this.econ().unlocked);
    for (const v of this.vehicles) v.g.remove();
    this.vehicles = [];
  }

  setSelected(id: number | null) {
    this.selected = id;
    for (const p of this.people) p.ring.setAttribute('opacity', p.id === id ? '1' : '0');
  }

  personInfo(id: number) {
    const p = this.people.find((q) => q.id === id);
    return p ? { id: p.id, job: p.job, home: p.home } : null;
  }

  // ───────────────────────────────────────────────────────────── geometry helpers

  private business(id: string | null): Business | undefined {
    return id ? this.econ().businesses.find((b) => b.id === id) : undefined;
  }

  /** Anchor point (top of building) for flows. */
  private anchor(target: string): Pt {
    if (target === 'townhall') {
      const p = iso(12, 12, 62);
      return p;
    }
    const biz = this.business(target);
    if (biz) {
      const lot = LOT_BY_ID[biz.lotId];
      const c = lotCenter(biz.lotId);
      return iso(c.i, c.j, roofHeight(biz.style, lot) + 4);
    }
    if (LOT_BY_ID[target]) {
      const c = lotCenter(target);
      const kind = LOT_BY_ID[target].kind;
      return iso(c.i, c.j, kind === 'house' ? 24 : kind === 'farm' ? 14 : 30);
    }
    return iso(13.5, 13.5, 20);
  }

  // ───────────────────────────────────────────────────────────── population

  private targetPeople() {
    const w = this.econ().metrics.workers;
    return Math.max(22, Math.min(52, Math.round(w * 0.62)));
  }

  private pickJob(): string | null {
    const bs = this.econ().businesses.filter((b) => b.employees > 0);
    if (!bs.length) return null;
    const counts = new Map<string, number>();
    for (const p of this.people) if (p.job) counts.set(p.job, (counts.get(p.job) ?? 0) + 1);
    let best = bs[0];
    let bestScore = -Infinity;
    for (const b of bs) {
      const score = b.employees / ((counts.get(b.id) ?? 0) + 1) + Math.random() * 0.5;
      if (score > bestScore) {
        bestScore = score;
        best = b;
      }
    }
    return best.id;
  }

  private syncPopulation() {
    const target = this.targetPeople();
    const houses = this.econ().houses;
    while (this.people.length < target && houses.length) {
      const home = houses[Math.floor(Math.random() * houses.length)];
      this.addPerson(home, this.pickJob());
    }
    // Make sure people whose job vanished find one.
    for (const p of this.people) if (p.job && !this.business(p.job)) p.job = this.pickJob();
  }

  private addPerson(home: string, job: string | null): Person {
    const g = el('g', { class: 'person' }, this.peopleLayer);
    const halo = el('circle', { r: 9, cy: -6, fill: FLOW.hours.color, opacity: 0, class: 'halo' }, g);
    const ring = el('circle', { r: 9, cy: -6, fill: 'none', stroke: '#2B2A28', 'stroke-width': 1.2, opacity: 0 }, g);
    el('ellipse', { rx: 3.2, ry: 1.4, cy: 0, fill: '#3B3427', opacity: 0.2 }, g);
    const body = el('rect', { x: -2.1, y: -8.5, width: 4.2, height: 7.5, rx: 2, fill: '#888' }, g);
    const skins = ['#E8C4A2', '#C99A76', '#A87656', '#F0D2B6', '#8C5D42'];
    el('circle', { r: 2.2, cy: -10.6, fill: skins[Math.floor(Math.random() * skins.length)] }, g);
    el('circle', { r: 8, cy: -6, fill: 'transparent' }, g);
    const c = lotCenter(home);
    const p: Person = {
      id: this.nextId++,
      g,
      body,
      halo,
      ring,
      home,
      job,
      path: [],
      seg: 0,
      segT: 0,
      pos: { ...c },
      inside: true,
      wait: Math.random() * 3,
      goal: 'home',
      shop: null,
      lane: Math.random() > 0.5 ? 0.3 : -0.3,
      transfer: 0,
      released: false,
    };
    g.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cb.onPersonClick({ id: p.id, job: p.job, home: p.home });
    });
    g.style.visibility = 'hidden';
    this.paintPerson(p);
    this.people.push(p);
    return p;
  }

  private paintPerson(p: Person) {
    const biz = this.business(p.job);
    p.body.setAttribute('fill', biz ? INDUSTRIES[biz.industry].color : '#9A948A');
  }

  private sendPerson(p: Person, goal: Person['goal'], targetLot: string) {
    const to = lotCenter(targetLot);
    const fromKey = `${p.pos.i.toFixed(1)},${p.pos.j.toFixed(1)}`;
    p.path = this.network.route(fromKey, p.pos, targetLot, to);
    p.seg = 0;
    p.segT = 0;
    p.goal = goal;
    p.inside = false;
    p.g.style.visibility = 'visible';
  }

  private nextDestination(p: Person) {
    const e = this.econ();
    if (p.goal === 'home' || p.goal === 'shop') {
      const job = this.business(p.job);
      if (job && !p.released) return this.sendPerson(p, 'work', job.lotId);
      return this.sendPerson(p, 'home', p.home);
    }
    // After work: sometimes shop, otherwise home.
    if (Math.random() < 0.55) {
      const shops = e.businesses.filter((b) => CONSUMER_INDUSTRIES.includes(b.industry));
      if (shops.length) {
        const s = shops[Math.floor(Math.random() * shops.length)];
        p.shop = s.id;
        return this.sendPerson(p, 'shop', s.lotId);
      }
    }
    this.sendPerson(p, 'home', p.home);
  }

  private arrive(p: Person, playing: boolean) {
    p.inside = true;
    p.g.style.visibility = 'hidden';
    if (p.goal === 'work') p.wait = 2.5 + Math.random() * 3.5;
    else if (p.goal === 'home') p.wait = 1.5 + Math.random() * 3;
    else if (p.goal === 'shop') {
      p.wait = 0.8 + Math.random() * 1.2;
      if (playing && p.shop && Math.random() < 0.6) {
        // Household spending: a short hop from the shopper into the shop.
        const amount = [8, 12, 15, 20, 30, 45][Math.floor(Math.random() * 6)];
        this.purchase(iso(p.pos.i, p.pos.j, 10), p.shop, amount, Math.random() < 0.3);
      }
    } else if (p.goal === 'transfer') {
      p.wait = 3;
      p.goal = 'work';
    }
  }

  // ───────────────────────────────────────────────────────────── vehicles

  private syncVehicles() {
    const e = this.econ();
    const target = Math.min(9, 2 + Math.floor(e.businesses.length / 6));
    const roadsLevel = e.gov.levels.roads;
    const buses = roadsLevel >= 3 ? 2 : 0;
    const trucks = this.vehicles.filter((v) => v.kind !== 'bus').length;
    const haveBuses = this.vehicles.filter((v) => v.kind === 'bus').length;
    for (let k = trucks; k < target; k++) this.addVehicle(k);
    for (let k = haveBuses; k < buses; k++) this.addBus(k);
  }

  private truckStops(k: number): string[] {
    const e = this.econ();
    const find = (pred: (b: Business) => boolean) => e.businesses.filter(pred);
    const farms = find((b) => b.industry === 'agriculture');
    const shops = find((b) => ['retail', 'food', 'hospitality'].includes(b.industry));
    const logistics = find((b) => b.industry === 'logistics');
    const hub = e.gov.levels.roads >= 2 ? 'logistics' : 'depot';
    const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    const lotOf = (b?: Business) => (b ? b.lotId : 'depot');
    switch (k % 4) {
      case 0:
        return [lotOf(pick(farms)), 'depot', lotOf(pick(shops))];
      case 1:
        return [hub, lotOf(pick(shops)), lotOf(pick(shops))];
      case 2:
        return logistics.length ? [lotOf(pick(logistics)), lotOf(pick(e.businesses)), hub] : ['com-21-14', lotOf(pick(shops)), e.houses[Math.floor(Math.random() * e.houses.length)]];
      default:
        return [lotOf(pick(farms)), hub, lotOf(pick(e.businesses))];
    }
  }

  private loopPath(stops: string[]): GP[] {
    const out: GP[] = [];
    for (let k = 0; k < stops.length; k++) {
      const a = stops[k];
      const b = stops[(k + 1) % stops.length];
      const seg = this.network.route(a, lotCenter(a), b, lotCenter(b));
      // Vehicles stay on the road: drop the lot centres.
      const road = seg.slice(1, -1);
      out.push(...(out.length ? road.slice(1) : road));
    }
    return out.length >= 2 ? out : [{ i: 13.5, j: 8.5 }, { i: 13.5, j: 18.5 }];
  }

  private vehicleShape(parent: SVGGElement, axis: 'i' | 'j', color: string, len: number, h: number) {
    const g = el('g', {}, parent);
    const w = 0.2;
    const [L, D] = axis === 'i' ? [len, w] : [w, len];
    const i = -L / 2;
    const j = -D / 2;
    const P = (a: number, b: number, z: number) => {
      const p = iso(a, b, z);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    };
    el('ellipse', { cx: 2, cy: 2, rx: 9, ry: 3.5, fill: '#3B3427', opacity: 0.15 }, g);
    el('polygon', { points: [P(i, j + D, 2), P(i + L, j + D, 2), P(i + L, j + D, 2 + h), P(i, j + D, 2 + h)].join(' '), fill: color }, g);
    el('polygon', { points: [P(i + L, j, 2), P(i + L, j + D, 2), P(i + L, j + D, 2 + h), P(i + L, j, 2 + h)].join(' '), fill: shade(color, -0.2) }, g);
    el('polygon', { points: [P(i, j, 2 + h), P(i + L, j, 2 + h), P(i + L, j + D, 2 + h), P(i, j + D, 2 + h)].join(' '), fill: shade(color, 0.25) }, g);
    return g;
  }

  private addVehicle(k: number) {
    const colors = ['#C7704F', '#5E7FA0', '#D4A64A', '#7B8898', '#8FA35F'];
    const g = el('g', { class: 'vehicle' }, this.peopleLayer);
    const color = colors[k % colors.length];
    const shapeI = this.vehicleShape(g, 'i', color, 0.42, 7);
    const shapeJ = this.vehicleShape(g, 'j', color, 0.42, 7);
    const stops = this.truckStops(k);
    const path = this.loopPath(stops);
    this.vehicles.push({ g, shapeI, shapeJ, path, seg: Math.floor(Math.random() * (path.length - 1)), segT: 0, phase: Math.random() * 10, kind: k % 3 === 1 ? 'van' : 'truck', stops });
  }

  private addBus(k: number) {
    const g = el('g', { class: 'vehicle' }, this.peopleLayer);
    const shapeI = this.vehicleShape(g, 'i', '#3D7BC0', 0.62, 9);
    const shapeJ = this.vehicleShape(g, 'j', '#3D7BC0', 0.62, 9);
    const idx = (n: number) => ROAD_LINES.indexOf(n as (typeof ROAD_LINES)[number]);
    const ring = this.network.ring([
      [idx(8), idx(8)],
      [idx(18), idx(8)],
      [idx(18), idx(18)],
      [idx(8), idx(18)],
    ]);
    this.vehicles.push({ g, shapeI, shapeJ, path: ring, seg: k * Math.floor(ring.length / 2), segT: 0, phase: 0, kind: 'bus', stops: [] });
  }

  // ───────────────────────────────────────────────────────────── money flows

  private spawnParticle(kind: FlowKind, from: Pt, to: Pt, onArrive?: () => void, slow = 1) {
    const digital = this.econ().gov.levels.digital >= 1;
    const color = FLOW[kind].color;
    const g = el('g', { class: 'particle' }, this.fxLayer);
    const trail: SVGCircleElement[] = [];
    const hours = kind === 'hours';
    if (digital || hours || kind === 'gov') {
      for (let k = 0; k < 3; k++) trail.push(el('circle', { r: 2.4 - k * 0.5, fill: color, opacity: 0.35 - k * 0.1 }, g));
      if (hours) el('circle', { r: 7, fill: 'url(#glowAmber)', class: 'head' }, g);
      el('circle', { r: hours ? 3.4 : 2.7, fill: color, class: 'head', stroke: '#fff', 'stroke-width': 0.8 }, g);
    } else {
      // Cash era: little coins.
      el('ellipse', { rx: 3.8, ry: 3.4, fill: shade(color, -0.15), class: 'head' }, g);
      el('ellipse', { rx: 3.8, ry: 3.4, cy: -1, fill: color, class: 'head' }, g);
      el('ellipse', { rx: 2.2, ry: 1.9, cy: -1, fill: 'none', stroke: shade(color, 0.35), 'stroke-width': 0.8, class: 'head' }, g);
    }
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const lift = Math.min(150, dist * 0.32) + 18;
    const ctrl = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - lift };
    const base = digital ? 0.55 + dist / 1400 : 1.05 + dist / 900;
    this.particles.push({ g, trail, from, to, ctrl, t: 0, dur: base * slow * (hours ? 1.6 : 1), history: [], onArrive });
  }

  private label(text: string, at: Pt, kind: FlowKind, priority: 'normal' | 'high' | 'script' = 'normal') {
    const live = this.fx.filter((f) => f.kind === 'label');
    if (priority !== 'script') {
      // Keep the town readable: few labels at once, never stacked on the same spot.
      const gap = priority === 'high' ? 0.45 : 0.9;
      if (this.clock - this.lastLabel < gap) return;
      if (live.length >= (priority === 'high' ? 4 : 3)) return;
      if (live.some((f) => Math.abs(f.x - at.x) < 70 && Math.abs(f.y - (at.y - 12)) < 22)) return;
    }
    this.lastLabel = this.clock;
    const g = el('g', { class: 'flow-label' }, this.fxLayer);
    const color = FLOW[kind].color;
    const w = 10 + text.length * 5.6;
    el('rect', { x: -w / 2, y: -9, width: w, height: 16, rx: 8, fill: '#FFFFFF', stroke: color, 'stroke-width': 0.9, opacity: 0.97 }, g);
    const t = el('text', { x: 0, y: 3, 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 600, 'font-family': 'Inter, sans-serif', fill: shade(color, -0.35) }, g);
    t.textContent = text;
    this.fx.push({ g, t: 0, dur: 1.9, kind: 'label', x: at.x, y: at.y - 12 });
  }

  private pulse(at: Pt, kind: FlowKind, big = false) {
    const g = el('g', {}, this.fxLayer);
    el('ellipse', { rx: 10, ry: 5, fill: 'none', stroke: FLOW[kind].color, 'stroke-width': big ? 2 : 1.3 }, g);
    this.fx.push({ g, t: 0, dur: big ? 1.6 : 0.8, kind: 'pulse', x: at.x, y: at.y });
  }

  private purchase(from: Pt, shopId: string, amount: number, showLabel: boolean, chainTax = true) {
    const shopPt = this.anchor(shopId);
    this.spawnParticle('consumer', from, shopPt, () => {
      this.pulse(shopPt, 'consumer');
      this.cb.onSignal('transactions');
      if (showLabel) this.label(`+$${amount} sale`, shopPt, 'consumer');
      const rate = this.econ().policy.taxRate;
      if (chainTax && rate > 0 && Math.random() < 0.55) {
        // Causality: the sale generates a tax payment that flies to the Town Hall.
        window.setTimeout(() => this.tax(shopId, Math.max(1, Math.round(amount * rate)), Math.random() < 0.35), 380);
      }
    });
  }

  private tax(fromId: string, amount: number, showLabel: boolean) {
    const hall = this.anchor('townhall');
    this.spawnParticle('tax', this.anchor(fromId), hall, () => {
      this.pulse(hall, 'tax');
      this.cb.onSignal('tax');
      if (showLabel) this.label(`+$${amount} tax`, hall, 'tax');
    });
  }

  private randomBusiness(pred?: (b: Business) => boolean) {
    const bs = this.econ().businesses.filter(pred ?? (() => true));
    if (!bs.length) return undefined;
    // Weighted by output so big businesses trade more.
    const total = bs.reduce((s, b) => s + b.output, 0);
    let r = Math.random() * total;
    for (const b of bs) {
      r -= b.output;
      if (r <= 0) return b;
    }
    return bs[bs.length - 1];
  }

  private spawnTransaction() {
    const e = this.econ();
    const r = Math.random();
    const houses = e.houses;
    const house = houses[Math.floor(Math.random() * houses.length)];
    if (r < 0.4) {
      const shop = this.randomBusiness((b) => CONSUMER_INDUSTRIES.includes(b.industry));
      if (shop && house) this.purchase(this.anchor(house), shop.id, [10, 15, 20, 30, 40][Math.floor(Math.random() * 5)], Math.random() < 0.3);
    } else if (r < 0.62) {
      const b = this.randomBusiness();
      if (!b || !house) return;
      const wage = Math.round(((b.output * 0.6) / Math.max(1, b.employees) / 12 / 4) / 10) * 10;
      const to = this.anchor(house);
      this.spawnParticle('salary', this.anchor(b.id), to, () => {
        this.pulse(to, 'salary');
        this.cb.onSignal('income');
        if (Math.random() < 0.3) this.label(`+$${wage} salary`, to, 'salary');
      });
    } else if (r < 0.84) {
      const b = this.randomBusiness();
      if (!b) return;
      const sup = this.randomBusiness((s) => s.id !== b.id && SUPPLIERS[b.industry].includes(s.industry));
      if (!sup) return;
      const amount = [20, 30, 40, 60, 80][Math.floor(Math.random() * 5)];
      const from = this.anchor(b.id);
      const to = this.anchor(sup.id);
      if (Math.random() < 0.25) this.label(`−$${amount} payment`, from, 'supplier');
      this.spawnParticle('supplier', from, to, () => {
        this.pulse(to, 'supplier');
        this.cb.onSignal('output');
      });
    } else if (r < 0.95) {
      const b = this.randomBusiness();
      if (b && e.policy.taxRate > 0) this.tax(b.id, Math.max(1, Math.round(b.output * e.policy.taxRate / 2000)), Math.random() < 0.25);
    } else {
      // Running public services: teachers, nurses.
      const target = Math.random() < 0.5 ? 'school' : 'clinic';
      this.spawnParticle('gov', this.anchor('townhall'), this.anchor(target), () => this.pulse(this.anchor(target), 'gov'));
    }
  }

  // ───────────────────────────────────────────────────────────── simulation events

  handle(ev: SimEvent) {
    switch (ev.type) {
      case 'districtUnlocked':
        this.syncNetwork();
        break;
      case 'businessFounded':
        this.onFounded(ev.business, ev.sources);
        break;
      case 'workersReleased': {
        const at = this.anchor(ev.businessId);
        this.pulse(at, 'hours', true);
        if (this.clock - this.lastRelease > 1.6) {
          this.lastRelease = this.clock;
          this.label(`+${ev.count * 160}h/mo freed`, at, 'hours', 'high');
        }
        this.cb.onSignal('hours');
        let n = ev.count;
        for (const p of this.people) {
          if (n <= 0) break;
          if (p.job === ev.businessId && !p.released) {
            p.released = true;
            p.halo.setAttribute('opacity', '0.35');
            n--;
          }
        }
        break;
      }
      case 'workersHired': {
        const to = this.anchor(ev.businessId);
        for (const s of ev.sources) this.spawnParticle('hours', this.anchor(s === 'home' ? this.econ().houses[0] : s), to);
        break;
      }
      case 'techShock': {
        const at = this.anchor(ev.info.businessId);
        this.pulse(at, 'hours', true);
        const saved = ev.info.hoursBefore - ev.info.hoursAfter;
        this.label(saved > 0 ? `${ev.info.upgrade} · −${saved}h/day` : ev.info.upgrade, at, 'hours', 'high');
        this.cb.onSignal('productivity');
        break;
      }
      case 'projectStarted': {
        const site = this.anchor(ev.project.site);
        const hall = this.anchor('townhall');
        this.label(`−$${Math.round(ev.project.cost / 1000)}k public investment`, hall, 'gov', 'high');
        for (let k = 0; k < 5; k++) window.setTimeout(() => this.spawnParticle('gov', hall, site, () => this.pulse(site, 'gov')), k * 220);
        this.cb.onSignal('investment');
        break;
      }
      case 'projectCompleted': {
        const site = this.anchor(ev.project.site);
        this.pulse(site, 'gov', true);
        this.label(`${ev.project.name} opens`, site, 'gov', 'high');
        this.cb.onSignal('infrastructure');
        if (ev.project.category === 'roads') {
          for (const v of this.vehicles) v.g.remove();
          this.vehicles = [];
        }
        break;
      }
      case 'houseBuilt':
        this.pulse(this.anchor(ev.lotId), 'salary');
        break;
      default:
        break;
    }
  }

  private onFounded(b: Business, sources: string[]) {
    const to = this.anchor(b.id);
    this.cb.onSignal('business');
    // Freed hours travel as glowing orbs from where they were released to the new business.
    sources.forEach((s, k) => {
      const from = s === 'home' ? this.anchor(this.econ().houses[k % this.econ().houses.length]) : this.anchor(s);
      window.setTimeout(() => this.spawnParticle('hours', from, to, () => this.pulse(to, 'hours', true)), k * 260);
    });
    // And actual people walk over to their new jobs.
    let n = Math.min(3, sources.length);
    const candidates = [...this.people.filter((p) => p.released), ...this.people.filter((p) => sources.includes(p.job ?? ''))];
    for (const p of candidates) {
      if (n <= 0) break;
      if (p.goal === 'transfer') continue;
      p.job = b.id;
      p.released = false;
      p.transfer = 6;
      p.halo.setAttribute('opacity', '0.55');
      this.paintPerson(p);
      this.sendPerson(p, 'transfer', b.lotId);
      n--;
    }
    window.setTimeout(() => this.label(`New: ${b.name}`, to, 'hours', 'high'), 900);
  }

  // ───────────────────────────────────────────────────────────── intro sequence

  /** "Follow the money": a scripted walk through one worker's $100. */
  startIntro() {
    this.intro = { step: 0, t: 0 };
  }

  private runIntro(dt: number) {
    if (!this.intro) return;
    const e = this.econ();
    const it = this.intro;
    it.t -= dt;
    if (it.t > 0) return;
    const byName = (n: string) => e.businesses.find((b) => b.name === n);
    const farm = byName('Hillside Farm');
    const grocery = byName('Main Street Grocery');
    const bakery = byName('Rosemary Bakery');
    const store = byName('Corner General Store');
    const hardware = byName('Hartwell Hardware');
    const house = e.houses[3] ?? e.houses[0];
    if (!farm || !grocery || !bakery || !store || !hardware || !house) {
      this.intro = null;
      return;
    }
    const H = this.anchor(house);
    const steps: (() => number)[] = [
      () => {
        this.cb.onCaption('Follow the money · A farm worker earns $100 in wages');
        this.spawnParticle('salary', this.anchor(farm.id), H, () => {
          this.pulse(H, 'salary', true);
          this.label('+$100 salary', H, 'salary', 'script');
        }, 1.4);
        return 2.4;
      },
      () => {
        this.cb.onCaption('They spend $30 at the grocery store…');
        this.purchaseScripted(H, grocery.id, 30, 'sale');
        return 1.7;
      },
      () => {
        this.cb.onCaption('…$10 at the bakery and $15 on transport…');
        this.purchaseScripted(H, bakery.id, 10, 'sale');
        window.setTimeout(() => this.purchaseScripted(H, store.id, 15, 'fuel'), 500);
        return 2.2;
      },
      () => {
        this.cb.onCaption('…and save the remaining $45');
        this.label('$45 saved', H, 'salary', 'script');
        return 1.8;
      },
      () => {
        this.cb.onCaption('The grocery pays its staff, buys from the farm, and pays tax');
        const G = this.anchor(grocery.id);
        this.label('−$12 payment', G, 'supplier', 'script');
        this.spawnParticle('supplier', G, this.anchor(farm.id), () => this.pulse(this.anchor(farm.id), 'supplier', true), 1.3);
        window.setTimeout(() => this.spawnParticle('salary', G, this.anchor(e.houses[6] ?? house), undefined, 1.2), 300);
        window.setTimeout(() => this.taxScripted(grocery.id, 6), 650);
        return 2.6;
      },
      () => {
        this.cb.onCaption('The farm pays its workers, buys equipment, and pays tax too');
        const F = this.anchor(farm.id);
        this.spawnParticle('salary', F, this.anchor(e.houses[9] ?? house), () => this.label('+$20 salary', this.anchor(e.houses[9] ?? house), 'salary', 'script'), 1.3);
        window.setTimeout(() => this.spawnParticle('supplier', F, this.anchor(hardware.id), () => this.label('+$8 equipment', this.anchor(hardware.id), 'supplier', 'script'), 1.3), 400);
        window.setTimeout(() => this.taxScripted(farm.id, 2), 900);
        return 2.8;
      },
      () => {
        this.cb.onCaption('Taxes collect in the Town Hall treasury, ready to be reinvested');
        this.pulse(this.anchor('townhall'), 'tax', true);
        return 2.6;
      },
      () => {
        this.cb.onCaption(null);
        this.intro = null;
        return 0;
      },
    ];
    const fn = steps[it.step];
    it.step += 1;
    it.t = fn ? fn() : 0;
  }

  private purchaseScripted(from: Pt, shopId: string, amount: number, word: string) {
    const to = this.anchor(shopId);
    this.spawnParticle('consumer', from, to, () => {
      this.pulse(to, 'consumer', true);
      this.label(`+$${amount} ${word}`, to, 'consumer', 'script');
    }, 1.3);
  }

  private taxScripted(fromId: string, amount: number) {
    const hall = this.anchor('townhall');
    this.spawnParticle('tax', this.anchor(fromId), hall, () => {
      this.pulse(hall, 'tax', true);
      this.label(`+$${amount} tax`, hall, 'tax', 'script');
    }, 1.3);
  }

  // ───────────────────────────────────────────────────────────── frame update

  update(dt: number, playing: boolean, speed: number) {
    this.clock += dt;
    const vis = playing ? [1, 1.35, 1.9][speed === 1 ? 0 : speed === 2 ? 1 : 2] : 0.55;
    const e = this.econ();

    if (playing) {
      this.runIntro(dt);
      this.syncPopulation();
      this.syncVehicles();
      const tx = e.metrics.transactionsPerDay;
      const rate = Math.min(3.2, 0.9 + 0.6 * Math.log2(tx / 100 + 1)) * Math.sqrt(speed) * (this.intro ? 0.25 : 1);
      this.txAcc += dt * rate;
      while (this.txAcc >= 1) {
        this.txAcc -= 1;
        if (this.particles.length < 46) this.spawnTransaction();
      }
      // Public projects under construction draw a thin stream of public money.
      const building = e.gov.projects.filter((p) => !p.done);
      if (building.length) {
        this.govAcc += dt * 1.2;
        while (this.govAcc >= 1) {
          this.govAcc -= 1;
          const p = building[Math.floor(Math.random() * building.length)];
          const site = this.anchor(p.site);
          this.spawnParticle('gov', this.anchor('townhall'), site, () => this.pulse(site, 'gov'));
        }
      }
    }

    // People
    const speedTiles = 1.15 * vis;
    for (const p of this.people) {
      if (p.transfer > 0) {
        p.transfer -= dt;
        if (p.transfer <= 0) p.halo.setAttribute('opacity', p.released ? '0.35' : '0');
      }
      if (p.inside) {
        p.wait -= dt * vis;
        if (p.wait <= 0) this.nextDestination(p);
        continue;
      }
      let move = speedTiles * dt;
      while (move > 0 && p.seg < p.path.length - 1) {
        const a = p.path[p.seg];
        const b = p.path[p.seg + 1];
        const len = Math.hypot(b.i - a.i, b.j - a.j) || 0.0001;
        const remain = (1 - p.segT) * len;
        if (move < remain) {
          p.segT += move / len;
          move = 0;
        } else {
          move -= remain;
          p.seg += 1;
          p.segT = 0;
        }
      }
      if (p.seg >= p.path.length - 1) {
        p.pos = { ...p.path[p.path.length - 1] };
        this.arrive(p, playing);
        continue;
      }
      const a = p.path[p.seg];
      const b = p.path[p.seg + 1];
      p.pos = { i: a.i + (b.i - a.i) * p.segT, j: a.j + (b.j - a.j) * p.segT };
      // Walk on the pavement, not in the middle of the road (except at the lot ends).
      const onRoad = p.seg > 0 && p.seg < p.path.length - 2;
      const off = onRoad ? p.lane : 0;
      const s = iso(p.pos.i + off, p.pos.j + off);
      p.g.setAttribute('transform', `translate(${s.x.toFixed(1)},${s.y.toFixed(1)})`);
    }

    // Vehicles
    const roads = e.gov.levels.roads;
    for (const v of this.vehicles) {
      let sp = (v.kind === 'bus' ? 1.5 : 1.3) * (1 + 0.42 * roads) * vis;
      if (roads === 0) sp *= 0.35 + 0.65 * Math.abs(Math.sin(this.clock * 0.7 + v.phase)); // stop-and-go on dirt roads
      let move = sp * dt;
      while (move > 0) {
        const a = v.path[v.seg];
        const b = v.path[(v.seg + 1) % v.path.length];
        const len = Math.hypot(b.i - a.i, b.j - a.j) || 0.0001;
        const remain = (1 - v.segT) * len;
        if (move < remain) {
          v.segT += move / len;
          move = 0;
        } else {
          move -= remain;
          v.seg = (v.seg + 1) % v.path.length;
          v.segT = 0;
        }
      }
      const a = v.path[v.seg];
      const b = v.path[(v.seg + 1) % v.path.length];
      const di = b.i - a.i;
      const dj = b.j - a.j;
      const len = Math.hypot(di, dj) || 1;
      const off = 0.13;
      const pi = a.i + di * v.segT + (-dj / len) * off;
      const pj = a.j + dj * v.segT + (di / len) * off;
      const s = iso(pi, pj);
      const alongI = Math.abs(di) >= Math.abs(dj);
      v.shapeI.style.display = alongI ? '' : 'none';
      v.shapeJ.style.display = alongI ? 'none' : '';
      v.g.setAttribute('transform', `translate(${s.x.toFixed(1)},${s.y.toFixed(1)})`);
    }

    // Particles
    for (let k = this.particles.length - 1; k >= 0; k--) {
      const p = this.particles[k];
      p.t += dt / p.dur;
      const t = Math.min(1, p.t);
      const e2 = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const x = (1 - e2) * (1 - e2) * p.from.x + 2 * (1 - e2) * e2 * p.ctrl.x + e2 * e2 * p.to.x;
      const y = (1 - e2) * (1 - e2) * p.from.y + 2 * (1 - e2) * e2 * p.ctrl.y + e2 * e2 * p.to.y;
      p.history.unshift({ x, y });
      if (p.history.length > 10) p.history.pop();
      for (const node of Array.from(p.g.children)) {
        if (node.classList.contains('head')) node.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`);
      }
      p.trail.forEach((c, n) => {
        const h = p.history[Math.min(p.history.length - 1, (n + 1) * 3)];
        c.setAttribute('cx', h.x.toFixed(1));
        c.setAttribute('cy', h.y.toFixed(1));
      });
      if (p.t >= 1) {
        p.g.remove();
        this.particles.splice(k, 1);
        p.onArrive?.();
      }
    }

    // Labels & pulses
    for (let k = this.fx.length - 1; k >= 0; k--) {
      const f = this.fx[k];
      f.t += dt / f.dur;
      if (f.kind === 'label') {
        const rise = 14 * Math.min(1, f.t * 1.6);
        const op = f.t < 0.15 ? f.t / 0.15 : f.t > 0.75 ? Math.max(0, (1 - f.t) / 0.25) : 1;
        f.g.setAttribute('transform', `translate(${f.x.toFixed(1)},${(f.y - rise).toFixed(1)})`);
        f.g.setAttribute('opacity', op.toFixed(2));
      } else {
        const s = 1 + f.t * 2.4;
        f.g.setAttribute('transform', `translate(${f.x.toFixed(1)},${f.y.toFixed(1)}) scale(${s.toFixed(2)})`);
        f.g.setAttribute('opacity', Math.max(0, 1 - f.t).toFixed(2));
      }
      if (f.t >= 1) {
        f.g.remove();
        this.fx.splice(k, 1);
      }
    }
    if (this.selected != null) {
      const p = this.people.find((q) => q.id === this.selected);
      if (p) p.ring.setAttribute('opacity', '1');
    }
  }

  dispose() {
    for (const p of this.people) p.g.remove();
    for (const v of this.vehicles) v.g.remove();
    for (const p of this.particles) p.g.remove();
    for (const f of this.fx) f.g.remove();
    this.people = [];
    this.vehicles = [];
    this.particles = [];
    this.fx = [];
    this.intro = null;
  }
}
