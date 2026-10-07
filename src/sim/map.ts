/**
 * Static geography of the town: a 28×28 isometric grid with a lattice of roads
 * every 5 tiles. Each 4×4 block between roads is a "district" built from a
 * template. Districts unlock as the town grows.
 */

export const GRID = 28;
/** Road lines (both axes). Road tile index; centre line sits at +0.5. */
export const ROAD_LINES = [3, 8, 13, 18, 23] as const;

export type LotKind =
  | 'house'
  | 'com' // 1×1 commercial plot
  | 'big' // 2×2 commercial plot
  | 'townhall'
  | 'school'
  | 'clinic'
  | 'plaza'
  | 'park'
  | 'logistics'
  | 'college'
  | 'university'
  | 'datacenter'
  | 'depot'
  | 'farm'
  | 'power'
  | 'solar'
  | 'wind'
  | 'tower';

export interface Lot {
  id: string;
  kind: LotKind;
  i: number;
  j: number;
  w: number;
  h: number;
  district: string;
  /** Order in which lots of the same kind are used. Lower = earlier. */
  priority: number;
}

export interface RoadSegment {
  id: string;
  /** 'i' = runs along the i axis (j constant), 'j' = runs along j. */
  axis: 'i' | 'j';
  /** Fixed coordinate (road tile index). */
  fixed: number;
  from: number;
  to: number;
  /** Districts whose unlocking builds this road. Empty = rural, built from start. */
  districts: string[];
  rural: boolean;
}

const T: Record<string, string[]> = {
  // central blocks — the original town
  '1-1': ['hhbb', 'hQQb', 'bQTT', 'bbTT'],
  '2-1': ['hhhh', 'hhbb', 'bbXX', 'hhXX'],
  '1-2': ['SShh', 'SShh', 'Chhb', 'Chbb'],
  '2-2': ['bbhh', 'hhhh', 'hhXX', 'hhXX'],
  '3-2': ['WWbb', 'XXbb', 'XXLL', 'hhLL'],
  // growth districts
  '3-1': ['XXXX', 'XXXX', 'bbhh', 'bbhh'],
  '1-0': ['hhhh', 'hhhh', 'bbbb', 'hhhh'],
  '2-0': ['hhhh', 'hhbb', 'XXbb', 'XXhh'],
  '0-1': ['XXXX', 'XXXX', 'XXbb', 'XXhh'],
  '0-2': ['XXhh', 'XXhh', 'bbbb', 'hhhh'],
  '1-3': ['KKhh', 'KKhh', 'bbhh', 'hhhh'],
  '2-3': ['UUXX', 'UUXX', 'bbhh', 'hhhh'],
  '3-0': ['XXhh', 'XXhh', 'bbXX', 'hhXX'],
  '0-0': ['PPhh', 'PPhh', 'hhhh', 'hhbb'],
  '3-3': ['DDXX', 'DDXX', 'hhhh', 'hhhh'],
  '0-3': ['hhhh', 'hhhh', 'XXbb', 'XXhh'],
};

export const INITIAL_DISTRICTS = ['1-1', '2-1', '1-2', '2-2', '3-2'];
/** Order in which new districts open when the town needs space. */
export const GROWTH_DISTRICTS = ['3-1', '1-0', '2-0', '0-1', '0-2', '1-3', '2-3', '3-0', '0-0', '3-3', '0-3'];

const CHAR_KIND: Record<string, LotKind> = {
  h: 'house',
  b: 'com',
  X: 'big',
  T: 'townhall',
  S: 'school',
  C: 'clinic',
  Q: 'plaza',
  P: 'park',
  L: 'logistics',
  K: 'college',
  U: 'university',
  D: 'datacenter',
  W: 'depot',
};

const CHAR_MAX: Record<string, [number, number]> = {
  X: [2, 2],
  T: [2, 2],
  S: [2, 2],
  C: [1, 2],
  Q: [2, 2],
  P: [2, 2],
  L: [2, 2],
  K: [2, 2],
  U: [2, 2],
  D: [2, 2],
  W: [2, 1],
};

const SPECIAL_IDS: Partial<Record<LotKind, string>> = {
  townhall: 'townhall',
  school: 'school',
  clinic: 'clinic',
  logistics: 'logistics',
  college: 'college',
  university: 'university',
  datacenter: 'datacenter',
  depot: 'depot',
};

function blockOrigin(bi: number, bj: number) {
  return { i0: ROAD_LINES[bi] + 1, j0: ROAD_LINES[bj] + 1 };
}

