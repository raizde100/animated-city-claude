import { motion } from 'framer-motion';
import type { SimulationController, UiState } from '../visual/controller';
import { fmtCompact, fmtInt, fmtMoney } from '../ui/format';
import { RestartIcon } from '../ui/icons';

/** Year 1 vs Year 20 and the closing message. */
export function FinalScene({ ctrl, state, onClose }: { ctrl: SimulationController; state: UiState; onClose: () => void }) {
  const a = state.start;
  const b = state.metrics;
  const rows: [string, string, string, string?][] = [
    ['GDP', fmtMoney(a.gdp, 1), fmtMoney(b.gdp, 1), `${(b.gdp / a.gdp).toFixed(1)}×`],
    ['GDP per worker', fmtMoney(a.gdpPerWorker), fmtMoney(b.gdpPerWorker), `${(b.gdpPerWorker / a.gdpPerWorker).toFixed(1)}×`],
    ['Productivity', a.avgProductivity.toFixed(0), b.avgProductivity.toFixed(0)],
    ['Labour hours / month', `${fmtCompact(a.laborHours)}h`, `${fmtCompact(b.laborHours)}h`, `${(b.laborHours / a.laborHours).toFixed(1)}×`],
    ['Human hours freed', '0', `${fmtCompact(b.hoursFreedTotal)}h`, 'cumulative'],
    ['Businesses', fmtInt(a.businesses), fmtInt(b.businesses)],
    ['Industries', fmtInt(a.industries), fmtInt(b.industries)],
  ];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, delay: 1.2 }} className="pointer-events-none absolute inset-0 z-30 flex items-end justify-center overflow-y-auto p-3 sm:items-center sm:p-6">
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, delay: 1.6, ease: [0.2, 0.8, 0.2, 1] }}
        className="panel pointer-events-auto w-full max-w-[720px] p-5 sm:p-8"
      >
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-hours">Year 1 → Year 20</div>
        <div className="mt-1 font-serif text-[22px] leading-tight sm:text-[26px]">
          {(b.gdp / a.gdp).toFixed(1)}× more output with only {(b.laborHours / a.laborHours).toFixed(1)}× more labour
        </div>
        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-[1.1fr_1fr]">
          <div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-wider text-ink-faint">
                  <th className="pb-1.5 text-left font-medium" />
                  <th className="pb-1.5 text-right font-medium">Year 1</th>
                  <th className="pb-1.5 text-right font-medium">Year 20</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([l, x, y, note], k) => (
                  <motion.tr key={l} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 2 + k * 0.12 }} className="border-t border-line">
                    <td className="py-1.5 text-ink-soft">{l}</td>
                    <td className="tnum py-1.5 text-right text-ink-faint">{x}</td>
                    <td className="tnum py-1.5 text-right font-semibold">
                      {y}
                      {note && <span className="ml-1.5 text-[11px] font-medium text-hours">{note}</span>}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col justify-center">
            {['Productivity creates time.', 'Time creates possibilities.', 'Possibilities create new markets.'].map((line, k) => (
              <motion.div key={line} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.6 + k * 0.6, duration: 0.7 }} className={`font-serif text-[24px] leading-snug sm:text-[28px] ${k === 0 ? 'text-hours' : 'text-ink'}`}>
                {line}
              </motion.div>
            ))}
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 4.6, duration: 1 }} className="mt-4 text-[14px] leading-relaxed text-ink-soft">
              Economic growth is not only about producing more. It is about freeing human capacity to create what did not exist before.
            </motion.p>
          </div>
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 5 }} className="mt-6 flex flex-wrap gap-2">
          <button onClick={() => ctrl.restart()} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.02]">
            <RestartIcon /> Replay twenty years
          </button>
          <button onClick={onClose} className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-paper">
            Explore the town
          </button>
          <span className="self-center text-[12px] text-ink-faint">Tip: change the policy sliders, then replay.</span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
