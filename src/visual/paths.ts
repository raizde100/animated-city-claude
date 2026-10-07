import { LOT_BY_ID, ROAD_LINES, SEGMENTS, segmentBuilt, type RoadSegment } from '../sim/map';

export interface GP {
  i: number;
  j: number;
}

const N = ROAD_LINES.length;
const nodeId = (a: number, b: number) => a * N + b;
const nodePos = (id: number): GP => ({ i: ROAD_LINES[Math.floor(id / N)] + 0.5, j: ROAD_LINES[id % N] + 0.5 });

interface Access {
  seg: RoadSegment;
  p: GP;
  ends: [number, number];
}

/**
 * Road network for agents: shortest paths over lattice intersections along
 * the built road segments. Rebuilt whenever districts unlock.
 */
export class RoadNetwork {
  private dist: number[][] = [];
  private next: number[][] = [];
  private built: RoadSegment[] = [];
  private accessCache = new Map<string, Access | null>();

  constructor(unlocked: ReadonlySet<string>) {
    this.rebuild(unlocked);
  }

  rebuild(unlocked: ReadonlySet<string>) {
    this.built = SEGMENTS.filter((s) => segmentBuilt(s, unlocked));
    this.accessCache.clear();
    const V = N * N;
    const INF = 1e9;
    const dist: number[][] = Array.from({ length: V }, (_, a) => Array.from({ length: V }, (_, b) => (a === b ? 0 : INF)));
    const next: number[][] = Array.from({ length: V }, (_, a) => Array.from({ length: V }, (_, b) => (a === b ? b : -1)));
    for (const s of this.built) {
      const [u, v] = this.segEnds(s);
      const len = s.to - s.from;
      dist[u][v] = dist[v][u] = len;
      next[u][v] = v;
      next[v][u] = u;
    }
    for (let k = 0; k < V; k++)
      for (let a = 0; a < V; a++) {
        if (dist[a][k] >= INF) continue;
        for (let b = 0; b < V; b++) {
          const d = dist[a][k] + dist[k][b];
          if (d < dist[a][b]) {
            dist[a][b] = d;
            next[a][b] = next[a][k];
          }
        }
      }
    this.dist = dist;
    this.next = next;
  }

  private segEnds(s: RoadSegment): [number, number] {
    const fi = ROAD_LINES.indexOf(s.fixed as (typeof ROAD_LINES)[number]);
    const a = ROAD_LINES.indexOf(s.from as (typeof ROAD_LINES)[number]);
    const b = ROAD_LINES.indexOf(s.to as (typeof ROAD_LINES)[number]);
    return s.axis === 'i' ? [nodeId(a, fi), nodeId(b, fi)] : [nodeId(fi, a), nodeId(fi, b)];
  }

  /** Nearest point on a built road to a grid point. */
  accessFor(key: string, c: GP): Access | null {
    if (this.accessCache.has(key)) return this.accessCache.get(key)!;
    let best: Access | null = null;
    let bestD = Infinity;
    for (const s of this.built) {
      const lo = s.from + 0.5;
      const hi = s.to + 0.5;
      const f = s.fixed + 0.5;
      const p = s.axis === 'i' ? { i: Math.max(lo, Math.min(hi, c.i)), j: f } : { i: f, j: Math.max(lo, Math.min(hi, c.j)) };
      const d = Math.hypot(p.i - c.i, p.j - c.j);
      if (d < bestD) {
        bestD = d;
        best = { seg: s, p, ends: this.segEnds(s) };
      }
    }
    this.accessCache.set(key, best);
    return best;
  }

  private nodePath(a: number, b: number): GP[] {
    if (this.next[a][b] === -1) return [];
    const out = [nodePos(a)];
    let u = a;
    let guard = 0;
    while (u !== b && guard++ < 64) {
      u = this.next[u][b];
      out.push(nodePos(u));
    }
    return out;
  }

  /** Path (grid points) between two grid locations via roads. */
  route(fromKey: string, from: GP, toKey: string, to: GP): GP[] {
    const A = this.accessFor(fromKey, from);
    const B = this.accessFor(toKey, to);
    if (!A || !B) return [from, to];
    if (A.seg === B.seg) return [from, A.p, B.p, to];
    let best: GP[] | null = null;
    let bestLen = Infinity;
    for (const ea of A.ends)
      for (const eb of B.ends) {
        const d = this.dist[ea][eb];
        if (d >= 1e9) continue;
        const pa = nodePos(ea);
        const pb = nodePos(eb);
        const len = Math.abs(pa.i - A.p.i) + Math.abs(pa.j - A.p.j) + d + Math.abs(pb.i - B.p.i) + Math.abs(pb.j - B.p.j);
        if (len < bestLen) {
          bestLen = len;
          best = this.nodePath(ea, eb);
        }
      }
    if (!best) return [from, to];
    return [from, A.p, ...best, B.p, to];
  }

  /** A loop around a ring of lattice nodes (used by buses). */
  ring(nodes: [number, number][]): GP[] {
    const pts: GP[] = [];
    for (let k = 0; k < nodes.length; k++) {
      const a = nodeId(nodes[k][0], nodes[k][1]);
      const b = nodeId(nodes[(k + 1) % nodes.length][0], nodes[(k + 1) % nodes.length][1]);
      const seg = this.nodePath(a, b);
      pts.push(...(k === 0 ? seg : seg.slice(1)));
    }
    return pts;
  }
}

export function lotCenter(lotId: string): GP {
  const l = LOT_BY_ID[lotId];
  return { i: l.i + l.w / 2, j: l.j + l.h / 2 };
}
