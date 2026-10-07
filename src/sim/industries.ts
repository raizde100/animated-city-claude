export type IndustryId =
  | 'agriculture'
  | 'retail'
  | 'construction'
  | 'food'
  | 'hospitality'
  | 'logistics'
  | 'professional'
  | 'healthcare'
  | 'software'
  | 'finance'
  | 'education'
  | 'media'
  | 'research'
  | 'advmfg';

/** Visual archetype used by the renderer. */
export type BuildingStyle =
  | 'farm'
  | 'depot'
  | 'shop'
  | 'bakery'
  | 'yard'
  | 'restaurant'
  | 'warehouse'
  | 'office'
  | 'clinicSmall'
  | 'tower'
  | 'bank'
  | 'academy'
  | 'hall'
  | 'studio'
  | 'lab'
  | 'factory';

export interface Industry {
  id: IndustryId;
  name: string;
  stage: 1 | 2 | 3 | 4;
  color: string;
  /** Value of an hour of work relative to the base economy. */
  valueMult: number;
  /** Is it a "service" (vs goods) sector — used for the services-vs-agriculture milestone. */
  services: boolean;
  /** How strongly each infrastructure type lifts this industry (0..1.5). */
  sensitivity: { roads: number; digital: number; energy: number };
}

export const INDUSTRIES: Record<IndustryId, Industry> = {
  agriculture: { id: 'agriculture', name: 'Agriculture', stage: 1, color: '#8FA35F', valueMult: 0.95, services: false, sensitivity: { roads: 1.3, digital: 0.4, energy: 1.2 } },
  retail: { id: 'retail', name: 'Retail', stage: 1, color: '#D4875A', valueMult: 0.95, services: true, sensitivity: { roads: 1.1, digital: 1.3, energy: 0.6 } },
  construction: { id: 'construction', name: 'Construction', stage: 1, color: '#C9A25A', valueMult: 1.05, services: false, sensitivity: { roads: 1.2, digital: 0.5, energy: 1.0 } },
  food: { id: 'food', name: 'Food Production', stage: 1, color: '#C7745B', valueMult: 1.0, services: false, sensitivity: { roads: 1.0, digital: 0.6, energy: 1.4 } },
  hospitality: { id: 'hospitality', name: 'Restaurants', stage: 2, color: '#BF5F55', valueMult: 0.95, services: true, sensitivity: { roads: 0.8, digital: 1.1, energy: 0.8 } },
  logistics: { id: 'logistics', name: 'Transportation', stage: 2, color: '#7B8898', valueMult: 1.1, services: true, sensitivity: { roads: 1.5, digital: 1.0, energy: 0.8 } },
  professional: { id: 'professional', name: 'Accounting & Law', stage: 2, color: '#6A7EA6', valueMult: 1.25, services: true, sensitivity: { roads: 0.4, digital: 1.4, energy: 0.4 } },
  healthcare: { id: 'healthcare', name: 'Healthcare', stage: 2, color: '#5B9F97', valueMult: 1.2, services: true, sensitivity: { roads: 0.6, digital: 1.0, energy: 0.8 } },
  software: { id: 'software', name: 'Software', stage: 3, color: '#4A8DB7', valueMult: 1.45, services: true, sensitivity: { roads: 0.2, digital: 1.5, energy: 0.6 } },
  finance: { id: 'finance', name: 'Financial Services', stage: 3, color: '#3E5D8B', valueMult: 1.4, services: true, sensitivity: { roads: 0.2, digital: 1.5, energy: 0.4 } },
  education: { id: 'education', name: 'Education & Training', stage: 3, color: '#8A6FB0', valueMult: 1.2, services: true, sensitivity: { roads: 0.4, digital: 1.2, energy: 0.4 } },
  media: { id: 'media', name: 'Design & Entertainment', stage: 3, color: '#B0688F', valueMult: 1.25, services: true, sensitivity: { roads: 0.4, digital: 1.3, energy: 0.6 } },
  research: { id: 'research', name: 'Research', stage: 4, color: '#3F9C99', valueMult: 1.6, services: true, sensitivity: { roads: 0.3, digital: 1.3, energy: 1.0 } },
  advmfg: { id: 'advmfg', name: 'Advanced Manufacturing', stage: 4, color: '#5C7B6C', valueMult: 1.5, services: false, sensitivity: { roads: 1.2, digital: 1.0, energy: 1.5 } },
};

export interface BusinessTemplate {
  name: string;
  industry: IndustryId;
  style: BuildingStyle;
  size: 1 | 2;
  employees: number;
  /** What the business makes, used in technology shock cards. */
  unit: string;
  unitsPerDay: number;
  /** Specific lot id (for farms and the depot), otherwise any free lot of `size`. */
  lot?: string;
  startup?: boolean;
}