function buildLots(): Lot[] {
  const lots: Lot[] = [];
  const districtOrder = [...INITIAL_DISTRICTS, ...GROWTH_DISTRICTS];
  for (const [key, rows] of Object.entries(T)) {
    const [bi, bj] = key.split('-').map(Number);
    const { i0, j0 } = blockOrigin(bi, bj);
    const used = rows.map((r) => r.split('').map(() => false));
    const dIndex = districtOrder.indexOf(key);
    for (let dj = 0; dj < 4; dj++) {
      for (let di = 0; di < 4; di++) {
        if (used[dj][di]) continue;
        const c = rows[dj][di];
        const kind = CHAR_KIND[c];
        if (!kind) continue;
        const [maxW, maxH] = CHAR_MAX[c] ?? [1, 1];
        let w = 1;
        while (w < maxW && di + w < 4 && rows[dj][di + w] === c && !used[dj][di + w]) w++;
        let h = 1;
        while (h < maxH && dj + h < 4 && rows[dj + h].slice(di, di + w).split('').every((x, k) => x === c && !used[dj + h][di + k])) h++;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) used[dj + y][di + x] = true;
        const i = i0 + di;
        const j = j0 + dj;
        // Prefer plots close to the town centre (13.5, 13.5) and inside earlier districts.
        const centreDist = Math.abs(i + w / 2 - 13.5) + Math.abs(j + h / 2 - 13.5);
        lots.push({
          id: SPECIAL_IDS[kind] ?? `${kind}-${i}-${j}`,
          kind,
          i,
          j,
          w,
          h,
          district: key,
          priority: dIndex * 100 + centreDist,
        });
      }
    }
  }

  // Rural features (outside the road lattice). Always available.
  const rural: Omit<Lot, 'priority'>[] = [
    { id: 'farm-1', kind: 'farm', i: 24, j: 4, w: 4, h: 4, district: 'rural' },
    { id: 'farm-2', kind: 'farm', i: 24, j: 9, w: 4, h: 4, district: 'rural' },
    { id: 'farm-3', kind: 'farm', i: 24, j: 14, w: 4, h: 4, district: 'rural' },
    { id: 'farm-4', kind: 'farm', i: 24, j: 19, w: 4, h: 4, district: 'rural' },
    { id: 'power', kind: 'power', i: 14, j: 24, w: 3, h: 3, district: 'rural' },
    { id: 'solar', kind: 'solar', i: 8, j: 24, w: 4, h: 3, district: 'rural' },
    { id: 'wind', kind: 'wind', i: 3, j: 24, w: 4, h: 3, district: 'rural' },
    { id: 'tower-1', kind: 'tower', i: 20, j: 1, w: 1, h: 1, district: 'rural' },
    { id: 'tower-2', kind: 'tower', i: 2, j: 15, w: 1, h: 1, district: 'rural' },
    { id: 'tower-3', kind: 'tower', i: 20, j: 25, w: 1, h: 1, district: 'rural' },
  ];
  for (const r of rural) lots.push({ ...r, priority: 0 });
  return lots;
}

function buildSegments(): RoadSegment[] {
  const segs: RoadSegment[] = [];
  const blockKey = (bi: number, bj: number) => (bi >= 0 && bj >= 0 && bi < 4 && bj < 4 ? `${bi}-${bj}` : null);
  const ruralIds = new Set(['j-4-0', 'j-4-1', 'j-4-2', 'j-4-3', 'i-2-4', 'j-2-3']);
  for (let a = 0; a < 4; a++) {
    for (let b = 0; b < 5; b++) {
      // runs along i, j fixed = ROAD_LINES[b]
      const id = `i-${a}-${b}`;
      const ds = [blockKey(a, b - 1), blockKey(a, b)].filter(Boolean) as string[];
      segs.push({ id, axis: 'i', fixed: ROAD_LINES[b], from: ROAD_LINES[a], to: ROAD_LINES[a + 1], districts: ds, rural: ruralIds.has(id) });
    }
  }
  for (let a = 0; a < 5; a++) {
    for (let b = 0; b < 4; b++) {
      const id = `j-${a}-${b}`;
      const ds = [blockKey(a - 1, b), blockKey(a, b)].filter(Boolean) as string[];
      segs.push({ id, axis: 'j', fixed: ROAD_LINES[a], from: ROAD_LINES[b], to: ROAD_LINES[b + 1], districts: ds, rural: ruralIds.has(id) });
    }
  }
  return segs;
}

export const LOTS: Lot[] = buildLots();
export const LOT_BY_ID: Record<string, Lot> = Object.fromEntries(LOTS.map((l) => [l.id, l]));
export const SEGMENTS: RoadSegment[] = buildSegments();

export function segmentBuilt(seg: RoadSegment, unlocked: ReadonlySet<string>) {
  return seg.rural || seg.districts.some((d) => unlocked.has(d));
}

/** Grid bounds of a district (interior + surrounding road ring). */
export function districtBounds(key: string) {
  const [bi, bj] = key.split('-').map(Number);
  return { i0: ROAD_LINES[bi], j0: ROAD_LINES[bj], i1: ROAD_LINES[bi + 1] + 1, j1: ROAD_LINES[bj + 1] + 1 };
}

export function isRoadTile(i: number, j: number) {
  const onI = (ROAD_LINES as readonly number[]).includes(i) && j >= 3 && j <= 23;
  const onJ = (ROAD_LINES as readonly number[]).includes(j) && i >= 3 && i <= 23;
  return onI || onJ;
}

export function districtOfTile(i: number, j: number): string | null {
  for (let bi = 0; bi < 4; bi++) {
    for (let bj = 0; bj < 4; bj++) {
      const { i0, j0 } = blockOrigin(bi, bj);
      if (i >= i0 && i < i0 + 4 && j >= j0 && j < j0 + 4) return `${bi}-${bj}`;
    }
  }
  return null;
}
