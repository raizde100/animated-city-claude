import { SIM_CONFIG, DEFAULT_POLICY, type Policy } from '../sim/config';
import { Economy } from '../sim/engine';
import { BUSINESS_CATALOG, INDUSTRIES } from '../sim/industries';
import { districtBounds } from '../sim/map';
import type { Business, Metrics, SimEvent, TechShockInfo } from '../sim/types';
import { AgentSystem, type FlywheelSignal } from './agents';
import { isoBounds } from './iso';

export type Selection = { kind: 'business'; id: string } | { kind: 'civic'; id: string } | { kind: 'person'; id: number } | null;

export type StoryItem =
  | { id: number; kind: 'milestone'; title: string; subtitle: string; year: number }
  | { id: number; kind: 'shock'; info: TechShockInfo; year: number }
  | { id: number; kind: 'conversion'; capacityHours: number; business: Business; newIndustry: boolean; first: boolean; year: number };

export interface Toast {
  id: number;
  tone: 'gov' | 'hours' | 'market' | 'info';
  title: string;
  detail: string;
}

export interface UiState {
  tick: number;
  worldVersion: number;
  metrics: Metrics;
  prev: Metrics;
  start: Metrics;
  yearFloat: number;
  progress: number;
  playing: boolean;
  started: boolean;
  speed: 1 | 2 | 5;
  finished: boolean;
  policy: Policy;
  businesses: Business[];
  levels: Economy['gov']['levels'];
  gov: Economy['gov'];
  unlocked: string[];
  houses: string[];
  stage: number;
  idleWorkers: number;
  nextBusiness: { name: string; industry: string; employees: number; locked: boolean } | null;
  story: StoryItem[];
  toasts: Toast[];
  caption: string | null;
  flywheel: boolean;
  selection: Selection;
  milestoneLog: { year: number; title: string; month: number }[];
  lastYear: { year: number; hoursReleased: number; newBusinesses: number; newJobs: number; newMarkets: number } | null;
  /** Business ids founded within the last few seconds (for highlight). */
  fresh: string[];
  /** Increments when the world is rebuilt from scratch (restart / seek). */
  epoch: number;
  /** Quarterly samples for sparklines. */
  series: { gdp: number[]; hours: number[]; productivity: number[] };
}

type Listener = () => void;

const STAGE_NAMES = ['', 'Basic production', 'Services', 'Knowledge economy', 'Innovation economy'];
export { STAGE_NAMES };

export class SimulationController {
  econ: Economy;
  agents: AgentSystem | null = null;
  private listeners = new Set<Listener>();
  private state: UiState;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private lastPublish = 0;
  private storyId = 1;
  private svg: SVGSVGElement | null = null;
  private cam = { x: 0, y: 420, w: 1400, h: 800 };
  private camTarget = { x: 0, y: 420, w: 1400, h: 800 };
  private flywheelTimer = 0;
  private flywheelShown = false;
  private signalListeners = new Set<(s: FlywheelSignal) => void>();
  private treasuryPulse = 0;

  constructor() {
    this.econ = new Economy(DEFAULT_POLICY);
    this.state = this.buildState({
      playing: false,
      started: false,
      speed: 1,
      story: [],
      toasts: [],
      caption: null,
      flywheel: false,
      selection: null,
      milestoneLog: [],
      lastYear: null,
      worldVersion: 0,
      fresh: [],
      epoch: 0,
    });
    this.consume(this.econ.drainEvents(), true);
  }

  // ───────────────────────────────────────────────────────────── store

  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  getState = () => this.state;

  onSignal(fn: (s: FlywheelSignal) => void) {
    this.signalListeners.add(fn);
    return () => this.signalListeners.delete(fn);
  }

  get treasuryPulseKey() {
    return this.treasuryPulse;
  }

