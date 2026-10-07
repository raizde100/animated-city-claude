import { SIM_CONFIG } from '../sim/config';
import { INDUSTRIES, TECH_UPGRADES } from '../sim/industries';
import type { Business } from '../sim/types';
import { fmtInt, fmtMoney } from '../ui/format';

export function Row({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line/70 py-1.5 last:border-b-0">
      <span className="text-[12px] text-ink-faint">{label}</span>
      <span className="tnum text-right text-[13px] font-semibold" style={{ color: accent }}>
        {value}
      </span>
    </div>
  );
}

export function PanelHeader({ kicker, title, color }: { kicker: string; title: string; color?: string }) {
  return (
    <div className="pr-6">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
        {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
        {kicker}
      </div>
      <div className="mt-0.5 font-serif text-xl leading-tight">{title}</div>
    </div>
  );
}

/** Lightweight details for a clicked business. */
export function BusinessPanel({ b }: { b: Business }) {
  const ind = INDUSTRIES[b.industry];
  const hoursPerDay = b.employees * 8;
  const tech = b.techLevel > 0 ? TECH_UPGRADES[b.industry][Math.min(b.techLevel - 1, 3)] : 'Manual methods';
  return (
    <div>
      <PanelHeader kicker={ind.name} title={b.name} color={ind.color} />
      <div className="mt-1 text-[11px] text-ink-faint">{b.legacy ? 'Part of the original town' : `Opened in Year ${Math.floor(1 + b.founded)} with freed human hours`}</div>
      <div className="mt-3">
        <Row label="Employees" value={fmtInt(b.employees)} />
        <Row label="Revenue" value={`${fmtMoney(b.output)}/yr`} />
        <Row label="Productivity" value={`${b.productivity.toFixed(0)} index`} accent="#EE7A3A" />
        <Row label="Labour hours" value={`${fmtInt(b.hours)}h/mo · ${hoursPerDay}h/day`} />
        <Row label="Output" value={`${fmtInt(b.unitsPerDay)} ${b.unit}/day`} />
        <Row label="Taxes paid" value={fmtMoney(b.taxesPaid)} accent="#6E62B6" />
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-ink-faint">Technology level</span>
          <span className="flex gap-1">
            {Array.from({ length: SIM_CONFIG.techMaxLevel }, (_, k) => (
              <span key={k} className={`h-1.5 w-5 rounded-full ${k < b.techLevel ? 'bg-hours' : 'bg-paper-deep'}`} />
            ))}
          </span>
        </div>
        <div className="mt-1 text-[12px] font-medium text-ink-soft">{tech}</div>
      </div>
      {b.legacy && b.baseHours > b.hours && (
        <div className="mt-3 rounded-lg bg-hours-soft/70 px-3 py-2 text-[12px] text-ink-soft">
          Needs <span className="tnum font-semibold text-hours">{fmtInt(b.baseHours - b.hours)}h/mo</span> fewer than in Year 1 — capacity now working elsewhere.
        </div>
      )}
    </div>
  );
}
