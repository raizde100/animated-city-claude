import { useEffect, useRef } from 'react';
import type { FlywheelSignal } from '../visual/agents';
import type { SimulationController } from '../visual/controller';
import { FLOW } from '../visual/palette';

export const FLYWHEEL_STEPS: { label: string; signal: FlywheelSignal; color: string }[] = [
  { label: 'Higher productivity', signal: 'productivity', color: FLOW.hours.color },
  { label: 'More output per hour', signal: 'output', color: FLOW.supplier.color },
  { label: 'Human hours freed', signal: 'hours', color: FLOW.hours.color },
  { label: 'New businesses', signal: 'business', color: FLOW.hours.color },
  { label: 'More transactions', signal: 'transactions', color: FLOW.consumer.color },
  { label: 'Higher income', signal: 'income', color: FLOW.salary.color },
  { label: 'More tax revenue', signal: 'tax', color: FLOW.tax.color },
  { label: 'More public investment', signal: 'investment', color: FLOW.gov.color },
  { label: 'Better infrastructure', signal: 'infrastructure', color: FLOW.gov.color },
];

const CX = 0;
const CY = 455;
const RX = 860;
const RY = 445;

function pos(k: number, n = FLYWHEEL_STEPS.length) {
  const a = (-90 + (360 / n) * k) * (Math.PI / 180);
  return { x: CX + RX * Math.cos(a), y: CY + RY * Math.sin(a), a };
}

/** The flywheel drawn around the town: an animated loop whose nodes light up when the town does the thing. */
export function FlywheelRing({ active, ctrl }: { active: boolean; ctrl: SimulationController }) {
  const nodeRefs = useRef<(SVGGElement | null)[]>([]);
  const orbRef = useRef<SVGGElement>(null);
  const groupRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const off = ctrl.onSignal((s) => {
      const k = FLYWHEEL_STEPS.findIndex((f) => f.signal === s);
      const node = nodeRefs.current[k];
      if (!node) return;
      node.classList.remove('fw-pulse');
      // restart the CSS animation
      void node.getBoundingClientRect();
      node.classList.add('fw-pulse');
    });
    return () => {
      off();
    };
  }, [ctrl]);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    let t = 0;
    const tick = (now: number) => {
      t += (now - last) / 1000;
      last = now;
      const ang = (-90 + t * 26) * (Math.PI / 180);
      const x = CX + RX * Math.cos(ang);
      const y = CY + RY * Math.sin(ang);
      orbRef.current?.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`);
      const n = FLYWHEEL_STEPS.length;
      const step = Math.floor(((t * 26) / 360) * n) % n;
      nodeRefs.current.forEach((g, k) => g?.classList.toggle('fw-active', k === step));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return (
    <g ref={groupRef} className={`flywheel ${active ? 'on' : ''}`} pointerEvents="none">
      <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="none" stroke="#2B2A28" strokeOpacity={0.12} strokeWidth={10} />
      <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="none" stroke={FLOW.hours.color} strokeWidth={2.2} strokeDasharray="10 16" className="fw-flow" />
      {FLYWHEEL_STEPS.map((_, k) => {
        const p = pos(k);
        const nx = pos(k + 0.5);
        const ang = (Math.atan2(nx.y - p.y, nx.x - p.x) * 180) / Math.PI;
        return (
          <g key={`arrow-${k}`} transform={`translate(${nx.x},${nx.y}) rotate(${ang})`}>
            <path d="M-7,-6 L5,0 L-7,6" fill="none" stroke={FLOW.hours.color} strokeWidth={2.4} strokeLinecap="round" />
          </g>
        );
      })}
      {FLYWHEEL_STEPS.map((s, k) => {
        const p = pos(k);
        const w = s.label.length * 10.4 + 34;
        return (
          <g key={s.label} ref={(el) => { nodeRefs.current[k] = el; }} transform={`translate(${p.x},${p.y})`} className="fw-node">
            <rect x={-w / 2} y={-19} width={w} height={38} rx={19} fill="#FFFFFF" stroke={s.color} strokeWidth={2} />
            <circle cx={-w / 2 + 19} cy={0} r={6} fill={s.color} />
            <text x={-w / 2 + 32} y={6.5} fontSize={17} fontWeight={600} fontFamily="Inter, sans-serif" fill="#2B2A28" letterSpacing={0.3}>
              {s.label.toUpperCase()}
            </text>
          </g>
        );
      })}
      <g ref={orbRef}>
        <circle r={22} fill="url(#glowAmber)" />
        <circle r={7} fill={FLOW.hours.color} stroke="#fff" strokeWidth={2} />
      </g>
      <text x={CX} y={CY + RY + 62} textAnchor="middle" fontSize={30} fontFamily="Fraunces, Georgia, serif" fill="#2B2A28">
        The economic flywheel
      </text>
    </g>
  );
}
