import { useState } from 'react';
import { SIM_CONFIG } from '../sim/config';
import type { SimulationController, UiState } from '../visual/controller';
import { CycleIcon, PauseIcon, PlayIcon, RestartIcon } from '../ui/icons';

const YEARS = SIM_CONFIG.totalYears;

/** Play / pause / speed / restart and a scrubbable Year 1 → 20 track with milestone markers. */
export function Timeline({ ctrl, state }: { ctrl: SimulationController; state: UiState }) {
  const [hover, setHover] = useState<{ x: number; text: string } | null>(null);
  const year = Math.min(YEARS, Math.floor(state.yearFloat));
  const seen = new Set<string>();
  const markers = state.milestoneLog.filter((m) => {
    if (m.month === 0 || seen.has(m.title)) return false;
    seen.add(m.title);
    return true;
  });

  const seekFromEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    ctrl.seek(1 + Math.round(t * (YEARS - 1)));
  };

  return (
    <div className="panel flex items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-4">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => (state.finished ? ctrl.restart() : ctrl.toggle())}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-white transition hover:scale-105 active:scale-95"
          aria-label={state.playing ? 'Pause' : 'Play'}
        >
          {state.playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <div className="flex rounded-full bg-paper-deep p-0.5" role="group" aria-label="Simulation speed">
          {([1, 2, 5] as const).map((s) => (
            <button key={s} onClick={() => ctrl.setSpeed(s)} className={`tnum rounded-full px-2.5 py-1 text-xs font-semibold transition ${state.speed === s ? 'bg-white text-ink shadow-sm' : 'text-ink-faint hover:text-ink'}`}>
              {s}×
            </button>
          ))}
        </div>
        <button onClick={() => ctrl.restart()} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-paper-deep hover:text-ink" aria-label="Restart" title="Restart">
          <RestartIcon />
        </button>
        <button
          onClick={() => ctrl.setFlywheel(!state.flywheel)}
          className={`hidden h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition sm:flex ${state.flywheel ? 'bg-hours text-white' : 'text-ink-soft hover:bg-paper-deep hover:text-ink'}`}
          title="Show the economic flywheel"
        >
          <CycleIcon /> Flywheel
        </button>
      </div>

      <div className="relative min-w-0 flex-1">
        <div className="mb-1 flex justify-between text-[10px] font-medium uppercase tracking-wider text-ink-faint">
          <span>Year 1</span>
          <span className="hidden sm:inline">Year 5</span>
          <span>Year 10</span>
          <span className="hidden sm:inline">Year 15</span>
          <span>Year 20</span>
        </div>
        <div className="group relative h-5 cursor-pointer" onClick={seekFromEvent} onMouseLeave={() => setHover(null)} title="Click to jump to a year">
          <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-paper-deep" />
          <div className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-ink transition-[width] duration-150" style={{ width: `${state.progress * 100}%` }} />
          {Array.from({ length: YEARS + 1 }, (_, k) => (
            <div key={k} className="absolute top-1/2 h-1 w-px -translate-y-1/2 bg-white/80" style={{ left: `${(k / YEARS) * 100}%` }} />
          ))}
          {markers.map((m) => {
            const x = (m.month / (YEARS * 12)) * 100;
            return (
              <div
                key={m.title}
                className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-hours shadow-sm transition hover:scale-125"
                style={{ left: `${x}%` }}
                onMouseEnter={() => setHover({ x, text: `Year ${m.year} · ${m.title}` })}
              />
            );
          })}
          <div className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-white shadow" style={{ left: `${state.progress * 100}%` }} />
          {hover && (
            <div className="pointer-events-none absolute bottom-6 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] text-white shadow" style={{ left: `${Math.min(85, Math.max(15, hover.x))}%` }}>
              {hover.text}
            </div>
          )}
        </div>
      </div>

      <div className="hidden text-right sm:block">
        <div className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">Year</div>
        <div className="tnum font-serif text-2xl leading-none">{year}</div>
      </div>
    </div>
  );
}
