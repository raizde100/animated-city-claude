import type { ReactNode } from 'react';
import { iso, pts, footprint, shade, TW, TH } from './iso';

/** Primitive isometric shapes shared by every building. */

export interface BoxProps {
  i: number;
  j: number;
  w: number;
  d: number;
  z?: number;
  h: number;
  color: string;
  top?: string;
  stroke?: string;
}

export function Box({ i, j, w, d, z = 0, h, color, top, stroke }: BoxProps) {
  const sw = stroke ? 0.6 : 0;
  return (
    <>
      <polygon points={pts(iso(i, j + d, z), iso(i + w, j + d, z), iso(i + w, j + d, z + h), iso(i, j + d, z + h))} fill={color} stroke={stroke} strokeWidth={sw} />
      <polygon points={pts(iso(i + w, j, z), iso(i + w, j + d, z), iso(i + w, j + d, z + h), iso(i + w, j, z + h))} fill={shade(color, -0.17)} stroke={stroke} strokeWidth={sw} />
      <polygon points={footprint(i, j, w, d, z + h)} fill={top ?? shade(color, 0.22)} stroke={stroke} strokeWidth={sw} />
    </>
  );
}

/** Rectangle drawn on the +j (left, 'L') or +i (right, 'R') face of a box. u in tiles along the face, v in px up. */
export function faceRect(b: { i: number; j: number; w: number; d: number }, face: 'L' | 'R', u0: number, u1: number, v0: number, v1: number) {
  if (face === 'L') return pts(iso(b.i + u0, b.j + b.d, v0), iso(b.i + u1, b.j + b.d, v0), iso(b.i + u1, b.j + b.d, v1), iso(b.i + u0, b.j + b.d, v1));
  return pts(iso(b.i + b.w, b.j + u0, v0), iso(b.i + b.w, b.j + u1, v0), iso(b.i + b.w, b.j + u1, v1), iso(b.i + b.w, b.j + u0, v1));
}

export function Windows({
  b,
  face,
  rows,
  cols,
  z0,
  floorH,
  winH,
  color,
  margin = 0.1,
  fill = 0.55,
}: {
  b: { i: number; j: number; w: number; d: number };
  face: 'L' | 'R';
  rows: number;
  cols: number;
  z0: number;
  floorH: number;
  winH: number;
  color: string;
  margin?: number;
  fill?: number;
}) {
  const len = face === 'L' ? b.w : b.d;
  const cell = (len - margin * 2) / cols;
  const out: ReactNode[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const u0 = margin + c * cell + (cell * (1 - fill)) / 2;
      const v0 = z0 + r * floorH + (floorH - winH) / 2;
      out.push(<polygon key={`${r}-${c}`} points={faceRect(b, face, u0, u0 + cell * fill, v0, v0 + winH)} fill={face === 'R' ? shade(color, -0.12) : color} />);
    }
  return <>{out}</>;
}

/** Gable roof. axis = direction of the ridge. */
export function GableRoof({ i, j, w, d, z, rise, color, wall, axis = 'i' }: { i: number; j: number; w: number; d: number; z: number; rise: number; color: string; wall: string; axis?: 'i' | 'j' }) {
  const zr = z + rise;
  const o = 0.05;
  if (axis === 'i') {
    return (
      <>
        <polygon points={pts(iso(i - o, j - o, z), iso(i + w + o, j - o, z), iso(i + w + o, j + d / 2, zr), iso(i - o, j + d / 2, zr))} fill={shade(color, 0.12)} />
        <polygon points={pts(iso(i + w, j, z), iso(i + w, j + d, z), iso(i + w, j + d / 2, zr))} fill={shade(wall, -0.17)} />
        <polygon points={pts(iso(i - o, j + d + o, z), iso(i + w + o, j + d + o, z), iso(i + w + o, j + d / 2, zr), iso(i - o, j + d / 2, zr))} fill={color} />
      </>
    );
  }
  return (
    <>
      <polygon points={pts(iso(i - o, j - o, z), iso(i - o, j + d + o, z), iso(i + w / 2, j + d + o, zr), iso(i + w / 2, j - o, zr))} fill={shade(color, 0.12)} />
      <polygon points={pts(iso(i, j + d, z), iso(i + w, j + d, z), iso(i + w / 2, j + d, zr))} fill={wall} />
      <polygon points={pts(iso(i + w + o, j - o, z), iso(i + w + o, j + d + o, z), iso(i + w / 2, j + d + o, zr), iso(i + w / 2, j - o, zr))} fill={shade(color, -0.12)} />
    </>
  );
}

