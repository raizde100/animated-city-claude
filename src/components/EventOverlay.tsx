import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { INDUSTRIES } from '../sim/industries';
import type { SimulationController, StoryItem, Toast, UiState } from '../visual/controller';
import { fmtInt } from '../ui/format';

const DURATION: Record<StoryItem['kind'], number> = { milestone: 4600, shock: 6800, conversion: 6200 };

function Arrow() {
  return (
    <svg width="22" height="12" viewBox="0 0 22 12" className="shrink-0 text-ink-faint" aria-hidden>
      <path d="M1 6h18M14 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Kicker({ children, tone = 'hours' }: { children: React.ReactNode; tone?: 'hours' | 'ink' }) {
  return <div className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${tone === 'hours' ? 'text-hours' : 'text-ink-faint'}`}>{children}</div>;
}

function ShockCard({ item }: { item: Extract<StoryItem, { kind: 'shock' }> }) {
  const i = item.info;
  const freed = i.hoursBefore - i.hoursAfter;
  return (
    <>
      <Kicker>Technology shock · Year {item.year}</Kicker>
      <div className="mt-1 font-serif text-[22px] leading-tight text-ink sm:text-2xl">
        {i.businessName} adopts {i.upgrade.toLowerCase()}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Output</div>
          <div className="tnum mt-1 text-base font-semibold sm:text-lg">
            {fmtInt(i.unitsPerDay)} → {fmtInt(i.unitsPerDay)}
          </div>
          <div className="text-[11px] text-ink-faint">{i.unit} / day</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Labour hours</div>
          <div className="tnum mt-1 text-base font-semibold sm:text-lg">
            {i.hoursBefore}h → {i.hoursAfter}h
          </div>
          <div className="text-[11px] text-ink-faint tnum">
            {i.workersBefore}×8h → {i.workersAfter}×8h
          </div>
        </div>
        <div className="rounded-xl bg-hours-soft px-2.5 py-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-hours">Hours freed</div>
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 14 }} className="tnum mt-0.5 font-serif text-2xl text-hours">
            +{freed}h
          </motion.div>
          <div className="text-[11px] text-ink-soft">per day</div>
        </div>
      </div>
      <div className="mt-3 text-[13px] text-ink-soft">Technology doesn’t simply eliminate work. It releases human capacity.</div>
    </>
  );
}

function ConversionCard({ item }: { item: Extract<StoryItem, { kind: 'conversion' }> }) {
  const b = item.business;
  const ind = INDUSTRIES[b.industry];
  return (
    <>
      <Kicker>{item.first ? 'Human hours → new markets' : item.newIndustry ? 'A new market appears' : 'New business'} · Year {item.year}</Kicker>
      <div className="mt-1 font-serif text-[22px] leading-tight sm:text-2xl">{item.first ? 'Freed time becomes something new' : `${ind.name} arrives in town`}</div>
      <div className="mt-4 flex flex-wrap items-center gap-2.5 sm:gap-3">
        <div className="rounded-xl bg-hours-soft px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-hours">Capacity released</div>
          <div className="tnum font-serif text-xl text-hours">+{fmtInt(item.capacityHours)} h/mo</div>
        </div>
        <Arrow />
        {[
          ['+1', 'new business'],
          [`+${b.employees}`, 'jobs'],
          [item.newIndustry ? '+1' : '0', 'new market'],
        ].map(([n, l], k) => (
          <motion.div key={l} initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.35 + k * 0.18 }} className="rounded-xl border border-line bg-white px-3 py-2">
            <div className="tnum text-lg font-semibold leading-none">{n}</div>
            <div className="mt-0.5 text-[11px] text-ink-faint">{l}</div>
          </motion.div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[13px] text-ink-soft">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: ind.color }} />
        <span>
          <span className="font-semibold text-ink">{b.name}</span>
          {item.first ? ' opens, staffed by people whose old tasks machines now do.' : ` · ${ind.name}`}
        </span>
      </div>
    </>
  );
}

/** Elegant temporary story cards at the top of the stage. */
export function EventOverlay({ ctrl, state }: { ctrl: SimulationController; state: UiState }) {
  const item = state.story[0];
  const running = state.playing;
  useEffect(() => {
    if (!item || !running) return;
    const t = window.setTimeout(() => ctrl.dismissStory(item.id), DURATION[item.kind] / Math.sqrt(state.speed));
    return () => window.clearTimeout(t);
  }, [item, running, ctrl, state.speed]);

  return (
    <div className="pointer-events-none flex justify-center px-3">
      <AnimatePresence mode="wait">
        {item && (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            className="panel pointer-events-auto relative w-full max-w-[560px] px-5 py-4 sm:px-6 sm:py-5"
            onClick={() => ctrl.dismissStory(item.id)}
          >
            {item.kind === 'milestone' && (
              <>
                <Kicker>Year {item.year}</Kicker>
                <div className="mt-1 font-serif text-[21px] leading-tight sm:text-[28px]">{item.title}</div>
                <div className="mt-1.5 text-[13px] leading-relaxed text-ink-soft sm:mt-2 sm:text-[14px]">{item.subtitle}</div>
              </>
            )}
            {item.kind === 'shock' && <ShockCard item={item} />}
            {item.kind === 'conversion' && <ConversionCard item={item} />}
            {running && (
              <motion.div className="absolute bottom-0 left-5 right-5 h-0.5 origin-left rounded-full bg-hours/50" initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: DURATION[item.kind] / 1000 / Math.sqrt(state.speed), ease: 'linear' }} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const TONE: Record<Toast['tone'], string> = { gov: 'bg-gov', hours: 'bg-hours', market: 'bg-tax', info: 'bg-ink-faint' };

export function Toasts({ ctrl, state }: { ctrl: SimulationController; state: UiState }) {
  useEffect(() => {
    if (!state.toasts.length || !state.playing) return;
    const first = state.toasts[0];
    const t = window.setTimeout(() => ctrl.dismissToast(first.id), 4200 / Math.sqrt(state.speed));
    return () => window.clearTimeout(t);
  }, [state.toasts, state.playing, state.speed, ctrl]);
  return (
    <div className="pointer-events-none flex w-[280px] flex-col items-end gap-2">
      <AnimatePresence initial={false}>
        {state.toasts.map((t) => (
          <motion.div key={t.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.35 }} className="panel pointer-events-auto w-full px-3 py-2.5">
            <div className="flex items-start gap-2">
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${TONE[t.tone]}`} />
              <div className="min-w-0">
                <div className="truncate text-[12.5px] font-semibold text-ink">{t.title}</div>
                <div className="truncate text-[11.5px] text-ink-faint">{t.detail}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
