import type { ReactNode } from 'react';
import type { BuildingStyle } from '../sim/industries';
import type { Lot } from '../sim/map';
import { hash2 } from '../sim/random';
import { iso, pts, footprint, shade } from '../visual/iso';
import { PALETTE as P } from '../visual/palette';
import { Box, Cylinder, GableRoof, HipRoof, Shadow, Tree, Windows, faceRect } from '../visual/shapes';

export interface Levels {
  roads: number;
  digital: number;
  energy: number;
  education: number;
}

interface Ctx {
  lot: Lot;
  color: string;
  tech: number;
  levels: Levels;
  v: number;
  name?: string;
}

const GLASS = '#A9C6D3';
const GLASS_DARK = '#7FA3B5';

/** Inset footprint inside a lot. */
function inset(lot: Lot, m: number, w = lot.w - m * 2, d = lot.h - m * 2) {
  return { i: lot.i + m, j: lot.j + m, w, d };
}

function Terminal({ b, z }: { b: { i: number; j: number; w: number; d: number }; z: number }) {
  // A small glowing card terminal by the door — appears with digital payments.
  const p = iso(b.i + b.w * 0.78, b.j + b.d + 0.02, z);
  return (
    <g>
      <rect x={p.x - 2} y={p.y - 3} width={4} height={3} rx={0.8} fill="#2E3A40" />
      <circle cx={p.x} cy={p.y - 4.5} r={1.6} fill="#46D3C0" className="blink-soft" />
    </g>
  );
}

// ───────────────────────────────────────────────────────────── homes

export function House({ lot, v }: { lot: Lot; v: number }) {
  const walls = [P.wall, P.wallWarm, '#E6D3BC', '#DCE0D6', '#EADFCF'];
  const roofs = [P.roofTerracotta, P.roofSlate, P.roofSage, '#A96553', '#8C6F5E'];
  const wall = walls[Math.floor(v * walls.length)];
  const roof = roofs[Math.floor(hash2(lot.i, lot.j, 3) * roofs.length)];
  const axis = hash2(lot.i, lot.j, 5) > 0.5 ? 'i' : 'j';
  const w = 0.6 + hash2(lot.i, lot.j, 7) * 0.12;
  const d = 0.56 + hash2(lot.i, lot.j, 9) * 0.12;
  const b = { i: lot.i + (1 - w) / 2, j: lot.j + (1 - d) / 2, w, d };
  const h = 12 + Math.round(v * 4);
  return (
    <g>
      <Shadow {...b} h={h + 8} />
      <polygon points={footprint(lot.i + 0.08, lot.j + 0.08, 0.84, 0.84)} fill={shade(P.grass, 0.08)} />
      <Box {...b} h={h} color={wall} />
      <polygon points={faceRect(b, 'L', b.w * 0.42, b.w * 0.58, 0, 8)} fill={shade(roof, -0.25)} />
      <polygon points={faceRect(b, 'R', b.d * 0.25, b.d * 0.45, 5, 9)} fill={GLASS_DARK} />
      <polygon points={faceRect(b, 'R', b.d * 0.6, b.d * 0.8, 5, 9)} fill={GLASS_DARK} />
      {v > 0.55 && <Box i={b.i + b.w * 0.65} j={b.j + 0.1} w={0.1} d={0.1} z={h} h={13} color="#A48B78" />}
      <GableRoof {...b} z={h} rise={9} color={roof} wall={wall} axis={axis} />
    </g>
  );
}

// ───────────────────────────────────────────────────────────── businesses

function Shop({ lot, color, levels, v }: Ctx) {
  const b = inset(lot, 0.14);
  const h = 18;
  const wall = v > 0.5 ? P.wallWarm : P.wall;
  const awn = (u0: number, u1: number) => pts(iso(b.i + u0, b.j + b.d, 12), iso(b.i + u1, b.j + b.d, 12), iso(b.i + u1, b.j + b.d + 0.16, 8), iso(b.i + u0, b.j + b.d + 0.16, 8));
  const stripes: ReactNode[] = [];
  for (let k = 0; k < 6; k++) {
    const u0 = 0.06 + k * ((b.w - 0.12) / 6);
    stripes.push(<polygon key={k} points={awn(u0, u0 + (b.w - 0.12) / 12)} fill="#F6F0E6" opacity={0.85} />);
  }
  return (
    <g>
      <Shadow {...b} h={h} />
      <Box {...b} h={h} color={wall} />
      <polygon points={faceRect(b, 'L', 0.08, b.w - 0.08, 1, 8)} fill={GLASS} />
      <polygon points={awn(0.06, b.w - 0.06)} fill={color} />
      {stripes}
      <Windows b={b} face="R" rows={1} cols={2} z0={10} floorH={8} winH={4} color={GLASS_DARK} />
      <Box i={b.i + 0.05} j={b.j + 0.05} w={b.w - 0.1} d={0.08} z={h} h={6} color={shade(color, 0.1)} />
      {levels.digital >= 1 && <Terminal b={b} z={0} />}
    </g>
  );
}

