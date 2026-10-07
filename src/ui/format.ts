export function fmtMoney(n: number, digits?: number) {
  const a = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(digits ?? (a >= 10_000_000 ? 1 : 2))}M`;
  if (a >= 10_000) return `${sign}$${Math.round(a / 1000)}k`;
  if (a >= 1000) return `${sign}$${(a / 1000).toFixed(digits ?? 1)}k`;
  return `${sign}$${Math.round(a)}`;
}

export function fmtInt(n: number) {
  return Math.round(n).toLocaleString('en-US');
}

export function fmtCompact(n: number) {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (a >= 10_000) return `${Math.round(n / 1000)}k`;
  return fmtInt(n);
}

export function fmtHours(n: number) {
  return `${fmtInt(n)}h`;
}

export function pctChange(now: number, before: number) {
  if (!before) return 0;
  return ((now - before) / Math.abs(before)) * 100;
}
