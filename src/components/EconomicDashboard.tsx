import type { ReactNode } from 'react';
import type { UiState } from '../visual/controller';
import { fmtCompact, fmtInt, fmtMoney, pctChange } from '../ui/format';
import { useAnimatedNumber } from '../ui/hooks';
import { ArrowDown, ArrowUp } from '../ui/icons';
import { HoursFreedPanel } from './HoursFreedPanel';
import { Sparkline } from '../ui/Sparkline';

function Trend({ pct, count }: { pct?: number; count?: number }) {
  if (count !== undefined) {
    if (count === 0) return <span className="text-[11px] text-ink-faint">—</span>;
    return <span className="shrink-0 text-[10.5px] font-medium text-up">+{count} /yr</span>;
  }
  if (pct === undefined || !isFinite(pct)) return null;
  const up = pct > 0.05;
  const down = pct < -0.05;
  return (
    <span className={`inline-flex shrink-0 items-center gap-0.5 text-[10.5px] font-medium tnum ${up ? 'text-up' : down ? 'text-down' : 'text-ink-faint'}`}>
      {up ? <ArrowUp /> : down ? <ArrowDown /> : null}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function Metric({ label, value, format, trend, sub, children }: { label: string; value: number; format: (n: number) => string; trend?: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  const v = useAnimatedNumber(value);
  return (
    <div className="min-w-0 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/70">
      <div className="flex items-center justify-between gap-1.5">
        <div className="truncate text-[10.5px] font-medium uppercase tracking-[0.06em] text-ink-faint">{label}</div>
        {trend}
      </div>
      <div className="tnum mt-0.5 truncate text-[17px] font-semibold text-ink">{format(v)}</div>
      {sub && <div className="mt-0.5 truncate text-[11px] text-ink-faint tnum">{sub}</div>}
      {children}
    </div>
  );
}

export function EconomicDashboard({ state }: { state: UiState }) {
  const m = state.metrics;
  const p = state.prev;
  return (
    <div className="flex flex-col gap-3">
      <HoursFreedPanel state={state} />
      <div className="panel grid grid-cols-2 gap-px p-1.5">
        <Metric label="GDP" value={m.gdp} format={(n) => fmtMoney(n)} trend={<Trend pct={pctChange(m.gdp, p.gdp)} />}>
          <Sparkline data={state.series.gdp} color="#2B2A28" />
        </Metric>
        <Metric label="GDP per worker" value={m.gdpPerWorker} format={(n) => fmtMoney(n, 1)} trend={<Trend pct={pctChange(m.gdpPerWorker, p.gdpPerWorker)} />} sub={`${fmtInt(m.workers)} workers · ${fmtInt(m.population)} residents`} />
        <Metric label="Productivity" value={m.avgProductivity} format={(n) => n.toFixed(0)} trend={<Trend pct={pctChange(m.avgProductivity, p.avgProductivity)} />} sub="Index · Year 1 = 100">
          <Sparkline data={state.series.productivity} color="#EE7A3A" />
        </Metric>
        <Metric label="Labour hours" value={m.laborHours} format={(n) => `${fmtCompact(n)}h`} trend={<Trend pct={pctChange(m.laborHours, p.laborHours)} />} sub="per month, all jobs" />
        <Metric label="Transactions" value={m.transactionsPerDay} format={(n) => `${fmtInt(n)}/day`} trend={<Trend pct={pctChange(m.transactionsPerDay, p.transactionsPerDay)} />} sub={`${fmtCompact(m.transactionsTotal)} in total`} />
        <Metric label="Tax revenue" value={m.taxRevenue} format={(n) => `${fmtMoney(n)}/yr`} trend={<Trend pct={pctChange(m.taxRevenue, p.taxRevenue)} />} sub={`${fmtMoney(m.taxRevenueTotal)} collected`} />
        <Metric label="Public invest." value={m.govInvestmentTotal} format={(n) => fmtMoney(n)} trend={<Trend pct={pctChange(m.govInvestmentTotal, p.govInvestmentTotal)} />} sub={`Treasury ${fmtMoney(m.treasury)}`} />
        <Metric label="Businesses" value={m.businesses} format={(n) => fmtInt(n)} trend={<Trend count={m.businesses - p.businesses} />} sub={`${fmtInt(m.employed)} jobs`} />
        <Metric label="Industries" value={m.industries} format={(n) => fmtInt(n)} trend={<Trend count={m.industries - p.industries} />} sub={`Started with ${state.start.industries}`} />
        <Metric label="Hours freed, total" value={m.hoursFreedTotal} format={(n) => `${fmtCompact(n)}h`} trend={<Trend pct={pctChange(m.hoursFreedTotal, p.hoursFreedTotal)} />} sub="cumulative since Year 1" />
      </div>
    </div>
  );
}
