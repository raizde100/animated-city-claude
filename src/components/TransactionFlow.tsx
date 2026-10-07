import { useState } from 'react';
import { FLOW, type FlowKind } from '../visual/palette';

/** Glyph matching an animated money particle (the moving ones are drawn by the agent layer). */
export function FlowDot({ kind, digital = true }: { kind: FlowKind; digital?: boolean }) {
  const c = FLOW[kind].color;
  return (
    <svg width="22" height="10" viewBox="0 0 22 10" aria-hidden>
      {digital ? (
        <>
          <circle cx="4" cy="5" r="1.4" fill={c} opacity="0.25" />
          <circle cx="9" cy="5" r="1.9" fill={c} opacity="0.45" />
          <circle cx="16" cy="5" r={kind === 'hours' ? 3.6 : 3} fill={c} stroke="#fff" strokeWidth="0.8" />
        </>
      ) : (
        <>
          <ellipse cx="14" cy="5.6" rx="4" ry="3.4" fill={c} opacity="0.8" />
          <ellipse cx="14" cy="4.6" rx="4" ry="3.4" fill={c} />
        </>
      )}
    </svg>
  );
}

/** Legend for the money flows on the map. */
export function FlowLegend({ digital }: { digital: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="panel px-3 py-2">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
        Money & time flows <span className="text-ink-faint">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="mt-1.5 flex flex-col gap-1">
          {(Object.keys(FLOW) as FlowKind[]).map((k) => (
            <div key={k} className="flex items-center gap-2 text-[11.5px]">
              <FlowDot kind={k} digital={digital || k === 'hours' || k === 'gov'} />
              <span className="font-medium text-ink">{FLOW[k].label}</span>
              <span className="hidden text-ink-faint 2xl:inline">{FLOW[k].desc}</span>
            </div>
          ))}
          <div className="mt-1 text-[10.5px] text-ink-faint">{digital ? 'Digital payments: instant dots' : 'Cash era: slow coins'}</div>
        </div>
      )}
    </div>
  );
}