/** The ten businesses of Year 1. Employees sum to the initial workforce. */
export const INITIAL_BUSINESSES: BusinessTemplate[] = [
  { name: 'Hillside Farm', industry: 'agriculture', style: 'farm', size: 2, employees: 7, unit: 'kg of grain', unitsPerDay: 900, lot: 'farm-1' },
  { name: 'Valley Farm', industry: 'agriculture', style: 'farm', size: 2, employees: 6, unit: 'kg of vegetables', unitsPerDay: 700, lot: 'farm-2' },
  { name: 'Old Mill Orchard', industry: 'agriculture', style: 'farm', size: 2, employees: 5, unit: 'crates of fruit', unitsPerDay: 120, lot: 'farm-3' },
  { name: 'Grain Co-op Depot', industry: 'agriculture', style: 'depot', size: 2, employees: 4, unit: 'sacks handled', unitsPerDay: 400, lot: 'depot' },
  { name: 'Main Street Grocery', industry: 'retail', style: 'shop', size: 1, employees: 5, unit: 'baskets sold', unitsPerDay: 260 },
  { name: 'Corner General Store', industry: 'retail', style: 'shop', size: 1, employees: 4, unit: 'sales', unitsPerDay: 140 },
  { name: 'Hartwell Hardware', industry: 'retail', style: 'shop', size: 1, employees: 3, unit: 'orders', unitsPerDay: 60 },
  { name: 'Rosemary Bakery', industry: 'food', style: 'bakery', size: 1, employees: 5, unit: 'loaves', unitsPerDay: 1000 },
  { name: 'Stonebridge Builders', industry: 'construction', style: 'yard', size: 1, employees: 6, unit: 'm² built', unitsPerDay: 18 },
  { name: 'Riverside Sawmill', industry: 'construction', style: 'yard', size: 1, employees: 5, unit: 'planks cut', unitsPerDay: 300, lot: 'com-21-14' },
];

/** Technology upgrades by industry, in adoption order. */
export const TECH_UPGRADES: Record<IndustryId, string[]> = {
  agriculture: ['Tractor & seed drill', 'Irrigation pumps', 'GPS-guided harvesters', 'Sensor-driven precision farming'],
  retail: ['Electronic registers', 'Barcode stock system', 'Online ordering', 'Automated stock picking'],
  construction: ['Power tools', 'Prefabricated parts', 'Digital site planning', 'Robotic assembly'],
  food: ['Electric ovens', 'Automated dough mixers', 'Conveyor packaging', 'Smart production line'],
  hospitality: ['Commercial kitchen', 'Digital ordering', 'Kitchen automation', 'Smart inventory'],
  logistics: ['Larger trucks', 'Route-planning software', 'Automated sorting', 'Autonomous vans'],
  professional: ['Spreadsheets', 'Accounting software', 'Cloud practice tools', 'AI document review'],
  healthcare: ['Digital records', 'Modern diagnostics', 'Telemedicine', 'AI-assisted triage'],
  software: ['Cloud tooling', 'Build automation', 'AI pair-programming', 'Autonomous testing'],
  finance: ['Core banking system', 'Online banking', 'Automated underwriting', 'Real-time settlement'],
  education: ['Computer labs', 'Online courses', 'Adaptive learning', 'AI tutors'],
  media: ['Digital cameras', 'Editing suites', 'Cloud rendering', 'Generative tools'],
  research: ['Lab automation', 'High-throughput screening', 'Simulation clusters', 'AI-driven discovery'],
  advmfg: ['CNC machining', 'Industrial robots', '3D printing lines', 'Lights-out factory'],
};