function Bakery(ctx: Ctx) {
  const b = inset(ctx.lot, 0.14);
  const c = iso(b.i + b.w * 0.25, b.j + b.d * 0.3, 0);
  return (
    <g>
      <Shop {...ctx} />
      <Box i={b.i + b.w * 0.18} j={b.j + b.d * 0.22} w={0.14} d={0.14} z={18} h={14} color="#A67C68" />
      <g className="smoke">
        <circle cx={c.x} cy={c.y - 38} r={3.5} fill="#ECE6DC" />
        <circle cx={c.x + 4} cy={c.y - 46} r={4.5} fill="#ECE6DC" />
      </g>
    </g>
  );
}

function Yard({ lot, color, tech }: Ctx) {
  const b = { i: lot.i + 0.12, j: lot.j + 0.14, w: 0.48, d: 0.72 };
  const out: ReactNode[] = [];
  for (let k = 0; k < 3; k++) out.push(<Box key={k} i={lot.i + 0.66} j={lot.j + 0.2 + k * 0.22} w={0.24} d={0.16} h={4 + (k % 2) * 3} color="#C9A06A" />);
  const top = iso(lot.i + 0.8, lot.j + 0.25, 34);
  const base = iso(lot.i + 0.8, lot.j + 0.25, 0);
  const tip = iso(lot.i + 0.2, lot.j + 0.5, 34);
  return (
    <g>
      <polygon points={footprint(lot.i + 0.06, lot.j + 0.06, 0.88, 0.88)} fill="#D8CBB0" />
      <Shadow {...b} h={14} />
      <Box {...b} h={13} color={shade(color, 0.35)} />
      <GableRoof {...b} z={13} rise={6} color={shade(color, -0.1)} wall={shade(color, 0.35)} axis="j" />
      {out}
      {tech >= 1 && (
        <g stroke="#B88A3E" strokeWidth={1.4}>
          <line x1={base.x} y1={base.y} x2={top.x} y2={top.y} />
          <line x1={top.x} y1={top.y} x2={tip.x} y2={tip.y} />
          <line x1={tip.x} y1={tip.y} x2={tip.x} y2={tip.y + 10} strokeWidth={0.8} stroke="#5C5850" />
        </g>
      )}
    </g>
  );
}

function Restaurant({ lot, color, levels, v }: Ctx) {
  const b = { i: lot.i + 0.14, j: lot.j + 0.12, w: 0.72, d: 0.5 };
  const h = 15;
  const umb = (ci: number, cj: number) => {
    const p = iso(ci, cj);
    return (
      <g key={`${ci}-${cj}`}>
        <line x1={p.x} y1={p.y} x2={p.x} y2={p.y - 10} stroke="#6B5E52" strokeWidth={1} />
        <ellipse cx={p.x} cy={p.y - 10} rx={6} ry={2.6} fill={v > 0.5 ? '#F2E6D3' : color} />
      </g>
    );
  };
  return (
    <g>
      <polygon points={footprint(lot.i + 0.08, lot.j + 0.6, 0.84, 0.34)} fill="#D9CDB8" />
      <Shadow {...b} h={h} />
      <Box {...b} h={h} color="#EADBC6" />
      <polygon points={faceRect(b, 'L', 0.1, b.w - 0.1, 1, 9)} fill={GLASS} />
      <polygon points={pts(iso(b.i + 0.04, b.j + b.d, 12), iso(b.i + b.w - 0.04, b.j + b.d, 12), iso(b.i + b.w - 0.04, b.j + b.d + 0.14, 8), iso(b.i + 0.04, b.j + b.d + 0.14, 8))} fill={color} />
      <Box i={b.i} j={b.j} w={b.w} d={b.d} z={h} h={3} color={shade(color, -0.1)} />
      {umb(lot.i + 0.3, lot.j + 0.8)}
      {umb(lot.i + 0.7, lot.j + 0.8)}
      {levels.digital >= 1 && <Terminal b={b} z={0} />}
    </g>
  );
}

