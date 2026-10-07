import type { Policy } from '../sim/config';
import type { SimulationController, UiState } from '../visual/controller';
import { CloseIcon } from '../ui/icons';

const LEVEL = (v: number) => (v < 0.2 ? 'Low' : v < 0.45 ? 'Modest' : v < 0.7 ? 'Medium' : v < 0.9 ? 'High' : 'Very high');

interface SliderDef {
  key: keyof Policy;
  label: string;
  min: number;
  max: number;
  step: number;
  color: string;
  format: (v: number) => string;
  hint: (v: number) => string;
}

const SLIDERS: SliderDef[] = [
  {
    key: 'taxRate',
    label: 'Tax rate',
    min: 0,
    max: 0.4,
    step: 0.01,
    color: '#6E62B6',
    format: (v) => `${Math.round(v * 100)}%`,
    hint: (v) => (v >= 0.28 ? 'Faster public investment · less private capital for new technology' : v <= 0.1 ? 'More private capital · infrastructure arrives slowly' : 'Balanced: public projects and private upgrades both move'),
  },
  {
    key: 'techAdoption',
    label: 'Technology adoption',
    min: 0,
    max: 1,
    step: 0.01,
    color: '#EE7A3A',
    format: LEVEL,
    hint: (v) => (v >= 0.6 ? 'Businesses upgrade often → more hours freed' : 'Businesses keep old tools longer'),
  },
  {
    key: 'infrastructure',
    label: 'Infrastructure spending',
    min: 0,
    max: 1,
    step: 0.01,
    color: '#3D7BC0',
    format: LEVEL,
    hint: () => 'Roads, power and connectivity raise everyone’s productivity',
  },
  {
    key: 'education',
    label: 'Education spending',
    min: 0,
    max: 1,
    step: 0.01,
    color: '#8A6FB0',
    format: LEVEL,
    hint: () => 'Slow to start, but skills compound into long-term productivity',
  },
];

export function PolicyControls({ ctrl, state, onClose }: { ctrl: SimulationController; state: UiState; onClose?: () => void }) {
  return (
    <div className="panel w-full p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Policy</div>
          <div className="font-serif text-lg leading-tight">Run the town your way</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded-full p-1.5 text-ink-faint hover:bg-paper-deep hover:text-ink" aria-label="Close policy panel">
            <CloseIcon />
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-col gap-4">
        {SLIDERS.map((s) => {
          const v = state.policy[s.key];
          const pct = ((v - s.min) / (s.max - s.min)) * 100;
          return (
            <label key={s.key} className="block">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-medium text-ink">{s.label}</span>
                <span className="tnum text-[12px] font-semibold" style={{ color: s.color }}>
                  {s.format(v)}
                </span>
              </div>
              <input
                type="range"
                className="slider mt-2"
                min={s.min}
                max={s.max}
                step={s.step}
                value={v}
                style={{ ['--pct' as string]: `${pct}%`, ['--track-fill' as string]: s.color }}
                onChange={(e) => ctrl.setPolicy({ [s.key]: Number(e.target.value) } as Partial<Policy>)}
              />
              <div className="mt-1 text-[11px] leading-snug text-ink-faint">{s.hint(v)}</div>
            </label>
          );
        })}
      </div>
      <div className="mt-4 rounded-lg bg-paper-deep/70 px-3 py-2 text-[11px] leading-snug text-ink-soft">
        Changes apply from now on. Use <span className="font-semibold">Restart</span> to replay twenty years under the new policy.
      </div>
    </div>
  );
}
