import type { ReactNode } from 'react';
import type { Lot } from '../sim/map';
import { iso, pts, footprint, shade } from '../visual/iso';
import { PALETTE as P } from '../visual/palette';
import { Box, Cylinder, GableRoof, HipRoof, Shadow, Tree, Windows, faceRect } from '../visual/shapes';
import type { Levels } from './Building';

const GLASS_DARK = '#7FA3B5';

export function School({ lot, level }: { lot: Lot; level: number }) {
  const main = { i: lot.i + 0.2, j: lot.j + 0.2, w: 1.1, d: 0.75 };
  const h = level >= 1 ? 22 : 15;
  return (
    <g>
      <polygon points={footprint(lot.i + 0.05, lot.j + 0.05, 1.9, 1.9)} fill="#D9CDB6" />
      {/* playing field */}
      <polygon points={footprint(lot.i + 0.25, lot.j + 1.1, 1.0, 0.75)} fill="#A9BE86" />
      <polygon points={footprint(lot.i + 0.35, lot.j + 1.2, 0.8, 0.55)} fill="none" stroke="#F3EEE4" strokeWidth={1} />
      <Shadow {...main} h={h} />
      <Box {...main} h={h} color="#C98D6F" />
      <Windows b={main} face="L" rows={level >= 1 ? 2 : 1} cols={4} z0={3} floorH={9} winH={4.5} color="#F1E8DA" />
      <Windows b={main} face="R" rows={level >= 1 ? 2 : 1} cols={3} z0={3} floorH={9} winH={4.5} color="#F1E8DA" />
      <GableRoof {...main} z={h} rise={9} color="#6F6A66" wall="#C98D6F" axis="i" />
      {level >= 1 && (
        <g className="rise">
          <Box i={lot.i + 1.35} j={lot.j + 0.2} w={0.5} d={1.6} h={18} color="#E9E1D3" />
          <Windows b={{ i: lot.i + 1.35, j: lot.j + 0.2, w: 0.5, d: 1.6 }} face="R" rows={2} cols={5} z0={2} floorH={8} winH={4} color={GLASS_DARK} />
          <Box i={lot.i + 1.35} j={lot.j + 0.2} w={0.5} d={1.6} z={18} h={2} color="#8A6FB0" />
        </g>
      )}
      {/* bell / flag */}
      {(() => {
        const p = iso(main.i + 0.2, main.j + 0.2, h + 4);
        return (
          <g>
            <line x1={p.x} y1={p.y} x2={p.x} y2={p.y - 16} stroke="#5C5850" strokeWidth={1} />
            <polygon points={`${p.x},${p.y - 16} ${p.x + 9},${p.y - 13} ${p.x},${p.y - 10}`} fill="#8A6FB0" />
          </g>
        );
      })()}
    </g>
  );
}

export function Clinic({ lot }: { lot: Lot }) {
  const b = { i: lot.i + 0.15, j: lot.j + 0.15, w: 0.7, d: 1.7 };
  const h = 20;
  const c = iso(b.i + b.w, b.j + b.d * 0.5, h * 0.55);
  return (
    <g>
      <Shadow {...b} h={h} />
      <Box {...b} h={h} color="#F3F1EC" />
      <Windows b={b} face="R" rows={2} cols={5} z0={2} floorH={9} winH={4} color={GLASS_DARK} />
      <Windows b={b} face="L" rows={2} cols={2} z0={2} floorH={9} winH={4} color={GLASS_DARK} />
      <polygon points={faceRect(b, 'R', 0, b.d, h - 3, h)} fill="#5B9F97" />
      <g transform={`translate(${c.x - 4},${c.y + 2})`}>
        <rect x={-1.8} y={-5.5} width={3.6} height={11} fill="#5B9F97" />
        <rect x={-5.5} y={-1.8} width={11} height={3.6} fill="#5B9F97" />
      </g>
    </g>
  );
}