  private buildState(partial: Partial<UiState>): UiState {
    const e = this.econ;
    const prevState = this.state as UiState | undefined;
    const next = BUSINESS_CATALOG[e.catalogIndex];
    return {
      ...(prevState ?? ({} as UiState)),
      ...partial,
      tick: (prevState?.tick ?? 0) + 1,
      metrics: e.metrics,
      prev: e.metricsAgo(12),
      start: e.history[0],
      yearFloat: Math.min(SIM_CONFIG.totalYears + 1, 1 + (e.month + this.acc) / 12),
      progress: Math.min(1, (e.month + this.acc) / (SIM_CONFIG.totalYears * 12)),
      finished: e.finished,
      policy: { ...e.policy },
      businesses: e.businesses.map((b) => ({ ...b })),
      levels: { ...e.gov.levels },
      gov: { ...e.gov, levels: { ...e.gov.levels }, projects: e.gov.projects.map((p) => ({ ...p })) },
      unlocked: [...e.unlocked],
      houses: [...e.houses],
      stage: e.stage,
      idleWorkers: e.idleWorkers(),
      series: {
        gdp: e.history.filter((_, k) => k % 3 === 0).map((m) => m.gdp),
        hours: e.history.filter((_, k) => k % 3 === 0).map((m) => m.hoursFreedRate),
        productivity: e.history.filter((_, k) => k % 3 === 0).map((m) => m.avgProductivity),
      },
      nextBusiness: next ? { name: next.name, industry: INDUSTRIES[next.industry].name, employees: next.employees, locked: INDUSTRIES[next.industry].stage > e.stage } : null,
    } as UiState;
  }

  private publish(partial: Partial<UiState> = {}) {
    this.state = this.buildState(partial);
    this.lastPublish = performance.now();
    for (const l of this.listeners) l();
  }

  // ───────────────────────────────────────────────────────────── wiring

