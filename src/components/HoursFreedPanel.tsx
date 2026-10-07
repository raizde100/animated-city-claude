import { AnimatePresence, motion } from 'framer-motion';
import { SIM_CONFIG } from '../sim/config';
import type { UiState } from '../visual/controller';
import { fmtInt, pctChange } from '../ui/format';
import { useAnimatedNumber } from '../ui/hooks';
import { ArrowUp } from '../ui/icons';
import { Sparkline } from '../ui/Sparkline';

function lockedReason(state: UiState) {
  const L = state.levels;
  if (state.stage < 2) return `Needs productivity ${SIM_CONFIG.stage2Productivity} (now ${state.metrics.avgProductivity.toFixed(0)})`;
  if (state.stage < 3) {
    const missing = [L.digital < 2 && 'broadband towers', L.education < 2 && 'a technical college'].filter(Boolean);
    return `Needs ${missing.join(' + ')}`;
  }
  return 'Needs a research university';
}

/** The headline indicator: how much human time productivity has released, and what it is turning into. */
export function HoursFreedPanel({ state }: { state: UiState }) {
  const m = state.metrics;
  const rate = useAnimatedNumber(m.hoursFreedRate, 700);
  const pct = pctChange(m.hoursFreedRate, state.prev.hoursFreedRate);
  const next = state.nextBusiness;
  const poolHours = state.idleWorkers * 160;
  const need = next ? next.employees * 160 : 1;
  const fill = next && !next.locked ? Math.min(1, poolHours / need) : Math.min(1, poolHours / 960);
  const ly = state.lastYear;

  return (
    <div className="panel relative overflow-hidden p-4">
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-hours opacity-[0.12] blur-2xl" />
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-hours opacity-50" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-hours" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-hours">Human hours freed</span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div>
          <div className="tnum font-serif text-[34px] leading-none text-ink">
            {fmtInt(rate)}
            <span className="ml-1 font-sans text-sm font-medium text-ink-soft">h / month</span>
          </div>
          <div className="mt-1 text-[11px] text-ink-faint">Hours the original output no longer needs</div>
        </div>
        {pct > 0.05 && (
          <span className="mb-1 inline-flex items-center gap-0.5 rounded-full bg-hours-soft px-2 py-0.5 text-[11px] font-semibold text-hours tnum">
            <ArrowUp />
            {pct.toFixed(0)}%
          </span>
        )}
      </div>
      <div className="mt-2">
        <Sparkline data={state.series.hours} color="#EE7A3A" height={26} />
      </div>

      <div className="mt-3 border-t border-line pt-3">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-medium text-ink-soft">Capacity looking for new work</span>
          <span className="tnum text-ink-faint">
            {fmtInt(poolHours)}h{next && !next.locked ? ` / ${fmtInt(need)}h` : ''}
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-paper-deep">
          <motion.div className="h-full rounded-full bg-hours" animate={{ width: `${Math.max(3, fill * 100)}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
        </div>
        <div className="mt-1.5 text-[11px] leading-snug text-ink-faint">
          {next ? (
            next.locked ? (
              <>
                Next: <span className="font-medium text-ink-soft">{next.industry}</span> · {lockedReason(state)}
              </>
            ) : (
              <>
                Next: <span className="font-medium text-ink-soft">{next.name}</span> · {next.industry} · {next.employees} people
              </>
            )
          ) : (
            'Every planned business has opened'
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {ly && ly.newBusinesses > 0 && (
          <motion.div key={ly.year} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="mt-3 rounded-xl bg-hours-soft/60 p-2.5">
            <div className="text-[11px] font-medium text-ink-soft">
              Year {ly.year}: <span className="tnum font-semibold text-hours">+{fmtInt(ly.hoursReleased)}h/mo</span> released became
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {[
                [`+${ly.newBusinesses}`, ly.newBusinesses === 1 ? 'business' : 'businesses'],
                [`+${ly.newJobs}`, 'jobs'],
                [`+${ly.newMarkets}`, ly.newMarkets === 1 ? 'new market' : 'new markets'],
              ].map(([n, l], k) => (
                <motion.span key={l} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15 + k * 0.15, type: 'spring', stiffness: 380, damping: 18 }} className="rounded-full bg-white px-2 py-0.5 text-[11px] text-ink-soft">
                  <span className="tnum font-semibold text-ink">{n}</span> {l}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