export function Plaza({ lot, main }: { lot: Lot; main: boolean }) {
  const c = iso(lot.i + lot.w / 2, lot.j + lot.h / 2);
  return (
    <g>
      <polygon points={footprint(lot.i + 0.04, lot.j + 0.04, lot.w - 0.08, lot.h - 0.08)} fill="#E1D6C2" />
      <polygon points={footprint(lot.i + 0.2, lot.j + 0.2, lot.w - 0.4, lot.h - 0.4)} fill="none" stroke="#CDBFA6" strokeWidth={1} />
      {main ? (
        <g>
          <ellipse cx={c.x} cy={c.y} rx={20} ry={10} fill="#CBBFA9" />
          <ellipse cx={c.x} cy={c.y - 1.5} rx={16} ry={8} fill={P.water} />
          <ellipse cx={c.x} cy={c.y - 1.5} rx={9} ry={4.5} fill="none" stroke={P.waterLight} strokeWidth={1} className="ripple" />
          <rect x={c.x - 1.5} y={c.y - 12} width={3} height={10} fill="#D8CDB8" />
          <circle cx={c.x} cy={c.y - 13} r={2.5} fill={P.waterLight} />
        </g>
      ) : (
        <Tree i={lot.i + 0.5} j={lot.j + 0.5} size={0.85} />
      )}
    </g>
  );
}

export function Park({ lot }: { lot: Lot }) {
  const c = iso(lot.i + 1.1, lot.j + 1.2);
  return (
    <g>
      <polygon points={footprint(lot.i + 0.05, lot.j + 0.05, lot.w - 0.1, lot.h - 0.1)} fill="#ADC18C" />
      <ellipse cx={c.x} cy={c.y} rx={26} ry={12} fill={P.water} />
      <Tree i={lot.i + 0.4} j={lot.j + 0.4} size={0.9} />
      <Tree i={lot.i + 1.6} j={lot.j + 0.5} size={0.75} tone={0.6} />
      <Tree i={lot.i + 0.5} j={lot.j + 1.7} size={0.8} tone={0.3} />
      <Tree i={lot.i + 1.7} j={lot.j + 1.7} size={0.9} />
    </g>
  );
}

export function LogisticsHub({ lot }: { lot: Lot }) {
  const b = { i: lot.i + 0.15, j: lot.j + 0.15, w: 1.7, d: 1.0 };
  const h = 24;
  const docks: ReactNode[] = [];
  for (let k = 0; k < 5; k++) docks.push(<polygon key={k} points={faceRect(b, 'L', 0.12 + k * 0.32, 0.36 + k * 0.32, 0, 12)} fill="#5E6670" />);
  const cont = ['#C7704F', '#5E7FA0', '#8FA35F', '#D4A64A'];
  return (
    <g>
      <polygon points={footprint(lot.i + 0.04, lot.j + 0.04, 1.92, 1.92)} fill="#C9C3B8" />
      <Shadow {...b} h={h} />
      <Box {...b} h={h} color="#DAD6CE" />
      {docks}
      <polygon points={faceRect(b, 'L', 0, b.w, h - 4, h)} fill="#7B8898" />
      <Box i={b.i} j={b.j} w={b.w} d={b.d} z={h} h={2} color="#B9B4AA" />
      {cont.map((c, k) => (
        <Box key={k} i={lot.i + 0.2 + (k % 2) * 0.55} j={lot.j + 1.35 + 0} w={0.5} d={0.22} z={Math.floor(k / 2) * 6} h={6} color={c} />
      ))}
      <Box i={lot.i + 1.35} j={lot.j + 1.35} w={0.5} d={0.22} h={6} color="#7B8898" />
    </g>
  );
}

export function College({ lot }: { lot: Lot }) {
  const b = { i: lot.i + 0.2, j: lot.j + 0.2, w: 1.6, d: 0.8 };
  const h = 24;
  const tower = { i: lot.i + 0.85, j: lot.j + 0.45, w: 0.32, d: 0.32 };
  const clock = iso(tower.i + tower.w / 2, tower.j + tower.d, h + 30);
  return (
    <g>
      <polygon points={footprint(lot.i + 0.04, lot.j + 0.04, 1.92, 1.92)} fill="#B5C795" />
      <Shadow {...b} h={h} />
      <Box {...b} h={h} color="#C9927A" />
      <Windows b={b} face="L" rows={2} cols={7} z0={3} floorH={10} winH={5} color="#F1E8DA" />
      <Windows b={b} face="R" rows={2} cols={3} z0={3} floorH={10} winH={5} color="#F1E8DA" />
      <GableRoof {...b} z={h} rise={10} color="#5F6670" wall="#C9927A" axis="i" />
      <Box {...tower} h={h + 36} color="#C08A72" />
      <circle cx={clock.x} cy={clock.y} r={4} fill="#F4EEE4" stroke="#5F6670" strokeWidth={0.8} />
      <HipRoof {...tower} z={h + 36} rise={12} color="#5F6670" />
      <Tree i={lot.i + 0.4} j={lot.j + 1.6} size={0.8} />
      <Tree i={lot.i + 1.5} j={lot.j + 1.6} size={0.7} tone={0.6} />
    </g>
  );
}

