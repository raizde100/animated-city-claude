import { memo, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { INDUSTRIES } from '../sim/industries';
import { GRID, LOTS, LOT_BY_ID, SEGMENTS, districtOfTile, isRoadTile, segmentBuilt, type Lot } from '../sim/map';
import { hash2 } from '../sim/random';
import type { Business } from '../sim/types';
import type { SimulationController, UiState } from '../visual/controller';
import { iso, pts, footprint } from '../visual/iso';
import { PALETTE as P } from '../visual/palette';
import { Pine, Tree } from '../visual/shapes';
import { BusinessBuilding, House, type Levels } from './Building';
import { CellTower, Clinic, College, Construction, DataCenter, EmptyLot, LogisticsHub, Park, Plaza, PowerPlant, School, SolarField, University, WindFarm, civicVisible } from './Civic';
import { FlywheelRing } from './Flywheel';
import { TownHall, TreasuryBadge } from './Government';

const SLAB = 34;

// ───────────────────────────────────────────────────────────── ground

const Ground = memo(function Ground({ unlockedKey }: { unlockedKey: string }) {
  const unlocked = new Set(unlockedKey.split(','));
  const patches: ReactNode[] = [];
  for (let i = 2; i < GRID; i++)
    for (let j = 0; j < GRID; j++) {
      const h = hash2(i, j, 1);
      if (h < 0.18) patches.push(<polygon key={`${i}-${j}`} points={footprint(i, j, 1, 1)} fill={h < 0.09 ? P.grassLight : P.grassDark} opacity={0.55} />);
    }
  const blocks: ReactNode[] = [];
  for (const d of unlocked) {
    if (d === 'rural') continue;
    const [bi, bj] = d.split('-').map(Number);
    const i0 = 3 + bi * 5 + 1;
    const j0 = 3 + bj * 5 + 1;
    blocks.push(<polygon key={d} points={footprint(i0, j0, 4, 4)} fill={P.pavement} opacity={0.75} className="fade-in" />);
  }
  const L = (a: number, b: number, z: number) => iso(a, b, z);
  return (
    <g>
      {/* diorama slab */}
      <polygon points={pts(L(0, GRID, 0), L(GRID, GRID, 0), L(GRID, GRID, -SLAB), L(0, GRID, -SLAB))} fill={P.soilMid} />
      <polygon points={pts(L(GRID, 0, 0), L(GRID, GRID, 0), L(GRID, GRID, -SLAB), L(GRID, 0, -SLAB))} fill={P.soilDeep} />
      <polygon points={pts(L(0, GRID, 0), L(GRID, GRID, 0), L(GRID, GRID, -6), L(0, GRID, -6))} fill="#8FA070" />
      <polygon points={pts(L(GRID, 0, 0), L(GRID, GRID, 0), L(GRID, GRID, -6), L(GRID, 0, -6))} fill="#7B8C5F" />
      <polygon points={pts(L(0.3, GRID, -6), L(1.7, GRID, -6), L(1.7, GRID, -SLAB), L(0.3, GRID, -SLAB))} fill={P.water} />
      <polygon points={footprint(0, 0, GRID, GRID)} fill={P.grass} />
      {patches}
      {/* river */}
      <polygon points={pts(L(0.15, 0, 0), L(1.85, 0, 0), L(1.85, GRID, 0), L(0.15, GRID, 0))} fill="#D9D0B8" />
      <polygon points={pts(L(0.3, 0, 0), L(1.7, 0, 0), L(1.7, GRID, 0), L(0.3, GRID, 0))} fill={P.water} />
      {[0.6, 1.0, 1.4].map((o, k) => (
        <line key={k} x1={L(o, 0, 0).x} y1={L(o, 0, 0).y} x2={L(o, GRID, 0).x} y2={L(o, GRID, 0).y} stroke={P.waterLight} strokeWidth={1.2} strokeDasharray={`${14 + k * 6} ${30 + k * 9}`} className="river-flow" style={{ animationDuration: `${7 + k * 2}s` }} />
      ))}
      {blocks}
    </g>
  );
});

// ───────────────────────────────────────────────────────────── roads

const ROAD_COLORS = [P.dirtRoad, P.asphalt, P.asphaltDark, P.asphaltDark];

const Roads = memo(function Roads({ unlockedKey, level }: { unlockedKey: string; level: number }) {
  const unlocked = new Set(unlockedKey.split(','));
  const built = SEGMENTS.filter((s) => segmentBuilt(s, unlocked));
  const fill = ROAD_COLORS[Math.min(3, level)];
  return (
    <g>
      {built.map((s) => {
        const poly =
          s.axis === 'i'
            ? footprint(s.from, s.fixed, s.to + 1 - s.from, 1)
            : footprint(s.fixed, s.from, 1, s.to + 1 - s.from);
        const mid = (s.from + s.to) / 2;
        const dist = s.axis === 'i' ? Math.hypot(mid - 13, s.fixed - 13) : Math.hypot(s.fixed - 13, mid - 13);
        const a = s.axis === 'i' ? iso(s.from + 0.5, s.fixed + 0.5) : iso(s.fixed + 0.5, s.from + 0.5);
        const b = s.axis === 'i' ? iso(s.to + 0.5, s.fixed + 0.5) : iso(s.fixed + 0.5, s.to + 0.5);
        return (
          <g key={s.id} className="fade-in">
            <polygon points={poly} fill={fill} style={{ transition: 'fill 1.4s ease', transitionDelay: `${(dist * 0.08).toFixed(2)}s` }} />
            {level >= 1 && <polygon points={poly} fill="none" stroke="#DCD3C1" strokeWidth={1.2} opacity={0.9} />}
            {level >= 2 && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={P.lane} strokeWidth={1.1} strokeDasharray="7 7" opacity={0.85} />}
            {level >= 3 && s.axis === 'i' && [8, 18].includes(s.fixed) && <line x1={a.x} y1={a.y + 5} x2={b.x} y2={b.y + 5} stroke="#3D7BC0" strokeWidth={1.4} opacity={0.5} />}
            {level >= 3 && s.axis === 'j' && [8, 18].includes(s.fixed) && <line x1={a.x + 5} y1={a.y} x2={b.x + 5} y2={b.y} stroke="#3D7BC0" strokeWidth={1.4} opacity={0.5} />}
          </g>
        );
      })}
      {level >= 2 &&
        built.map((s) => {
          const t = s.axis === 'i' ? iso((s.from + s.to) / 2 + 0.5, s.fixed + 1.02) : iso(s.fixed + 1.02, (s.from + s.to) / 2 + 0.5);
          return (
            <g key={`lamp-${s.id}`}>
              <line x1={t.x} y1={t.y} x2={t.x} y2={t.y - 14} stroke="#6B655D" strokeWidth={1} />
              <circle cx={t.x} cy={t.y - 15} r={1.8} fill="#F6D58C" />
              <circle cx={t.x} cy={t.y - 15} r={5} fill="#F6D58C" opacity={0.25} />
            </g>
          );
        })}
    </g>
  );
});

// ───────────────────────────────────────────────────────────── power lines

function PowerLines() {
  const poles: { i: number; j: number }[] = [];
  for (let j = 24; j >= 9; j -= 2.5) poles.push({ i: 13.98, j });
  const nodes = poles.map((p) => iso(p.i, p.j, 0));
  return (
    <g className="fade-in">
      {nodes.map((n, k) => (
        <g key={k}>
          <line x1={n.x} y1={n.y} x2={n.x} y2={n.y - 26} stroke="#7A6E62" strokeWidth={1.2} />
          <line x1={n.x - 5} y1={n.y - 24} x2={n.x + 5} y2={n.y - 24} stroke="#7A6E62" strokeWidth={1} />
          {k > 0 && (
            <path d={`M${nodes[k - 1].x},${nodes[k - 1].y - 24} Q${(nodes[k - 1].x + n.x) / 2},${(nodes[k - 1].y + n.y) / 2 - 18} ${n.x},${n.y - 24}`} fill="none" stroke="#5C5850" strokeWidth={0.6} opacity={0.7} />
          )}
        </g>
      ))}
    </g>
  );
}

// ───────────────────────────────────────────────────────────── scene

interface Drawable {
  key: string;
  depth: number;
  node: ReactNode;
  onClick?: () => void;
}

function lotDepth(l: { i: number; j: number; w: number; h: number }) {
  return l.i + l.w + l.j + l.h + (l.i + l.j) * 0.001;
}

function buildScene(state: UiState, select: (s: UiState['selection']) => void): Drawable[] {
  const levels: Levels = state.levels;
  const unlocked = new Set(state.unlocked);
  const out: Drawable[] = [];
  const occupied = new Set<string>();
  const tileTaken = new Set<string>();
  const markTiles = (l: Lot) => {
    for (let a = l.i; a < l.i + l.w; a++) for (let b = l.j; b < l.j + l.h; b++) tileTaken.add(`${a},${b}`);
  };

  for (const id of state.houses) {
    const lot = LOT_BY_ID[id];
    occupied.add(id);
    markTiles(lot);
    out.push({ key: `h-${id}`, depth: lotDepth(lot), node: <House lot={lot} v={hash2(lot.i, lot.j, 2)} /> });
  }

  for (const b of state.businesses) {
    const lot = LOT_BY_ID[b.lotId];
    occupied.add(b.lotId);
    markTiles(lot);
    out.push({
      key: `b-${b.id}`,
      depth: lotDepth(lot),
      node: <BusinessBuilding lot={lot} style={b.style} color={INDUSTRIES[b.industry].color} tech={b.techLevel} levels={levels} name={b.name} />,
      onClick: () => select({ kind: 'business', id: b.id }),
    });
  }

  const building = new Set(state.gov.projects.filter((p) => !p.done).map((p) => p.site));
  for (const lot of LOTS) {
    if (occupied.has(lot.id)) continue;
    if (!unlocked.has(lot.district)) {
      if (lot.kind === 'farm') markTiles(lot);
      continue;
    }
    const civic = (node: ReactNode, clickable = true) => {
      markTiles(lot);
      out.push({ key: `c-${lot.id}`, depth: lotDepth(lot), node, onClick: clickable ? () => select({ kind: 'civic', id: lot.id }) : undefined });
    };
    switch (lot.kind) {
      case 'house':
      case 'com':
      case 'big':
        out.push({ key: `e-${lot.id}`, depth: -1, node: <EmptyLot lot={lot} /> });
        break;
      case 'townhall':
        civic(<TownHall lot={lot} digital={levels.digital} />);
        break;
      case 'school':
        civic(<School lot={lot} level={levels.education} />);
        break;
      case 'clinic':
        civic(<Clinic lot={lot} />);
        break;
      case 'plaza':
        civic(<Plaza lot={lot} main={lot.w > 1} />, false);
        break;
      case 'park':
        civic(<Park lot={lot} />, false);
        break;
      case 'power':
        civic(<PowerPlant lot={lot} level={levels.energy} />);
        break;
      default: {
        const visible = civicVisible(lot.kind, levels);
        if (lot.kind === 'farm') {
          markTiles(lot);
          out.push({ key: `e-${lot.id}`, depth: -1, node: <polygon points={footprint(lot.i + 0.2, lot.j + 0.2, lot.w - 0.4, lot.h - 0.4)} fill="#C9C59A" opacity={0.5} /> });
        } else if (visible) {
          const node =
            lot.kind === 'logistics' ? <LogisticsHub lot={lot} /> :
            lot.kind === 'college' ? <College lot={lot} /> :
            lot.kind === 'university' ? <University lot={lot} /> :
            lot.kind === 'datacenter' ? <DataCenter lot={lot} /> :
            lot.kind === 'solar' ? <SolarField lot={lot} /> :
            lot.kind === 'wind' ? <WindFarm lot={lot} /> :
            lot.kind === 'tower' ? <CellTower lot={lot} /> : null;
          if (node) civic(node);
        } else if (!['solar', 'wind', 'tower'].includes(lot.kind)) {
          out.push({ key: `e-${lot.id}`, depth: -1, node: <EmptyLot lot={lot} /> });
        }
      }
    }
    if (building.has(lot.id)) {
      out.push({ key: `k-${lot.id}`, depth: lotDepth(lot) + 0.01, node: <Construction lot={lot} /> });
    }
  }
  // Under-construction markers for sites inside occupied lots (e.g. Town Hall-run programmes) are skipped.

  // Trees: wherever nothing is built.
  const unlockedSolar = levels.energy >= 2;
  const unlockedWind = levels.energy >= 3;
  for (let i = 2; i < GRID; i++)
    for (let j = 0; j < GRID; j++) {
      if (tileTaken.has(`${i},${j}`) || isRoadTile(i, j)) continue;
      const d = districtOfTile(i, j);
      if (d && unlocked.has(d)) continue;
      if (i >= 24 && j >= 3 && j <= 23) continue;
      if (j >= 24 && i >= 14 && i <= 16) continue;
      if (unlockedSolar && j >= 24 && i >= 8 && i <= 11) continue;
      if (unlockedWind && j >= 24 && i >= 3 && i <= 6) continue;
      if ((i === 20 && j === 1) || (i === 2 && j === 15) || (i === 20 && j === 25)) continue;
      const h = hash2(i, j, 4);
      const forest = j <= 2 || i <= 3;
      const density = forest ? 0.6 : d ? 0.32 : 0.22;
      if (h > density) continue;
      const oi = 0.3 + hash2(i, j, 6) * 0.4;
      const oj = 0.3 + hash2(i, j, 8) * 0.4;
      const node = forest && hash2(i, j, 9) > 0.4 ? <Pine i={i + oi} j={j + oj} size={0.8 + hash2(i, j, 10) * 0.5} /> : <Tree i={i + oi} j={j + oj} size={0.7 + hash2(i, j, 10) * 0.45} tone={hash2(i, j, 12)} />;
      out.push({ key: `t-${i}-${j}`, depth: i + j + 1 + oi + oj, node });
    }

  out.sort((a, b) => a.depth - b.depth);
  return out;
}

// ───────────────────────────────────────────────────────────── markers

function SelectionMarker({ state }: { state: UiState }) {
  const sel = state.selection;
  if (!sel || sel.kind === 'person') return null;
  const lotId = sel.kind === 'business' ? state.businesses.find((b) => b.id === sel.id)?.lotId : sel.id;
  const lot = lotId ? LOT_BY_ID[lotId] : null;
  if (!lot) return null;
  return <polygon points={footprint(lot.i - 0.05, lot.j - 0.05, lot.w + 0.1, lot.h + 0.1)} fill="none" stroke="#2B2A28" strokeWidth={1.6} strokeDasharray="5 4" className="march" />;
}

function FreshMarkers({ fresh, businesses }: { fresh: string[]; businesses: Business[] }) {
  return (
    <g>
      {fresh.map((id) => {
        const b = businesses.find((x) => x.id === id);
        if (!b) return null;
        const lot = LOT_BY_ID[b.lotId];
        const c = iso(lot.i + lot.w / 2, lot.j + lot.h / 2);
        return (
          <g key={id} className="fresh-glow">
            <ellipse cx={c.x} cy={c.y} rx={34 * lot.w} ry={17 * lot.w} fill="url(#glowAmber)" />
          </g>
        );
      })}
    </g>
  );
}

// ───────────────────────────────────────────────────────────── Town

export function Town({ ctrl, state }: { ctrl: SimulationController; state: UiState }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const peopleRef = useRef<SVGGElement>(null);
  const fxRef = useRef<SVGGElement>(null);
  const seen = useRef<{ epoch: number; keys: Set<string> }>({ epoch: -1, keys: new Set() });

  useEffect(() => {
    if (svgRef.current && peopleRef.current && fxRef.current) ctrl.attach(svgRef.current, peopleRef.current, fxRef.current);
    return () => ctrl.detach();
  }, [ctrl]);

  const unlockedKey = [...state.unlocked].sort().join(',');
  const levelsKey = JSON.stringify(state.levels);
  const select = ctrl.select.bind(ctrl);

  const scene = useMemo(() => buildScene(state, select),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.worldVersion, levelsKey, unlockedKey, state.epoch]);

  // Newly appearing buildings rise out of the ground; the initial town does not.
  const firstRender = seen.current.epoch !== state.epoch;
  if (firstRender) seen.current = { epoch: state.epoch, keys: new Set() };
  const nodes = scene.map((d) => {
    const isNew = !firstRender && !seen.current.keys.has(d.key) && !d.key.startsWith('t-') && !d.key.startsWith('e-');
    seen.current.keys.add(d.key);
    return (
      <g key={d.key} className={`${isNew ? 'rise' : ''} ${d.onClick ? 'clickable' : ''}`} onClick={d.onClick ? (e) => { e.stopPropagation(); d.onClick!(); } : undefined}>
        {d.node}
      </g>
    );
  });

  const hall = LOT_BY_ID.townhall;
  return (
    <svg ref={svgRef} className="block h-full w-full select-none" preserveAspectRatio="xMidYMid meet" onClick={() => ctrl.select(null)} role="img" aria-label="Animated isometric town economy">
      <defs>
        <radialGradient id="glowAmber">
          <stop offset="0%" stopColor="#F59A55" stopOpacity={0.75} />
          <stop offset="60%" stopColor="#EE7A3A" stopOpacity={0.22} />
          <stop offset="100%" stopColor="#EE7A3A" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="glowBlue">
          <stop offset="0%" stopColor="#3D7BC0" stopOpacity={0.4} />
          <stop offset="100%" stopColor="#3D7BC0" stopOpacity={0} />
        </radialGradient>
      </defs>
      <Ground unlockedKey={unlockedKey} />
      <Roads unlockedKey={unlockedKey} level={state.levels.roads} />
      {state.levels.energy >= 1 && <PowerLines />}
      <FreshMarkers fresh={state.fresh} businesses={state.businesses} />
      <SelectionMarker state={state} />
      <g>{nodes}</g>
      <g ref={peopleRef} />
      <TreasuryBadge lot={hall} treasury={state.gov.treasury} pulseKey={ctrl.treasuryPulseKey} onClick={() => ctrl.select({ kind: 'civic', id: 'townhall' })} />
      <g ref={fxRef} />
      <FlywheelRing active={state.flywheel} ctrl={ctrl} />
    </svg>
  );
}
