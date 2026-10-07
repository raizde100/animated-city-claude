export type ProjectCategory = 'roads' | 'digital' | 'energy' | 'education';

export interface ProjectDef {
  id: string;
  category: ProjectCategory;
  level: number;
  name: string;
  /** Short before → after description used in overlays and the Town Hall panel. */
  before: string;
  after: string;
  cost: number;
  /** Lot where construction happens (for the spending flow and the visual change). */
  site: string;
  /** District that must open for this project. */
  unlocks?: string;
}

/** Infrastructure track (roads, digital, energy) is funded from one budget, education from another. */
export const INFRA_PROJECTS: ProjectDef[] = [
  { id: 'digital-1', category: 'digital', level: 1, name: 'Digital Payments Network', before: 'Cash and paper ledgers', after: 'Card terminals in every shop, instant payments', cost: 200_000, site: 'townhall' },
  { id: 'roads-1', category: 'roads', level: 1, name: 'Paved Roads', before: 'Dirt roads, slow trucks', after: 'Asphalt roads, faster deliveries', cost: 260_000, site: 'townhall' },
  { id: 'energy-1', category: 'energy', level: 1, name: 'Power Grid Upgrade', before: 'Unreliable small generator', after: 'Modern plant and grid lines', cost: 300_000, site: 'power' },
  { id: 'digital-2', category: 'digital', level: 2, name: 'Fibre & Mobile Towers', before: 'Slow dial-up connections', after: 'Town-wide broadband and mobile data', cost: 400_000, site: 'tower-1' },
  { id: 'roads-2', category: 'roads', level: 2, name: 'Logistics Hub & Boulevards', before: 'Congested two-lane streets', after: 'Wide boulevards and a freight hub', cost: 620_000, site: 'logistics' },
  { id: 'energy-2', category: 'energy', level: 2, name: 'Solar Field', before: 'Expensive fuel-based power', after: 'Cheap clean electricity', cost: 680_000, site: 'solar' },
  { id: 'digital-3', category: 'digital', level: 3, name: 'Data Centre & Automation Platform', before: 'Manual back-office work', after: 'Automated business processes', cost: 840_000, site: 'datacenter', unlocks: '3-3' },
  { id: 'roads-3', category: 'roads', level: 3, name: 'Electric Transit Line', before: 'Everyone drives', after: 'Frequent electric buses', cost: 940_000, site: 'townhall' },
  { id: 'energy-3', category: 'energy', level: 3, name: 'Wind Farm', before: 'Capacity limits on industry', after: 'Abundant power for factories', cost: 1040_000, site: 'wind' },
];

export const EDUCATION_PROJECTS: ProjectDef[] = [
  { id: 'education-1', category: 'education', level: 1, name: 'School Expansion', before: 'One crowded classroom', after: 'A larger school with labs', cost: 210_000, site: 'school' },
  { id: 'education-2', category: 'education', level: 2, name: 'Technical College', before: 'Skills learned on the job', after: 'Trained technicians and analysts', cost: 490_000, site: 'college', unlocks: '1-3' },
  { id: 'education-3', category: 'education', level: 3, name: 'Research University', before: 'No local research', after: 'Engineers, scientists and founders', cost: 910_000, site: 'university', unlocks: '2-3' },
];

export const ALL_PROJECTS = [...INFRA_PROJECTS, ...EDUCATION_PROJECTS];