/** New businesses, in the order freed human hours turn into them. */
export const BUSINESS_CATALOG: BusinessTemplate[] = [
  // Stage 2 — services appear once basic production is more efficient
  { name: 'Corner Café', industry: 'hospitality', style: 'restaurant', size: 1, employees: 3, unit: 'meals', unitsPerDay: 150 },
  { name: 'Haulage & Freight', industry: 'logistics', style: 'warehouse', size: 2, employees: 4, unit: 'deliveries', unitsPerDay: 40 },
  { name: 'Ledger & Co. Accounting', industry: 'professional', style: 'office', size: 1, employees: 2, unit: 'accounts kept', unitsPerDay: 30 },
  { name: 'Riverside Dental', industry: 'healthcare', style: 'clinicSmall', size: 1, employees: 2, unit: 'patients', unitsPerDay: 16 },
  { name: 'Market Street Bistro', industry: 'hospitality', style: 'restaurant', size: 1, employees: 3, unit: 'meals', unitsPerDay: 180 },
  { name: 'Town Pharmacy', industry: 'healthcare', style: 'clinicSmall', size: 1, employees: 2, unit: 'prescriptions', unitsPerDay: 60 },
  { name: 'Courier Express', industry: 'logistics', style: 'warehouse', size: 1, employees: 2, unit: 'parcels', unitsPerDay: 120 },
  { name: 'Hartley Law Office', industry: 'professional', style: 'office', size: 1, employees: 2, unit: 'contracts', unitsPerDay: 6 },
  { name: 'Noodle House', industry: 'hospitality', style: 'restaurant', size: 1, employees: 2, unit: 'meals', unitsPerDay: 140 },
  { name: 'Family Health Practice', industry: 'healthcare', style: 'clinicSmall', size: 2, employees: 4, unit: 'patients', unitsPerDay: 40 },
  // Stage 3 — digital infrastructure + skills unlock knowledge work
  { name: 'Brightline Software', industry: 'software', style: 'tower', size: 2, employees: 3, unit: 'features shipped', unitsPerDay: 4 },
  { name: 'Community Credit Union', industry: 'finance', style: 'bank', size: 1, employees: 2, unit: 'loans serviced', unitsPerDay: 25 },
  { name: 'Studio Nine Design', industry: 'media', style: 'studio', size: 1, employees: 2, unit: 'designs', unitsPerDay: 8 },
  { name: 'Code & Skills Academy', industry: 'education', style: 'academy', size: 1, employees: 2, unit: 'students taught', unitsPerDay: 60 },
  { name: 'Northwind Payments', industry: 'finance', style: 'bank', size: 2, employees: 3, unit: 'payments routed', unitsPerDay: 5000 },
  { name: 'Lantern Cinema & Arts', industry: 'media', style: 'hall', size: 2, employees: 3, unit: 'tickets', unitsPerDay: 300 },
  { name: 'Cloudworks', industry: 'software', style: 'tower', size: 2, employees: 3, unit: 'deployments', unitsPerDay: 20 },
  { name: 'Languages Institute', industry: 'education', style: 'academy', size: 1, employees: 2, unit: 'lessons', unitsPerDay: 40 },
  { name: 'Podcast & Video Lab', industry: 'media', style: 'studio', size: 1, employees: 2, unit: 'episodes', unitsPerDay: 3 },
  { name: 'Harbor Insurance', industry: 'finance', style: 'bank', size: 1, employees: 2, unit: 'policies', unitsPerDay: 30 },
  // Stage 4 — research and advanced industry
  { name: 'Precision Robotics', industry: 'advmfg', style: 'factory', size: 2, employees: 3, unit: 'robot arms', unitsPerDay: 2 },
  { name: 'Meridian BioLab', industry: 'research', style: 'lab', size: 2, employees: 3, unit: 'experiments', unitsPerDay: 12 },
  { name: 'Startup Foundry', industry: 'software', style: 'tower', size: 2, employees: 3, unit: 'products', unitsPerDay: 1, startup: true },
  { name: 'Quantum Materials Lab', industry: 'research', style: 'lab', size: 2, employees: 3, unit: 'samples', unitsPerDay: 30 },
  { name: 'Aerial Drone Works', industry: 'advmfg', style: 'factory', size: 2, employees: 3, unit: 'drones', unitsPerDay: 6 },
  { name: 'Pixel Forge Games', industry: 'media', style: 'studio', size: 1, employees: 2, unit: 'builds', unitsPerDay: 2, startup: true },
  { name: 'Greenline Energy Systems', industry: 'advmfg', style: 'factory', size: 2, employees: 3, unit: 'battery packs', unitsPerDay: 40 },
  { name: 'Helix Genomics', industry: 'research', style: 'lab', size: 1, employees: 2, unit: 'sequences', unitsPerDay: 50, startup: true },
  { name: 'Ledgerless Fintech', industry: 'finance', style: 'bank', size: 1, employees: 2, unit: 'accounts', unitsPerDay: 200, startup: true },
  { name: 'Atlas AI', industry: 'software', style: 'tower', size: 1, employees: 2, unit: 'models trained', unitsPerDay: 1, startup: true },
  { name: 'Vertical Greenhouse', industry: 'agriculture', style: 'farm', size: 2, employees: 3, unit: 'kg of greens', unitsPerDay: 800, lot: 'farm-4' },
  { name: 'Riverbend Animation', industry: 'media', style: 'studio', size: 1, employees: 2, unit: 'frames', unitsPerDay: 400, startup: true },
];
