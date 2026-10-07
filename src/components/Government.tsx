import type { Lot } from '../sim/map';
import { iso, shade } from '../visual/iso';
import { FLOW } from '../visual/palette';
import { Box, Shadow, Windows, faceRect } from '../visual/shapes';
import { fmtMoney } from '../ui/format';
import type { GovernmentState } from '../sim/types';
import { PanelHeader, Row } from './Business';

/** The Town Hall: where taxes arrive and public investment starts. */
export function TownHall({ lot, digital }: { lot: Lot; digital: number }) {
  const plinth = { i: lot.i + 0.12, j: lot.j + 0.12, w: 1.76, d: 1.76 };
  const b = { i: lot.i + 0.3, j: lot.j + 0.35, w: 1.4, d: 1.2 };
  const h = 30;
  const cols = [];
  for (let k = 0; k < 6; k++) {
    const u = 0.15 + k * 0.22;
    cols.push(<polygon key={k} points={faceRect(b, 'L', u - 0.035, u + 0.035, 7, h - 1)} fill="#FBF8F1" />);
  }
  const l = iso(b.i + 0.05, b.j + b.d, h);
  const r = iso(b.i + b.w - 0.05, b.j + b.d, h);
  const m = iso(b.i + b.w / 2, b.j + b.d, h + 12);
  const c = iso(b.i + b.w / 2, b.j + b.d / 2, h);
  const flag = iso(b.i + b.w / 2, b.j + b.d / 2, h + 34);
  return (
    <g>
      <Shadow {...b} h={h + 20} />
      <Box {...plinth} h={5} color="#D8CDBA" />
      <Box {...b} z={5} h={h} color="#EFE7D8" />
      <polygon points={faceRect(b, 'L', 0.06, b.w - 0.06, 7, h - 1)} fill={shade('#EFE7D8', -0.2)} />
      {cols}
      <Windows b={b} face="R" rows={2} cols={4} z0={9} floorH={11} winH={6} color="#8EA9B6" />
      <polygon points={`${l.x},${l.y - 5} ${r.x},${r.y - 5} ${m.x},${m.y - 5}`} fill="#F4EEE2" stroke="#CFC3AE" strokeWidth={0.8} />
      {/* dome */}
      <rect x={c.x - 14} y={c.y - 5 - 8} width={28} height={8} fill="#E4DACA" />
      <path d={`M${c.x - 14},${c.y - 13} A14,15 0 0 1 ${c.x + 14},${c.y - 13} Z`} fill={FLOW.tax.color} opacity={0.88} />
      <path d={`M${c.x},${c.y - 28} A14,15 0 0 1 ${c.x + 14},${c.y - 13} L${c.x},${c.y - 13} Z`} fill={shade(FLOW.tax.color, -0.2)} opacity={0.9} />
      <line x1={flag.x} y1={flag.y + 6} x2={flag.x} y2={flag.y - 6} stroke="#5C5850" strokeWidth={1} />
      <polygon points={`${flag.x},${flag.y - 6} ${flag.x + 11},${flag.y - 3} ${flag.x},${flag.y}`} fill={FLOW.tax.color} className="flag" />
      {digital >= 1 && <circle cx={c.x + 18} cy={c.y - 10} r={1.8} fill="#46D3C0" className="blink-soft" />}
    </g>
  );
}

/** Floating treasury badge above the Town Hall. */
export function TreasuryBadge({ lot, treasury, pulseKey, onClick }: { lot: Lot; treasury: number; pulseKey: number; onClick: () => void }) {
  const p = iso(lot.i + 1, lot.j + 1, 96);
  const text = `Treasury ${fmtMoney(treasury)}`;
  const w = 8 + text.length * 6.3;
  return (
    <g
      transform={`translate(${p.x},${p.y})`}
      style={{ cursor: 'pointer' }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <line x1={0} y1={8} x2={0} y2={30} stroke={FLOW.tax.color} strokeWidth={1} opacity={0.4} />
      <g key={pulseKey} className="badge-pulse">
        <rect x={-w / 2} y={-11} width={w} height={20} rx={10} fill="#FFFFFF" stroke={FLOW.tax.color} strokeWidth={1} opacity={0.96} />
        <circle cx={-w / 2 + 11} cy={-1} r={3.5} fill={FLOW.tax.color} />
        <text x={-w / 2 + 19} y={3} fontSize={11} fontFamily="Inter, sans-serif" fontWeight={600} fill="#2B2A28">
          {text}
        </text>
      </g>
    </g>
  );
}

const CATEGORY_LABEL: Record<string, string> = { roads: 'Roads & logistics', digital: 'Digital', energy: 'Energy', education: 'Education' };

/** Town Hall details: where the money comes from and where it goes. */
export function GovernmentPanel({ gov, taxRate }: { gov: GovernmentState; taxRate: number }) {
  const building = gov.projects.filter((p) => !p.done);
  const done = gov.projects.filter((p) => p.done);
  return (
    <div>
      <PanelHeader kicker="Government" title="Town Hall" color={FLOW.tax.color} />
      <div className="mt-3">
        <Row label="Tax revenue" value={`${fmtMoney(gov.taxRevenue)}/yr`} accent={FLOW.tax.color} />
        <Row label="Tax rate" value={`${Math.round(taxRate * 100)}%`} />
        <Row label="Running costs" value={`${fmtMoney(gov.operations)}/yr`} />
        <Row label="Treasury balance" value={fmtMoney(gov.treasury)} />
        <Row label="Infrastructure invested" value={fmtMoney(gov.investedTotal)} accent={FLOW.gov.color} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {(['roads', 'digital', 'energy', 'education'] as const).map((c) => (
          <div key={c} className="rounded-lg bg-paper-deep/60 px-2.5 py-1.5">
            <div className="text-[10.5px] text-ink-faint">{CATEGORY_LABEL[c]}</div>
            <div className="mt-1 flex gap-1">
              {[1, 2, 3].map((l) => (
                <span key={l} className={`h-1.5 flex-1 rounded-full ${gov.levels[c] >= l ? 'bg-gov' : 'bg-white'}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
      {building.length > 0 && (
        <div className="mt-3 text-[12px] text-ink-soft">
          <span className="font-semibold text-gov">Building now:</span> {building.map((p) => p.name).join(', ')}
        </div>
      )}
      {done.length > 0 && (
        <div className="mt-2 text-[11.5px] leading-snug text-ink-faint">Completed: {done.map((p) => p.name).join(' · ')}</div>
      )}
    </div>
  );
}