export function University({ lot }: { lot: Lot }) {
  const b = { i: lot.i + 0.2, j: lot.j + 0.25, w: 1.6, d: 1.0 };
  const h = 26;
  const c = iso(b.i + b.w / 2, b.j + b.d / 2, h);
  const cols: ReactNode[] = [];
  for (let k = 0; k < 8; k++) {
    const u = 0.1 + k * 0.2;
    cols.push(<polygon key={k} points={faceRect(b, 'L', u - 0.03, u + 0.03, 2, h - 4)} fill="#FBF8F2" />);
  }
  return (
    <g>
      <polygon points={footprint(lot.i + 0.04, lot.j + 0.04, 1.92, 1.92)} fill="#B5C795" />
      <Shadow {...b} h={h + 20} />
      <Box {...b} h={h} color="#E2D8C6" />
      <polygon points={faceRect(b, 'L', 0.05, b.w - 0.05, 2, h - 4)} fill={shade('#E2D8C6', -0.2)} />
      {cols}
      <path d={`M${c.x - 22},${c.y} A22,22 0 0 1 ${c.x + 22},${c.y} Z`} fill="#7FA7A3" />
      <path d={`M${c.x},${c.y - 22} A22,22 0 0 1 ${c.x + 22},${c.y} L${c.x},${c.y} Z`} fill="#6C9591" />
      <rect x={c.x - 1} y={c.y - 30} width={2} height={8} fill="#5C5850" />
      <Tree i={lot.i + 1.7} j={lot.j + 1.65} size={0.8} />
    </g>
  );
}

export function DataCenter({ lot }: { lot: Lot }) {
  const out: ReactNode[] = [];
  for (let k = 0; k < 2; k++) {
    const b = { i: lot.i + 0.2, j: lot.j + 0.2 + k * 0.85, w: 1.6, d: 0.65 };
    out.push(
      <g key={k}>
        <Shadow {...b} h={16} />
        <Box {...b} h={16} color="#5B6168" />
        {Array.from({ length: 8 }, (_, n) => {
          const p = iso(b.i + 0.12 + n * 0.19, b.j + b.d, 8);
          return <circle key={n} cx={p.x} cy={p.y} r={1.1} fill={n % 3 === 0 ? '#46D3C0' : '#8FD1F0'} className={n % 2 ? 'blink' : 'blink-soft'} />;
        })}
        <Box i={b.i + 0.2} j={b.j + 0.15} w={0.3} d={0.3} z={16} h={4} color="#8A9097" />
        <Box i={b.i + 0.9} j={b.j + 0.15} w={0.3} d={0.3} z={16} h={4} color="#8A9097" />
      </g>,
    );
  }
  return <g>{out}</g>;
}