  attach(svg: SVGSVGElement, peopleLayer: SVGGElement, fxLayer: SVGGElement) {
    this.svg = svg;
    this.agents?.dispose();
    this.agents = new AgentSystem(() => this.econ, peopleLayer, fxLayer, {
      onPersonClick: (p) => this.select({ kind: 'person', id: p.id }),
      onSignal: (s) => {
        if (s === 'tax') this.treasuryPulse++;
        for (const fn of this.signalListeners) fn(s);
      },
      onCaption: (text) => this.publish({ caption: text }),
    });
    this.updateCameraTarget();
    this.cam = { ...this.camTarget };
    this.applyCamera();
    cancelAnimationFrame(this.raf);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  detach() {
    cancelAnimationFrame(this.raf);
    this.agents?.dispose();
    this.agents = null;
    this.svg = null;
  }

  // ───────────────────────────────────────────────────────────── controls

  play() {
    if (this.econ.finished) return;
    const first = !this.state.started;
    const story = first ? [...this.state.story, this.startStory()] : this.state.story;
    this.publish({ playing: true, started: true, story });
    if (first) this.agents?.startIntro();
  }

  private startStory(): StoryItem {
    return { id: this.storyId++, kind: 'milestone', title: 'A basic local economy', subtitle: 'Farmers work by hand, shops keep paper ledgers and almost every payment is cash.', year: 1 };
  }

  pause() {
    this.publish({ playing: false });
  }

  toggle() {
    if (this.state.playing) this.pause();
    else this.play();
  }

  setSpeed(speed: 1 | 2 | 5) {
    this.publish({ speed });
  }

  setPolicy(p: Partial<Policy>) {
    this.econ.setPolicy(p);
    this.publish();
  }

  restart() {
    this.seek(1, true);
  }

  /** Jump to the start of a year by re-running the (deterministic) model silently. */
  seek(year: number, autoplay = this.state.playing) {
    const policy = { ...this.econ.policy };
    this.econ.reset(policy);
    this.acc = 0;
    const log: UiState['milestoneLog'] = [];
    const collect = (evs: SimEvent[]) => {
      for (const ev of evs) if (ev.type === 'milestone') log.push({ year: ev.year, title: ev.title, month: this.econ.month });
    };
    collect(this.econ.drainEvents());
    const target = Math.max(0, Math.min(SIM_CONFIG.totalYears * 12, Math.round((year - 1) * 12)));
    while (this.econ.month < target) {
      this.econ.step();
      collect(this.econ.drainEvents());
    }
    this.flywheelShown = year > 11;
    this.flywheelTimer = 0;
    this.agents?.reset();
    this.publish({
      worldVersion: this.state.worldVersion + 1,
      milestoneLog: log,
      story: target === 0 ? [this.startStory()] : [],
      toasts: [],
      caption: null,
      selection: null,
      flywheel: false,
      playing: autoplay && !this.econ.finished,
      started: true,
      lastYear: null,
      fresh: [],
      epoch: this.state.epoch + 1,
    });
    if (target === 0 && autoplay) this.agents?.startIntro();
    this.updateCameraTarget();
  }

  select(sel: Selection) {
    this.agents?.setSelected(sel?.kind === 'person' ? sel.id : null);
    this.publish({ selection: sel });
  }

  dismissStory(id: number) {
    this.publish({ story: this.state.story.filter((s) => s.id !== id) });
  }

  dismissToast(id: number) {
    this.publish({ toasts: this.state.toasts.filter((s) => s.id !== id) });
  }

  setFlywheel(on: boolean) {
    this.flywheelTimer = on ? 14 : 0;
    this.publish({ flywheel: on });
    this.updateCameraTarget();
  }

  // ───────────────────────────────────────────────────────────── events → UI

  private consume(events: SimEvent[], silent = false) {
    if (!events.length) return;
    let story = [...(this.state?.story ?? [])];
    let toasts = [...(this.state?.toasts ?? [])];
    const log = [...(this.state?.milestoneLog ?? [])];
    let worldChanged = false;
    let lastYear = this.state?.lastYear ?? null;
    const fresh = [...(this.state?.fresh ?? [])];
    const year = Math.floor(1 + this.econ.year);
    const toast = (t: Omit<Toast, 'id'>) => {
      toasts.push({ ...t, id: this.storyId++ });
    };
    for (const ev of events) {
      if (!silent) this.agents?.handle(ev);
      switch (ev.type) {
        case 'milestone':
          log.push({ year: ev.year, title: ev.title, month: this.econ.month });
          if (ev.id !== 'start' || !silent) story.push({ id: this.storyId++, kind: 'milestone', title: ev.title, subtitle: ev.subtitle, year: ev.year });
          break;
        case 'techShock':
          worldChanged = true;
          if (ev.info.featured) story.push({ id: this.storyId++, kind: 'shock', info: ev.info, year });
          break;
        case 'businessFounded': {
          worldChanged = true;
          fresh.push(ev.business.id);
          const first = ev.index === 1;
          if (first || ev.newIndustry) story.push({ id: this.storyId++, kind: 'conversion', capacityHours: ev.capacityHours, business: ev.business, newIndustry: ev.newIndustry, first, year });
          else toast({ tone: 'hours', title: `New business · ${ev.business.name}`, detail: `${ev.business.employees} freed workers · ${INDUSTRIES[ev.business.industry].name}` });
          break;
        }
        case 'projectStarted':
          worldChanged = true;
          toast({ tone: 'gov', title: `Investing in ${ev.project.name}`, detail: `$${Math.round(ev.project.cost / 1000)}k from the treasury` });
          break;
        case 'projectCompleted':
          worldChanged = true;
          toast({ tone: 'gov', title: `${ev.project.name} complete`, detail: ev.project.after });
          break;
        case 'stageUnlocked':
          toast({ tone: 'market', title: `Stage ${ev.stage} · ${STAGE_NAMES[ev.stage]}`, detail: 'New kinds of businesses become possible' });
          break;
        case 'houseBuilt':
        case 'districtUnlocked':
        case 'workersHired':
        case 'workersReleased':
          worldChanged = worldChanged || ev.type === 'houseBuilt' || ev.type === 'districtUnlocked';
          break;
        case 'yearEnd':
          lastYear = ev.summary;
          break;
      }
    }
    // Keep the story readable at high speed.
    if (story.length > 3) story = story.slice(-3);
    if (toasts.length > 4) toasts = toasts.slice(-4);
    this.publish({
      story,
      toasts,
      milestoneLog: log,
      lastYear,
      fresh: fresh.slice(-6),
      worldVersion: (this.state?.worldVersion ?? 0) + (worldChanged ? 1 : 0),
    });
    if (worldChanged) this.updateCameraTarget();
  }

  // ───────────────────────────────────────────────────────────── camera

  private updateCameraTarget() {
    const e = this.econ;
    let i0 = 99;
    let j0 = 99;
    let i1 = 0;
    let j1 = 0;
    for (const d of e.unlocked) {
      if (d === 'rural') continue;
      const b = districtBounds(d);
      i0 = Math.min(i0, b.i0);
      j0 = Math.min(j0, b.j0);
      i1 = Math.max(i1, b.i1);
      j1 = Math.max(j1, b.j1);
    }
    // Leave room for the farms (east) and the power station (south) around the town.
    i0 -= 1.5;
    j0 -= 1.5;
    i1 = Math.max(i1 + 2, 26);
    j1 = Math.max(j1 + 2, 24.5);
    const full = this.state?.flywheel || e.finished;
    if (full) {
      i0 = -1;
      j0 = -1;
      i1 = 29;
      j1 = 29;
    }
    const bb = isoBounds(i0, j0, i1, j1, 90, 40);
    const pad = full ? 1.1 : 0.94;
    this.camTarget = { x: (bb.minX + bb.maxX) / 2, y: (bb.minY + bb.maxY) / 2 + (full ? 30 : 0), w: (bb.maxX - bb.minX) * pad, h: (bb.maxY - bb.minY) * pad };
  }

  private applyCamera() {
    if (!this.svg) return;
    const rect = this.svg.getBoundingClientRect();
    const aspect = rect.width > 0 ? rect.height / rect.width : 0.6;
    // Fit both the width and the height of the framed region.
    const w = Math.max(this.cam.w, this.cam.h / aspect);
    const h = w * aspect;
    this.svg.setAttribute('viewBox', `${(this.cam.x - w / 2).toFixed(1)} ${(this.cam.y - h / 2).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`);
  }

  // ───────────────────────────────────────────────────────────── loop

  private frame = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const s = this.state;
    if (s.playing && !this.econ.finished) {
      this.acc += (dt * s.speed * 12) / SIM_CONFIG.secondsPerYear;
      const evs: SimEvent[] = [];
      while (this.acc >= 1 && !this.econ.finished) {
        this.acc -= 1;
        this.econ.step();
        evs.push(...this.econ.drainEvents());
      }
      if (evs.length) this.consume(evs);
      if (this.econ.finished) {
        this.acc = 0;
        // The final scene takes over from story cards and toasts.
        this.publish({ playing: false, flywheel: false, story: [], toasts: [] });
        this.updateCameraTarget();
      }
      // The flywheel appears once, around Year 11.
      if (!this.flywheelShown && this.econ.year >= 10.4) {
        this.flywheelShown = true;
        this.setFlywheel(true);
      }
    }
    if (this.flywheelTimer > 0) {
      this.flywheelTimer -= dt;
      if (this.flywheelTimer <= 0) this.setFlywheel(false);
    }
    this.agents?.update(dt, s.playing && !this.econ.finished, s.speed);

    // Ease the camera.
    const k = 1 - Math.exp(-dt * 1.6);
    const t = this.camTarget;
    this.cam.x += (t.x - this.cam.x) * k;
    this.cam.y += (t.y - this.cam.y) * k;
    this.cam.w += (t.w - this.cam.w) * k;
    this.cam.h += (t.h - this.cam.h) * k;
    this.applyCamera();

    if (now - this.lastPublish > 140) this.publish();
    this.raf = requestAnimationFrame(this.frame);
  };
}
