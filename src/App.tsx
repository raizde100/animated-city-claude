import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { SimulationController, STAGE_NAMES } from './visual/controller';
import { Town } from './components/Town';
import { EconomicDashboard } from './components/EconomicDashboard';
import { Timeline } from './components/Timeline';
import { EventOverlay, Toasts } from './components/EventOverlay';
import { PolicyControls } from './components/PolicyControls';
import { Inspector } from './components/Inspector';
import { FlowLegend } from './components/TransactionFlow';
import { FinalScene } from './components/FinalScene';
import { SlidersIcon } from './ui/icons';

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, pointerEvents: 'none' }} transition={{ duration: 0.6 }} className="absolute inset-0 z-40 flex items-center justify-center bg-paper/45 p-4 backdrop-blur-[2px]">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }} className="panel max-w-[520px] p-6 sm:p-8">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-hours">An interactive economic story</div>
        <h1 className="mt-2 font-serif text-[34px] leading-[1.05] sm:text-[42px]">The Productivity Flywheel</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          Watch a small town grow over twenty years. People work, businesses trade, taxes build roads and schools — and every gain in productivity <span className="font-semibold text-hours">frees human hours</span> that turn into new businesses and new markets.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button onClick={onStart} className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:scale-[1.03] active:scale-95">
            Begin in Year 1
          </button>
          <span className="text-[12px] text-ink-faint">≈ 8 seconds per year · 1×, 2× or 5×</span>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-2 border-t border-line pt-4 text-[12.5px] text-ink-soft sm:grid-cols-3">
          <div>
            <span className="font-semibold text-ink">Click</span> buildings, the Town Hall or people to inspect them
          </div>
          <div>
            <span className="font-semibold text-ink">Adjust</span> taxes, technology and public spending
          </div>
          <div>
            <span className="font-semibold text-ink">Follow</span> the amber glow: that is freed human time
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function App() {
  const [ctrl] = useState(() => new SimulationController());
  const state = useSyncExternalStore(ctrl.subscribe, ctrl.getState);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [finalOpen, setFinalOpen] = useState(true);

  useEffect(() => {
    if (!state.finished) setFinalOpen(true);
  }, [state.finished]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        ctrl.toggle();
      }
      if (e.key === 'Escape') ctrl.select(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ctrl]);

  const year = Math.min(20, Math.floor(state.yearFloat));
  const digital = state.levels.digital >= 1;

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:flex-row lg:overflow-hidden">
      <aside className="scroll-thin order-2 w-full shrink-0 p-3 lg:order-1 lg:h-full lg:w-[320px] lg:overflow-y-auto">
        <div className="mb-3 hidden px-1 pt-1 lg:block">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">A town in twenty years</div>
          <div className="font-serif text-[26px] leading-tight">The Productivity Flywheel</div>
        </div>
        <EconomicDashboard state={state} />
        <div className="mt-3 lg:hidden">
          <PolicyControls ctrl={ctrl} state={state} />
        </div>
        <p className="mt-3 px-1 text-[11px] leading-relaxed text-ink-faint">
          A simplified, simulated economy. Numbers are illustrative — the relationships are the point.
        </p>
      </aside>

      <main className="relative order-1 h-[68vh] min-h-[460px] flex-1 overflow-hidden lg:order-2 lg:h-full">
        <div className="absolute inset-0">
          <Town ctrl={ctrl} state={state} />
        </div>

        {/* header */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3">
          <div className="pointer-events-auto lg:hidden">
            <div className="font-serif text-xl leading-tight">The Productivity Flywheel</div>
          </div>
          <div className="pointer-events-auto hidden items-center gap-3 lg:flex">
            <div className="panel flex items-baseline gap-2 px-3.5 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Year</span>
              <span className="tnum font-serif text-[26px] leading-none">{year}</span>
              <span className="ml-1 text-[12px] text-ink-soft">
                Stage {state.stage} · {STAGE_NAMES[state.stage]}
              </span>
            </div>
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            <span className="panel tnum px-2.5 py-1.5 text-[12px] font-semibold lg:hidden">Year {year}</span>
            <button onClick={() => setPolicyOpen(!policyOpen)} className={`panel hidden items-center gap-2 px-3.5 py-2 text-[13px] font-semibold transition lg:flex ${policyOpen ? '!bg-ink text-white' : 'text-ink hover:bg-white'}`}>
              <SlidersIcon /> Policy
            </button>
          </div>
        </div>

        {/* story overlays */}
        <div className={`pointer-events-none absolute inset-x-0 top-16 z-20 lg:top-[68px] ${policyOpen || state.selection ? 'lg:pr-[312px]' : ''}`}>
          <EventOverlay ctrl={ctrl} state={state} />
        </div>

        {/* right column */}
        <div className="pointer-events-none absolute right-3 top-[68px] z-20 hidden w-[300px] flex-col gap-3 lg:flex">
          <div className="pointer-events-auto">{policyOpen && <PolicyControls ctrl={ctrl} state={state} onClose={() => setPolicyOpen(false)} />}</div>
          <div className="pointer-events-auto">
            <Inspector ctrl={ctrl} state={state} />
          </div>
        </div>
        <div className="absolute inset-x-3 bottom-[84px] z-20 lg:hidden">
          <Inspector ctrl={ctrl} state={state} />
        </div>

        {/* follow-the-money caption */}
        <AnimatePresence>
          {state.caption && (
            <motion.div key={state.caption} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.35 }} className="pointer-events-none absolute inset-x-0 bottom-[92px] z-20 flex justify-center px-4">
              <div className="rounded-full bg-ink/90 px-4 py-2 text-center text-[13px] font-medium text-white shadow-lg">{state.caption}</div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute bottom-[84px] left-3 z-10 hidden md:block">
          <FlowLegend digital={digital} />
        </div>
        <div className="absolute bottom-[84px] right-3 z-10 hidden md:block">
          <Toasts ctrl={ctrl} state={state} />
        </div>

        <div className="absolute inset-x-3 bottom-3 z-20">
          <Timeline ctrl={ctrl} state={state} />
        </div>

        <AnimatePresence>{!state.started && <IntroScreen onStart={() => ctrl.play()} />}</AnimatePresence>
        {state.finished && finalOpen && <FinalScene ctrl={ctrl} state={state} onClose={() => setFinalOpen(false)} />}
        {state.finished && !finalOpen && (
          <button onClick={() => setFinalOpen(true)} className="panel absolute left-1/2 top-16 z-20 -translate-x-1/2 px-4 py-2 text-[13px] font-semibold">
            Show Year 1 vs Year 20
          </button>
        )}
      </main>
    </div>
  );
}
