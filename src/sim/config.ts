/**
 * Every tunable number of the economic model lives here.
 * The model is intentionally simple: it favours intuitive relationships
 * (productivity frees hours, freed hours start businesses, activity is taxed,
 * taxes fund infrastructure, infrastructure raises productivity) over realism.
 */
export const SIM_CONFIG = {
  seed: 7,
  totalYears: 20,
  /** Real seconds per simulated year at 1× speed. */
  secondsPerYear: 8,

  // ── Population & labour ────────────────────────────────────────────
  initialWorkers: 50,
  /** Workers ÷ population. */
  participationRate: 0.44,
  /** Annual growth of the labour force (births + people moving in). */
  workforceGrowth: 0.017,
  /** Extra workforce growth per new business founded (towns with jobs attract people). */
  migrationPerBusiness: 0.0025,
  hoursPerWorkerMonth: 160,
  peoplePerHouse: 4.6,

  // ── Production ─────────────────────────────────────────────────────
  /** $ of output per labour-hour at productivity index 100. */
  baseValuePerHour: 10.4,
  /** Annual demand growth of mature businesses (they keep output growing slowly). */
  matureDemandGrowth: 0.016,
  /** Years a newly founded business keeps its headcount and simply grows output with productivity. */
  growthPhaseYears: 4,
  /** Share of output paid out as wages. */
  laborShare: 0.6,
  /** Average transaction size in cash era ($); shrinks with digital payments. */
  avgTicket: 26,

  // ── Productivity drivers (multipliers per infrastructure level, 0..3) ──
  roadEffect: 0.065,
  digitalEffect: 0.075,
  energyEffect: 0.065,
  /** Productivity gain per unit of accumulated skills. */
  skillEffect: 0.09,
  /** Skill accumulation per year: base + per education level + per education slider. */
  skillBase: 0.03,
  skillPerEduLevel: 0.05,
  skillPerEduSlider: 0.06,

  // ── Technology adoption (private investment) ───────────────────────
  /** Upgrade probability per business per year = (base + slider × perSlider) × private-capital factor. */
  techBase: 0.07,
  techPerSlider: 0.22,
  techMultStep: 1.15,
  techMaxLevel: 4,

  // ── Government ─────────────────────────────────────────────────────
  defaultTaxRate: 0.2,
  /** Running costs per resident per year (teachers, clinic, administration). */
  opsPerResident: 480,
  /** Share of the fiscal surplus put into investment funds (rest stays as reserves). */
  investShareBase: 0.55,
  investSharePerSlider: 0.4,
  /** Months between financing a project and it opening. */
  buildMonths: 5,
  /** Minimum months between the starts of two projects in the same track (planning capacity). */
  projectSpacingMonths: 9,

  // ── Business creation ──────────────────────────────────────────────
  /** Minimum months between two new businesses (keeps the story readable). */
  foundingCooldownMonths: 2,
  /** Stage gates: average productivity needed. */
  stage2Productivity: 112,
  stage4Productivity: 205,
} as const;

export interface Policy {
  /** 0 – 0.4 */
  taxRate: number;
  /** 0 (low) – 1 (high) */
  techAdoption: number;
  infrastructure: number;
  education: number;
}

export const DEFAULT_POLICY: Policy = {
  taxRate: SIM_CONFIG.defaultTaxRate,
  techAdoption: 0.5,
  infrastructure: 0.5,
  education: 0.5,
};
