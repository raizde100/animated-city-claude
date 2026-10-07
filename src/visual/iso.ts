/** Isometric projection helpers. Grid (i, j, z) → screen (x, y). */
export const TW = 64;
export const TH = 32;
const HW = TW / 2;
const HH = TH / 2;

export interface Pt {
  x: number;
  y: number;
}

export function iso(i: number, j: number, z = 0): Pt {
  return { x: (i - j) * HW, y: (i + j) * HH - z };
}

export function pts(...p: Pt[]) {
  return p.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ');
}

/** Diamond footprint polygon at height z. */
export function footprint(i: number, j: number, w: number, d: number, z = 0) {
  return pts(iso(i, j, z), iso(i + w, j, z), iso(i + w, j + d, z), iso(i, j + d, z));
}

// ── colour helpers ────────────────────────────────────────────────────

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number) {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** amt > 0 lightens toward white, < 0 darkens toward black. */
export function shade(hex: string, amt: number) {
  const [r, g, b] = hexToRgb(hex);
  if (amt >= 0) return rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
  return rgbToHex(r * (1 + amt), g * (1 + amt), b * (1 + amt));
}

export function mix(a: string, b: string, t: number) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}

/** Screen-space bounds of a grid rectangle (with height allowance). */
export function isoBounds(i0: number, j0: number, i1: number, j1: number, top = 0, bottom = 0) {
  const c = [iso(i0, j0), iso(i1, j0), iso(i1, j1), iso(i0, j1)];
  return {
    minX: Math.min(...c.map((p) => p.x)),
    maxX: Math.max(...c.map((p) => p.x)),
    minY: Math.min(...c.map((p) => p.y)) - top,
    maxY: Math.max(...c.map((p) => p.y)) + bottom,
  };
}