function Warehouse({ lot, color, tech }: Ctx) {
  const big = lot.w > 1;
  const b = big ? { i: lot.i + 0.2, j: lot.j + 0.2, w: 1.6, d: 1.15 } : { i: lot.i + 0.1, j: lot.j + 0.18, w: 0.8, d: 0.55 };
  const h = big ? 22 : 14;
  const doors: ReactNode[] = [];
  const n = big ? 4 : 2;
  for (let k = 0; k < n; k++) {
    const u0 = 0.12 + k * ((b.w - 0.2) / n);
    doors.push(<polygon key={k} points={faceRect(b, 'L', u0, u0 + (b.w - 0.2) / n - 0.08, 0, h * 0.55)} fill={shade(color, -0.25)} />);
  }
  return (
    <g>
      <polygon points={footprint(lot.i + 0.05, lot.j + 0.05, lot.w - 0.1, lot.h - 0.1)} fill="#CFC6B6" />
      <Shadow {...b} h={h} />
      <Box {...b} h={h} color="#D9D3C8" />
      <polygon points={faceRect(b, 'L', 0, b.w, h - 4, h)} fill={color} />
      {doors}
      <GableRoof {...b} z={h} rise={big ? 8 : 5} color={shade(color, 0.1)} wall="#D9D3C8" axis="i" />
      {big && (
        <>
          <Box i={lot.i + 0.35} j={lot.j + 1.5} w={0.45} d={0.22} h={7} color="#C7704F" />
          <Box i={lot.i + 0.95} j={lot.j + 1.5} w={0.45} d={0.22} h={7} color="#5E7FA0" />
          {tech >= 1 && <Box i={lot.i + 0.95} j={lot.j + 1.5} w={0.45} d={0.22} z={7} h={7} color="#8FA35F" />}
        </>
      )}
    </g>
  );
}

function Office({ lot, color, levels, v }: Ctx) {
  const big = lot.w > 1;
  const b = big ? inset(lot, 0.25) : inset(lot, 0.16);
  const floors = big ? 4 : 2 + (v > 0.5 ? 1 : 0);
  const fh = 11;
  const h = floors * fh + 3;
  return (
    <g>
      <Shadow {...b} h={h} />
      <Box {...b} h={h} color="#E4DED3" />
      <Windows b={b} face="L" rows={floors} cols={big ? 6 : 3} z0={2} floorH={fh} winH={6} color={GLASS_DARK} />
      <Windows b={b} face="R" rows={floors} cols={big ? 6 : 3} z0={2} floorH={fh} winH={6} color={GLASS_DARK} />
      <polygon points={faceRect(b, 'L', 0, b.w, h - 3, h)} fill={color} />
      <Box i={b.i + b.w * 0.3} j={b.j + b.d * 0.3} w={0.2} d={0.2} z={h} h={4} color="#B7B2A8" />
      {levels.digital >= 1 && <Terminal b={b} z={0} />}
    </g>
  );
}

function ClinicSmall({ lot, color }: Ctx) {
  const big = lot.w > 1;
  const b = big ? inset(lot, 0.25) : inset(lot, 0.15);
  const h = big ? 26 : 18;
  const c = iso(b.i + b.w * 0.5, b.j + b.d, h * 0.55);
  return (
    <g>
      <Shadow {...b} h={h} />
      <Box {...b} h={h} color="#F2F0EA" />
      <Windows b={b} face="R" rows={big ? 2 : 1} cols={big ? 4 : 2} z0={3} floorH={11} winH={5} color={GLASS_DARK} />
      <polygon points={faceRect(b, 'L', 0, b.w, h - 4, h)} fill={color} />
      <g transform={`translate(${c.x},${c.y})`}>
        <rect x={-1.6} y={-5} width={3.2} height={10} fill={color} />
        <rect x={-5} y={-1.6} width={10} height={3.2} fill={color} />
      </g>
    </g>
  );
}