export function PowerPlant({ lot, level }: { lot: Lot; level: number }) {
  const out: ReactNode[] = [];
  out.push(<polygon key="pad" points={footprint(lot.i + 0.1, lot.j + 0.1, lot.w - 0.2, lot.h - 0.2)} fill="#C9C1B1" />);
  if (level === 0) {
    const shed = { i: lot.i + 0.5, j: lot.j + 0.6, w: 1.1, d: 0.8 };
    out.push(
      <g key="old">
        <Shadow {...shed} h={14} />
        <Box {...shed} h={13} color="#A99C8A" />
        <GableRoof {...shed} z={13} rise={6} color="#6F655C" wall="#A99C8A" axis="i" />
        <Cylinder ci={lot.i + 1.9} cj={lot.j + 0.8} r={0.1} h={36} color="#8D8072" />
        <Cylinder ci={lot.i + 1.9} cj={lot.j + 1.7} r={0.35} h={12} color="#B5AB9C" />
        <g className="smoke dark">
          <circle cx={iso(lot.i + 1.9, lot.j + 0.8).x} cy={iso(lot.i + 1.9, lot.j + 0.8).y - 42} r={5} fill="#BDB5AA" />
          <circle cx={iso(lot.i + 1.9, lot.j + 0.8).x + 6} cy={iso(lot.i + 1.9, lot.j + 0.8).y - 52} r={6} fill="#C9C2B8" />
        </g>
      </g>,
    );
  } else {
    const hall = { i: lot.i + 0.3, j: lot.j + 1.5, w: 1.5, d: 1.0 };
    const tower = (ci: number, cj: number, k: number) => {
      const c = iso(ci, cj);
      const r = 20;
      return (
        <g key={`ct${k}`}>
          <ellipse cx={c.x + 8} cy={c.y + 2} rx={r * 1.2} ry={r * 0.5} fill="#3B3427" opacity={0.13} />
          <path d={`M${c.x - r},${c.y} C${c.x - r * 0.55},${c.y - 25} ${c.x - r * 0.55},${c.y - 32} ${c.x - r * 0.75},${c.y - 46} L${c.x + r * 0.75},${c.y - 46} C${c.x + r * 0.55},${c.y - 32} ${c.x + r * 0.55},${c.y - 25} ${c.x + r},${c.y} Z`} fill="#E3DED5" />
          <path d={`M${c.x},${c.y - 46} L${c.x + r * 0.75},${c.y - 46} C${c.x + r * 0.55},${c.y - 32} ${c.x + r * 0.55},${c.y - 25} ${c.x + r},${c.y} L${c.x},${c.y + 4} Z`} fill="#CBC5BB" />
          <ellipse cx={c.x} cy={c.y - 46} rx={r * 0.75} ry={r * 0.3} fill="#B9B2A7" />
          <g className="smoke">
            <circle cx={c.x} cy={c.y - 56} r={8} fill="#F4F1EC" />
            <circle cx={c.x + 7} cy={c.y - 66} r={9} fill="#F4F1EC" />
          </g>
        </g>
      );
    };
    out.push(
      <g key="new">
        {tower(lot.i + 0.8, lot.j + 0.7, 0)}
        {tower(lot.i + 2.1, lot.j + 0.8, 1)}
        <Shadow {...hall} h={20} />
        <Box {...hall} h={20} color="#E7E2D9" />
        <Windows b={hall} face="L" rows={1} cols={6} z0={8} floorH={9} winH={4} color={GLASS_DARK} />
        <polygon points={faceRect(hall, 'L', 0, hall.w, 17, 20)} fill="#D4A64A" />
        <g stroke="#8D8579" strokeWidth={0.8}>
          {[0, 1, 2].map((k) => {
            const a = iso(lot.i + 2.1 + k * 0.25, lot.j + 1.7);
            return <line key={k} x1={a.x} y1={a.y} x2={a.x} y2={a.y - 14} />;
          })}
        </g>
      </g>,
    );
  }
  return <g>{out}</g>;
}

export function SolarField({ lot }: { lot: Lot }) {
  const out: ReactNode[] = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 3; c++) {
      const i0 = lot.i + 0.25 + r * 0.92;
      const j0 = lot.j + 0.3 + c * 0.85;
      out.push(<polygon key={`${r}-${c}`} points={pts(iso(i0, j0, 3), iso(i0 + 0.75, j0, 3), iso(i0 + 0.75, j0 + 0.5, 9), iso(i0, j0 + 0.5, 9))} fill="#4E6A86" stroke="#9DB5C9" strokeWidth={0.5} />);
    }
  return (
    <g>
      <polygon points={footprint(lot.i + 0.1, lot.j + 0.1, lot.w - 0.2, lot.h - 0.2)} fill="#C7CFAE" />
      {out}
    </g>
  );
}

export function WindFarm({ lot }: { lot: Lot }) {
  const spots = [
    [lot.i + 0.8, lot.j + 0.7],
    [lot.i + 2.4, lot.j + 1.0],
    [lot.i + 1.5, lot.j + 2.3],
    [lot.i + 3.3, lot.j + 2.2],
  ];
  return (
    <g>
      {spots.map(([i, j], k) => {
        const b = iso(i, j);
        const hub = { x: b.x, y: b.y - 64 };
        return (
          <g key={k}>
            <ellipse cx={b.x + 6} cy={b.y + 1} rx={8} ry={3} fill="#3B3427" opacity={0.12} />
            <polygon points={`${b.x - 2},${b.y} ${b.x + 2},${b.y} ${hub.x + 1},${hub.y} ${hub.x - 1},${hub.y}`} fill="#F1EEE8" />
            <g transform={`translate(${hub.x},${hub.y})`}>
              <g className="spin" style={{ animationDuration: `${3.2 + k * 0.4}s` }}>
                {[0, 120, 240].map((a) => (
                  <path key={a} d="M0,0 L-1.6,-2 L0,-24 L1.6,-2 Z" fill="#FAF8F4" stroke="#CFCAC1" strokeWidth={0.4} transform={`rotate(${a})`} />
                ))}
              </g>
              <circle r={2.2} fill="#E3DFD8" />
            </g>
          </g>
        );
      })}
    </g>
  );
}