export function HipRoof({ i, j, w, d, z, rise, color }: { i: number; j: number; w: number; d: number; z: number; rise: number; color: string }) {
  const a = iso(i + w / 2, j + d / 2, z + rise);
  const c00 = iso(i, j, z);
  const c10 = iso(i + w, j, z);
  const c11 = iso(i + w, j + d, z);
  const c01 = iso(i, j + d, z);
  return (
    <>
      <polygon points={pts(c00, c10, a)} fill={shade(color, 0.18)} />
      <polygon points={pts(c00, c01, a)} fill={shade(color, 0.1)} />
      <polygon points={pts(c01, c11, a)} fill={color} />
      <polygon points={pts(c10, c11, a)} fill={shade(color, -0.15)} />
    </>
  );
}

/** Vertical cylinder centred on grid point (ci, cj), radius r in tiles. */
export function Cylinder({ ci, cj, r, z = 0, h, color, top }: { ci: number; cj: number; r: number; z?: number; h: number; color: string; top?: string }) {
  const c = iso(ci, cj, z);
  const rx = (TW / 2) * Math.SQRT2 * r;
  const ry = (TH / 2) * Math.SQRT2 * r;
  const body = `M${c.x - rx},${c.y - h} L${c.x - rx},${c.y} A${rx},${ry} 0 0 0 ${c.x + rx},${c.y} L${c.x + rx},${c.y - h} Z`;
  const right = `M${c.x},${c.y - h + ry} L${c.x},${c.y + ry} A${rx},${ry} 0 0 0 ${c.x + rx},${c.y} L${c.x + rx},${c.y - h} Z`;
  return (
    <>
      <path d={body} fill={color} />
      <path d={right} fill={shade(color, -0.16)} />
      <ellipse cx={c.x} cy={c.y - h} rx={rx} ry={ry} fill={top ?? shade(color, 0.2)} />
    </>
  );
}

/** Soft ground shadow cast toward screen-right. */
export function Shadow({ i, j, w, d, h }: { i: number; j: number; w: number; d: number; h: number }) {
  const s = Math.min(1.1, h / 45);
  return <polygon points={pts(iso(i, j + d), iso(i + w, j + d), iso(i + w + s * 0.9, j + d - s * 0.5), iso(i + w + s * 0.9, j - s * 0.5), iso(i + w, j))} fill="#3B3427" opacity={0.13} />;
}

export function Tree({ i, j, size = 1, tone = 0 }: { i: number; j: number; size?: number; tone?: number }) {
  const p = iso(i, j);
  const r = 7 * size;
  const green = tone > 0.5 ? '#7F9C69' : tone > 0.2 ? '#738F5E' : '#88A372';
  return (
    <g>
      <ellipse cx={p.x + 3} cy={p.y + 1} rx={r * 0.9} ry={r * 0.42} fill="#3B3427" opacity={0.14} />
      <rect x={p.x - 1} y={p.y - 9 * size} width={2} height={9 * size} fill="#7A5E45" />
      <circle cx={p.x} cy={p.y - 11 * size} r={r} fill={green} />
      <circle cx={p.x + r * 0.32} cy={p.y - 11 * size + r * 0.2} r={r * 0.68} fill={shade(green, -0.14)} />
      <circle cx={p.x - r * 0.3} cy={p.y - 11 * size - r * 0.35} r={r * 0.38} fill={shade(green, 0.18)} />
    </g>
  );
}

export function Pine({ i, j, size = 1 }: { i: number; j: number; size?: number }) {
  const p = iso(i, j);
  const h = 22 * size;
  const r = 6.5 * size;
  return (
    <g>
      <ellipse cx={p.x + 3} cy={p.y + 1} rx={r} ry={r * 0.45} fill="#3B3427" opacity={0.14} />
      <polygon points={`${p.x - r},${p.y - 3} ${p.x},${p.y - h} ${p.x},${p.y - 1}`} fill="#6D8B5E" />
      <polygon points={`${p.x + r},${p.y - 3} ${p.x},${p.y - h} ${p.x},${p.y - 1}`} fill="#55724A" />
    </g>
  );
}