function Tower({ lot, color, v, tech }: Ctx) {
  const big = lot.w > 1;
  const b = big ? { i: lot.i + 0.35, j: lot.j + 0.35, w: 1.25, d: 1.25 } : inset(lot, 0.18);
  const floors = big ? 6 + Math.round(v * 2) : 4;
  const fh = 10;
  const h = floors * fh;
  const bands: ReactNode[] = [];
  for (let k = 0; k < floors; k++) {
    bands.push(<polygon key={`l${k}`} points={faceRect(b, 'L', 0, b.w, k * fh + 2, k * fh + 8)} fill={shade(GLASS, 0.15)} opacity={0.8} />);
    bands.push(<polygon key={`r${k}`} points={faceRect(b, 'R', 0, b.d, k * fh + 2, k * fh + 8)} fill={GLASS_DARK} opacity={0.8} />);
  }
  const top = iso(b.i + b.w / 2, b.j + b.d / 2, h + 6);
  return (
    <g>
      {big && <polygon points={footprint(lot.i + 0.08, lot.j + 0.08, lot.w - 0.16, lot.h - 0.16)} fill="#D7D3C6" />}
      {big && <Tree i={lot.i + 0.25} j={lot.j + 1.75} size={0.7} />}
      <Shadow {...b} h={h} />
      <Box {...b} h={h} color="#8DB1C4" top={shade(color, 0.45)} />
      {bands}
      <polygon points={faceRect(b, 'L', 0, b.w, h - 3, h)} fill={color} />
      <Box i={b.i + b.w * 0.35} j={b.j + b.d * 0.35} w={b.w * 0.3} d={b.d * 0.3} z={h} h={6} color="#C9D4D9" />
      <circle cx={top.x} cy={top.y - 1} r={2} fill={tech >= 2 ? '#46D3C0' : color} className="blink-soft" />
    </g>
  );
}

function Bank({ lot, color, levels }: Ctx) {
  const big = lot.w > 1;
  if (big) {
    const b = { i: lot.i + 0.35, j: lot.j + 0.35, w: 1.2, d: 1.2 };
    const h = 70;
    return (
      <g>
        <polygon points={footprint(lot.i + 0.08, lot.j + 0.08, lot.w - 0.16, lot.h - 0.16)} fill="#D7D3C6" />
        <Shadow {...b} h={h} />
        <Box {...b} h={h} color="#5D7699" top={shade(color, 0.5)} />
        <Windows b={b} face="L" rows={7} cols={5} z0={3} floorH={9.5} winH={5} color="#BFD3DE" fill={0.7} />
        <Windows b={b} face="R" rows={7} cols={5} z0={3} floorH={9.5} winH={5} color="#9CB6C6" fill={0.7} />
        <Box i={b.i + 0.2} j={b.j + 0.2} w={0.8} d={0.8} z={h} h={8} color={shade(color, 0.2)} />
      </g>
    );
  }
  const b = inset(lot, 0.15);
  const h = 22;
  const cols: ReactNode[] = [];
  for (let k = 0; k < 4; k++) {
    const u = 0.1 + k * ((b.w - 0.2) / 3);
    cols.push(<polygon key={k} points={faceRect(b, 'L', u - 0.025, u + 0.025, 2, h - 5)} fill="#FBF8F2" />);
  }
  const l = iso(b.i, b.j + b.d, h);
  const r = iso(b.i + b.w, b.j + b.d, h);
  const m = iso(b.i + b.w / 2, b.j + b.d, h + 8);
  return (
    <g>
      <Shadow {...b} h={h} />
      <Box {...b} h={h} color="#DCD3C3" />
      <polygon points={faceRect(b, 'L', 0.05, b.w - 0.05, 2, h - 5)} fill={shade('#DCD3C3', -0.18)} />
      {cols}
      <polygon points={`${l.x},${l.y} ${r.x},${r.y} ${m.x},${m.y}`} fill="#E9E2D5" stroke={color} strokeWidth={0.8} />
      <polygon points={faceRect(b, 'L', 0, b.w, h - 4, h)} fill={color} opacity={0.75} />
      {levels.digital >= 1 && <Terminal b={b} z={0} />}
    </g>
  );
}