export function CellTower({ lot }: { lot: Lot }) {
  const b = iso(lot.i + 0.5, lot.j + 0.5);
  const top = { x: b.x, y: b.y - 70 };
  return (
    <g>
      <ellipse cx={b.x + 6} cy={b.y + 1} rx={9} ry={3.5} fill="#3B3427" opacity={0.12} />
      <g stroke="#8A8F96" strokeWidth={1.2} fill="none">
        <line x1={b.x - 7} y1={b.y} x2={top.x} y2={top.y} />
        <line x1={b.x + 7} y1={b.y} x2={top.x} y2={top.y} />
        {[0.25, 0.45, 0.65].map((t) => (
          <line key={t} x1={b.x - 7 * (1 - t)} y1={b.y - 70 * t} x2={b.x + 7 * (1 - t)} y2={b.y - 70 * t} strokeWidth={0.8} />
        ))}
      </g>
      <circle cx={top.x} cy={top.y} r={2.4} fill="#46D3C0" />
      <circle cx={top.x} cy={top.y} r={10} fill="none" stroke="#46D3C0" strokeWidth={1.2} className="ping" />
      <circle cx={top.x} cy={top.y} r={10} fill="none" stroke="#46D3C0" strokeWidth={1.2} className="ping delay" />
    </g>
  );
}

/** Scaffolding drawn over a site while a public project is being built. */
export function Construction({ lot }: { lot: Lot }) {
  const b = { i: lot.i + 0.2, j: lot.j + 0.2, w: Math.min(lot.w, 2) - 0.4, d: Math.min(lot.h, 2) - 0.4 };
  const h = 22;
  const corners = [iso(b.i, b.j + b.d), iso(b.i + b.w, b.j + b.d), iso(b.i + b.w, b.j)];
  const mast = iso(b.i + b.w, b.j, 0);
  return (
    <g className="construction">
      <polygon points={footprint(b.i, b.j, b.w, b.d)} fill="#3D7BC0" opacity={0.12} />
      <polygon points={footprint(b.i, b.j, b.w, b.d)} fill="none" stroke="#3D7BC0" strokeDasharray="4 3" strokeWidth={1.2} />
      {corners.map((c, k) => (
        <line key={k} x1={c.x} y1={c.y} x2={c.x} y2={c.y - h} stroke="#C9A25A" strokeWidth={1.2} />
      ))}
      <polygon points={footprint(b.i, b.j, b.w, b.d, h)} fill="none" stroke="#C9A25A" strokeWidth={1} />
      <line x1={mast.x} y1={mast.y} x2={mast.x} y2={mast.y - 54} stroke="#D4A64A" strokeWidth={2} />
      <line x1={mast.x - 34} y1={mast.y - 52} x2={mast.x + 12} y2={mast.y - 52} stroke="#D4A64A" strokeWidth={2} />
      <line x1={mast.x - 26} y1={mast.y - 52} x2={mast.x - 26} y2={mast.y - 30} stroke="#5C5850" strokeWidth={0.8} className="sway" />
    </g>
  );
}

export function EmptyLot({ lot }: { lot: Lot }) {
  return <polygon points={footprint(lot.i + 0.12, lot.j + 0.12, lot.w - 0.24, lot.h - 0.24)} fill="none" stroke="#B9AE97" strokeWidth={0.9} strokeDasharray="3 3" opacity={0.7} />;
}

export function civicVisible(kind: Lot['kind'], levels: Levels): boolean {
  switch (kind) {
    case 'logistics':
      return levels.roads >= 2;
    case 'college':
      return levels.education >= 2;
    case 'university':
      return levels.education >= 3;
    case 'datacenter':
      return levels.digital >= 3;
    case 'solar':
      return levels.energy >= 2;
    case 'wind':
      return levels.energy >= 3;
    case 'tower':
      return levels.digital >= 2;
    default:
      return true;
  }
}
