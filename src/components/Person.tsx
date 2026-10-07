import { INDUSTRIES } from '../sim/industries';
import type { Business } from '../sim/types';
import { fmtMoney } from '../ui/format';
import { HOURS_COLOR } from '../visual/palette';
import { PanelHeader, Row } from './Business';

/** Static glyph of a town resident (the animated ones are drawn by the agent layer with the same proportions). */
export function PersonGlyph({ color = '#9A948A', halo = false, size = 22 }: { color?: string; halo?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-10 -18 20 20" aria-hidden>
      {halo && <circle r={9} cy={-6} fill={HOURS_COLOR} opacity={0.35} />}
      <ellipse rx={3.2} ry={1.4} fill="#3B3427" opacity={0.2} />
      <rect x={-2.1} y={-8.5} width={4.2} height={7.5} rx={2} fill={color} />
      <circle r={2.2} cy={-10.6} fill="#E8C4A2" />
    </svg>
  );
}

/** Details for a clicked worker. */
export function WorkerPanel({ id, job, taxRate }: { id: number; job: Business | undefined; taxRate: number }) {
  if (!job) {
    return (
      <div>
        <PanelHeader kicker="Resident" title={`Resident #${id}`} />
        <div className="mt-3 text-[13px] text-ink-soft">Between jobs — their freed hours are waiting for a new business to open.</div>
      </div>
    );
  }
  const ind = INDUSTRIES[job.industry];
  const income = (job.output * 0.6) / Math.max(1, job.employees);
  const weekly = Math.max(35, Math.min(46, 46 - ((job.productivity - 100) / 180) * 8));
  const net = income * (1 - taxRate * 0.5);
  const split = [
    ['Groceries', 0.3, '#D9A23C'],
    ['Restaurants', 0.1, '#BF5F55'],
    ['Transport', 0.15, '#7B8898'],
    ['Saved', 0.45, '#6E9E5A'],
  ] as const;
  return (
    <div>
      <PanelHeader kicker="Worker" title={`${ind.name} worker`} color={ind.color} />
      <div className="mt-3">
        <Row label="Job" value={job.name} />
        <Row label="Income" value={`${fmtMoney(income)}/yr`} accent="#6E9E5A" />
        <Row label="Working hours" value={`${weekly.toFixed(0)}h/week`} />
        <Row label="Productivity" value={`${job.productivity.toFixed(0)} index`} accent="#EE7A3A" />
        <Row label="Consumption" value={`${fmtMoney(net * 0.55)}/yr`} accent="#D9A23C" />
      </div>
      <div className="mt-3 text-[11px] font-medium uppercase tracking-wider text-ink-faint">Of every $100 earned</div>
      <div className="mt-1.5 flex h-2 overflow-hidden rounded-full">
        {split.map(([l, v, c]) => (
          <div key={l} style={{ width: `${v * 100}%`, background: c }} />
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5">
        {split.map(([l, v, c]) => (
          <div key={l} className="flex items-center gap-1.5 text-[11.5px] text-ink-soft">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
            {l} <span className="tnum ml-auto font-semibold text-ink">${Math.round(v * 100)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