function Academy({ lot, color }: Ctx) {
  const b = inset(lot, 0.14);
  const h = 20;
  return (
    <g>
      <Shadow {...b} h={h} />
      <Box {...b} h={h} color="#CFA587" />
      <Windows b={b} face="L" rows={2} cols={3} z0={2} floorH={9} winH={5} color="#EFE7DA" />
      <Windows b={b} face="R" rows={2} cols={3} z0={2} floorH={9} winH={5} color="#EFE7DA" />
      <GableRoof {...b} z={h} rise={9} color={shade(color, -0.1)} wall="#CFA587" axis="i" />
    </g>
  );
}

function Hall({ lot, color }: Ctx) {
  const b = { i: lot.i + 0.25, j: lot.j + 0.25, w: 1.5, d: 1.3 };
  const h = 30;
  const lights: ReactNode[] = [];
  for (let k = 0; k < 10; k++) {
    const p = iso(b.i + 0.1 + k * 0.14, b.j + b.d, 17);
    lights.push(<circle key={k} cx={p.x} cy={p.y} r={1.1} fill="#F7D98A" className={k % 2 ? 'blink-soft' : undefined} />);
  }
  return (
    <g>
      <polygon points={footprint(lot.i + 0.08, lot.j + 0.08, lot.w - 0.16, lot.h - 0.16)} fill="#D9CFC0" />
      <Shadow {...b} h={h} />
      <Box {...b} h={h} color="#E6D9CB" />
      <polygon points={faceRect(b, 'L', 0.1, b.w - 0.1, 14, 22)} fill={color} />
      {lights}
      <polygon points={faceRect(b, 'L', 0.35, b.w - 0.35, 0, 11)} fill="#3C3633" />
      <HipRoof {...b} z={h} rise={8} color={shade(color, -0.1)} />
    </g>
  );
}

function Studio({ lot, color }: Ctx) {
  const b = inset(lot, 0.14);
  const h = 22;
  const teeth: ReactNode[] = [];
  for (let k = 0; k < 3; k++) {
    const i0 = b.i + k * (b.w / 3);
    const i1 = i0 + b.w / 3;
    teeth.push(<polygon key={k} points={pts(iso(i0, b.j, h), iso(i0, b.j + b.d, h), iso(i0, b.j + b.d, h + 8), iso(i0, b.j, h + 8))} fill={GLASS} />);
    teeth.push(<polygon key={`t${k}`} points={pts(iso(i0, b.j, h + 8), iso(i0, b.j + b.d, h + 8), iso(i1, b.j + b.d, h), iso(i1, b.j, h))} fill={shade(color, 0.15)} />);
  }
  return (
    <g>
      <Shadow {...b} h={h} />
      <Box {...b} h={h} color="#ECE5DC" />
      <polygon points={faceRect(b, 'L', 0.08, b.w - 0.08, 3, 17)} fill={GLASS} />
      <polygon points={faceRect(b, 'R', 0, b.d, 0, 4)} fill={color} />
      {teeth}
    </g>
  );
}

function Lab({ lot, color }: Ctx) {
  const big = lot.w > 1;
  const b = big ? { i: lot.i + 0.2, j: lot.j + 0.25, w: 1.6, d: 1.2 } : inset(lot, 0.15);
  const h = big ? 22 : 16;
  const c = iso(b.i + b.w * 0.55, b.j + b.d * 0.5, h);
  const rx = big ? 26 : 14;
  return (
    <g>
      <polygon points={footprint(lot.i + 0.06, lot.j + 0.06, lot.w - 0.12, lot.h - 0.12)} fill="#DCDDD3" />
      <Shadow {...b} h={h + 14} />
      <Box {...b} h={h} color="#F1EFE9" />
      <Windows b={b} face="L" rows={big ? 2 : 1} cols={big ? 7 : 3} z0={3} floorH={9} winH={4} color={GLASS_DARK} fill={0.75} />
      <Windows b={b} face="R" rows={big ? 2 : 1} cols={big ? 5 : 3} z0={3} floorH={9} winH={4} color={GLASS_DARK} fill={0.75} />
      <path d={`M${c.x - rx},${c.y} A${rx},${rx * 0.9} 0 0 1 ${c.x + rx},${c.y} A${rx},${rx * 0.5} 0 0 1 ${c.x - rx},${c.y} Z`} fill={shade(color, 0.25)} />
      <path d={`M${c.x},${c.y - rx * 0.9} A${rx},${rx * 0.9} 0 0 1 ${c.x + rx},${c.y} L${c.x},${c.y + rx * 0.2} Z`} fill={shade(color, 0.05)} opacity={0.7} />
      <line x1={c.x - rx * 0.1} y1={c.y - rx * 0.88} x2={c.x + rx * 0.35} y2={c.y - rx * 0.6} stroke="#EEF3F2" strokeWidth={2.5} />
    </g>
  );
}

