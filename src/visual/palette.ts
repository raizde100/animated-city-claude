/** The visual identity: warm paper, sage land, terracotta and slate, one signature amber for human time. */
export const PALETTE = {
  paper: '#F3EEE6',
  grass: '#BFCB9F',
  grassDark: '#AEBB8D',
  grassLight: '#CBD5AD',
  soilTop: '#9C8466',
  soilMid: '#7F6A52',
  soilDeep: '#6A5845',
  pavement: '#E4DCCB',
  pavementEdge: '#D2C8B4',
  water: '#8FB4BF',
  waterLight: '#B7D2D8',
  dirtRoad: '#CDB892',
  asphalt: '#8F8C88',
  asphaltDark: '#6E6C6A',
  lane: '#F4EFE4',
  wall: '#EFE7DA',
  wallWarm: '#E9DCC8',
  roofTerracotta: '#C4705A',
  roofSlate: '#6E7F8E',
  roofSage: '#7E9474',
  ink: '#2B2A28',
  inkSoft: '#5C5850',
  tree: '#7E9A6A',
  treeDark: '#5F7D52',
  trunk: '#7A5E45',
} as const;

/** Money-flow categories — distinguishable but restrained. */
export const FLOW = {
  consumer: { color: '#D9A23C', label: 'Consumer payments', desc: 'Households → businesses' },
  supplier: { color: '#3E9C95', label: 'Supplier payments', desc: 'Business → business' },
  salary: { color: '#6E9E5A', label: 'Salaries', desc: 'Businesses → workers' },
  tax: { color: '#6E62B6', label: 'Taxes', desc: 'Activity → Town Hall' },
  gov: { color: '#3D7BC0', label: 'Public investment', desc: 'Town Hall → infrastructure' },
  hours: { color: '#EE7A3A', label: 'Freed human hours', desc: 'Old tasks → new markets' },
} as const;

export type FlowKind = keyof typeof FLOW;

export const HOURS_COLOR = FLOW.hours.color;
