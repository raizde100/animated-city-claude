import type { BuildingStyle, IndustryId } from './industries';
import type { ProjectDef } from './projects';

export interface Business {
  id: string;
  name: string;
  industry: IndustryId;
  style: BuildingStyle;
  lotId: string;
  /** Simulation time (years since start) the business opened. */
  founded: number;
  legacy: boolean;
  startup: boolean;
  techLevel: number;
  techMult: number;
  employees: number;
  /** Labour hours per month the business currently uses. */
  hours: number;
  /** Output (= revenue / value added) per year, $. */
  output: number;
  /** Demand the business serves once mature, $/yr. */
  demand: number;
  mature: boolean;
  /** Productivity index (100 = Year 1 baseline). */
  productivity: number;
  /** Hours/month this business needed when it opened, and its productivity then. */
  baseHours: number;
  baseProductivity: number;
  taxesPaid: number;
  wagesPaid: number;
  unit: string;
  unitsPerDay: number;
}

export interface Project extends ProjectDef {
  startedAt: number;
  completesAt: number;
  done: boolean;
}

export interface GovernmentState {
  reserves: number;
  infraFund: number;
  eduFund: number;
  treasury: number;
  /** Annual run-rates. */
  taxRevenue: number;
  operations: number;
  taxRevenueTotal: number;
  investedTotal: number;
  investedThisYear: number;
  levels: { roads: number; digital: number; energy: number; education: number };
  projects: Project[];
}

export interface Metrics {
  /** 1-based calendar year (1.0 → 21.0). */
  year: number;
  month: number;
  population: number;
  workers: number;
  employed: number;
  idleWorkers: number;
  businesses: number;
  industries: number;
  gdp: number;
  gdpPerWorker: number;
  transactionsPerDay: number;
  transactionsTotal: number;
  taxRevenue: number;
  taxRevenueTotal: number;
  govInvestmentTotal: number;
  treasury: number;
  avgProductivity: number;
  laborHours: number;
  /** Hours/month the original output of every business no longer needs. */
  hoursFreedRate: number;
  hoursFreedTotal: number;
  servicesShare: number;
  stage: number;
  houses: number;
}

export interface TechShockInfo {
  businessId: string;
  businessName: string;
  upgrade: string;
  unit: string;
  unitsPerDay: number;
  workersBefore: number;
  workersAfter: number;
  hoursBefore: number;
  hoursAfter: number;
  featured: boolean;
}

export interface YearSummary {
  year: number;
  hoursReleased: number;
  newBusinesses: number;
  newJobs: number;
  newMarkets: number;
}

export type SimEvent =
  | { type: 'businessFounded'; business: Business; sources: string[]; newIndustry: boolean; capacityHours: number; index: number }
  | { type: 'workersReleased'; businessId: string; count: number }
  | { type: 'workersHired'; businessId: string; count: number; sources: string[] }
  | { type: 'techShock'; info: TechShockInfo }
  | { type: 'projectStarted'; project: Project }
  | { type: 'projectCompleted'; project: Project }
  | { type: 'districtUnlocked'; district: string }
  | { type: 'houseBuilt'; lotId: string }
  | { type: 'stageUnlocked'; stage: number }
  | { type: 'milestone'; id: string; title: string; subtitle: string; year: number }
  | { type: 'yearEnd'; summary: YearSummary };