function Factory({ lot, color, levels }: Ctx) {
  const b = { i: lot.i + 0.2, j: lot.j + 0.25, w: 1.6, d: 1.25 };
  const h = 20;
  const teeth: ReactNode[] = [];
  const n = 4;
  for (let k = 0; k < n; k++) {
    const j0 = b.j + k * (b.d / n);
    const j1 = j0 + b.d / n;
    teeth.push(<polygon key={`g${k}`} points={pts(iso(b.i, j0, h), iso(b.i + b.w, j0, h), iso(b.i + b.w, j0, h + 9), iso(b.i, j0, h + 9))} fill={GLASS} />);
    teeth.push(<polygon key={`r${k}`} points={pts(iso(b.i, j0, h + 9), iso(b.i + b.w, j0, h + 9), iso(b.i + b.w, j1, h), iso(b.i, j1, h))} fill={levels.energy >= 2 ? '#4E6A86' : shade(color, 0.2)} />);
    teeth.push(<polygon key={`s${k}`} points={pts(iso(b.i + b.w, j0, h), iso(b.i + b.w, j1, h), iso(b.i + b.w, j0, h + 9))} fill={shade(color, -0.1)} />);
  }
  return (
    <g>
      <polygon points={footprint(lot.i + 0.06, lot.j + 0.06, lot.w - 0.12, lot.h - 0.12)} fill="#D2CEC2" />
      <Shadow {...b} h={h + 9} />
      <Box {...b} h={h} color="#DCDCD2" />
      <polygon points={faceRect(b, 'L', 0, b.w, 2, 8)} fill={color} />
      <Windows b={b} face="R" rows={1} cols={5} z0={10} floorH={8} winH={4} color={GLASS_DARK} />
      {teeth}
    </g>
  );
}

function FarmField({ lot, tech, v, name }: Ctx) {
  const greenhouse = name?.includes('Greenhouse');
  const orchard = name?.includes('Orchard');
  const m = 0.18;
  const out: ReactNode[] = [];
  const crop = ['#A7B86A', '#B8B86A', '#93AE68'][Math.floor(v * 3)];
  out.push(<polygon key="soil" points={footprint(lot.i + m, lot.j + m, lot.w - 2 * m, lot.h - 2 * m)} fill={greenhouse ? '#CFCBB9' : '#B99E78'} />);
  if (greenhouse) {
    for (let k = 0; k < 3; k++) {
      const b = { i: lot.i + 0.3, j: lot.j + 0.35 + k * 0.85, w: 2.6, d: 0.6 };
      out.push(
        <g key={`gh${k}`} opacity={0.92}>
          <Box {...b} h={10} color="#D6E6EA" top="#EAF3F4" />
          <GableRoof {...b} z={10} rise={6} color="#C4DCE2" wall="#D6E6EA" axis="i" />
        </g>,
      );
    }
  } else if (orchard) {
    for (let a = 0; a < 4; a++) for (let c = 0; c < 4; c++) out.push(<Tree key={`t${a}${c}`} i={lot.i + 0.5 + a * 0.75} j={lot.j + 0.55 + c * 0.75} size={0.62} tone={0.6} />);
  } else {
    for (let k = 0; k < 8; k++) {
      const j0 = lot.j + m + 0.12 + k * 0.42;
      out.push(<polygon key={`r${k}`} points={pts(iso(lot.i + m + 0.1, j0), iso(lot.i + lot.w - m - 1.1, j0), iso(lot.i + lot.w - m - 1.1, j0 + 0.22), iso(lot.i + m + 0.1, j0 + 0.22))} fill={crop} />);
    }
  }
  // Barn and silo
  const barn = { i: lot.i + lot.w - 1.05, j: lot.j + 0.35, w: 0.8, d: 0.75 };
  if (!greenhouse) {
    out.push(
      <g key="barn">
        <Shadow {...barn} h={18} />
        <Box {...barn} h={13} color="#B9614E" />
        <polygon points={faceRect(barn, 'L', 0.28, 0.52, 0, 9)} fill="#EFE3D3" />
        <GableRoof {...barn} z={13} rise={8} color="#6E6460" wall="#B9614E" axis="j" />
        <Cylinder ci={lot.i + lot.w - 0.55} cj={lot.j + 1.5} r={0.2} h={30} color="#D5CEC4" top="#A9A49C" />
      </g>,
    );
  }
  if (tech >= 1 && !orchard && !greenhouse) {
    const a = iso(lot.i + 0.6, lot.j + 1.2);
    const bpt = iso(lot.i + 2.3, lot.j + 1.2);
    const dx = bpt.x - a.x;
    const dy = bpt.y - a.y;
    out.push(
      <g key="tractor">
        <g>
          <animateTransform attributeName="transform" type="translate" values={`0,0; ${dx},${dy}; 0,0`} dur="9s" repeatCount="indefinite" />
          <g transform={`translate(${a.x},${a.y})`}>
            <rect x={-5} y={-7} width={10} height={6} rx={1.5} fill="#C9763F" />
            <rect x={-1} y={-11} width={5} height={5} rx={1} fill="#E6A15E" />
            <circle cx={-3} cy={-1} r={2.2} fill="#3D3833" />
            <circle cx={3.5} cy={-1} r={1.6} fill="#3D3833" />
          </g>
        </g>
      </g>,
    );
  }
  if (tech >= 2 && !orchard && !greenhouse) {
    const a = iso(lot.i + 0.3, lot.j + 2.8, 8);
    const c = iso(lot.i + 2.6, lot.j + 2.8, 8);
    out.push(<line key="irr" x1={a.x} y1={a.y} x2={c.x} y2={c.y} stroke="#8AA7B4" strokeWidth={1.6} strokeDasharray="5 3" />);
  }
  return <g>{out}</g>;
}

function Depot({ lot, color }: Ctx) {
  const b = { i: lot.i + 0.12, j: lot.j + 0.15, w: 1.25, d: 0.7 };
  return (
    <g>
      <polygon points={footprint(lot.i + 0.04, lot.j + 0.04, lot.w - 0.08, lot.h - 0.08)} fill="#D2C3A6" />
      <Shadow {...b} h={22} />
      <Box {...b} h={14} color="#C9B38E" />
      <polygon points={faceRect(b, 'L', 0.15, 0.55, 0, 9)} fill={shade(color, -0.2)} />
      <GableRoof {...b} z={14} rise={7} color="#7E7268" wall="#C9B38E" axis="i" />
      <Cylinder ci={lot.i + 1.62} cj={lot.j + 0.35} r={0.18} h={28} color="#D9D2C6" top="#AFA89F" />
      <Cylinder ci={lot.i + 1.7} cj={lot.j + 0.75} r={0.15} h={22} color="#D9D2C6" top="#AFA89F" />
    </g>
  );
}

const RENDER: Record<BuildingStyle, (c: Ctx) => ReactNode> = {
  farm: FarmField,
  depot: Depot,
  shop: Shop,
  bakery: Bakery,
  yard: Yard,
  restaurant: Restaurant,
  warehouse: Warehouse,
  office: Office,
  clinicSmall: ClinicSmall,
  tower: Tower,
  bank: Bank,
  academy: Academy,
  hall: Hall,
  studio: Studio,
  lab: Lab,
  factory: Factory,
};

export function BusinessBuilding(props: { lot: Lot; style: BuildingStyle; color: string; tech: number; levels: Levels; name: string }) {
  const v = hash2(props.lot.i, props.lot.j, 11);
  return <>{RENDER[props.style]({ ...props, v })}</>;
}

/** Height above ground (px) of a building's roof — used to anchor money particles. */
export function roofHeight(style: BuildingStyle | string, lot: Lot) {
  const big = lot.w > 1;
  switch (style) {
    case 'tower':
      return big ? 72 : 42;
    case 'bank':
      return big ? 72 : 28;
    case 'office':
      return big ? 46 : 32;
    case 'farm':
      return 20;
    case 'townhall':
      return 58;
    case 'warehouse':
      return big ? 28 : 18;
    default:
      return big ? 30 : 22;
  }
}
