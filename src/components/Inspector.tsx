import { motion } from 'framer-motion';
import { LOT_BY_ID } from '../sim/map';
import { ALL_PROJECTS } from '../sim/projects';
import type { SimulationController, UiState } from '../visual/controller';
import { CloseIcon } from '../ui/icons';
import { BusinessPanel, PanelHeader, Row } from './Business';
import { GovernmentPanel } from './Government';
import { WorkerPanel } from './Person';

const CIVIC: Record<string, { title: string; kicker: string; text: string; category?: 'education' | 'energy' | 'digital' | 'roads' }> = {
  school: { kicker: 'Public service', title: 'Town School', text: 'Funded by taxes. Every education upgrade adds skills that compound into productivity — slowly at first.', category: 'education' },
  clinic: { kicker: 'Public service', title: 'Town Clinic', text: 'Healthy workers are productive workers. Its running costs are paid from the treasury.' },
  power: { kicker: 'Utility', title: 'Power Station', text: 'Reliable, cheaper energy lets farms, bakeries and factories run more machines per worker.', category: 'energy' },
  solar: { kicker: 'Utility', title: 'Solar Field', text: 'Cheap clean electricity lowers costs for every energy-hungry business.', category: 'energy' },
  wind: { kicker: 'Utility', title: 'Wind Farm', text: 'Abundant power removes capacity limits on advanced manufacturing.', category: 'energy' },
  logistics: { kicker: 'Infrastructure', title: 'Logistics Hub', text: 'Freight is consolidated here: faster deliveries and lower logistics costs.', category: 'roads' },
  college: { kicker: 'Education', title: 'Technical College', text: 'Trains technicians, analysts and programmers — a precondition for the software industry.', category: 'education' },
  university: { kicker: 'Education', title: 'Research University', text: 'Engineers, scientists and founders: the seed of research labs and startups.', category: 'education' },
  datacenter: { kicker: 'Digital', title: 'Data Centre', text: 'Automates back-office work across town: invoices, payroll and inventory run themselves.', category: 'digital' },
  tower: { kicker: 'Digital', title: 'Broadband Tower', text: 'Town-wide connectivity makes remote services and digital businesses possible.', category: 'digital' },
};

export function Inspector({ ctrl, state }: { ctrl: SimulationController; state: UiState }) {
  const sel = state.selection;
  if (!sel) return null;
  let body: React.ReactNode = null;
  if (sel.kind === 'business') {
    const b = state.businesses.find((x) => x.id === sel.id);
    if (b) body = <BusinessPanel b={b} />;
  } else if (sel.kind === 'person') {
    const info = ctrl.agents?.personInfo(sel.id);
    const job = state.businesses.find((b) => b.id === info?.job);
    body = <WorkerPanel id={sel.id} job={job} taxRate={state.policy.taxRate} />;
  } else if (sel.id === 'townhall') {
    body = <GovernmentPanel gov={state.gov} taxRate={state.policy.taxRate} />;
  } else {
    const key = sel.id.startsWith('tower') ? 'tower' : LOT_BY_ID[sel.id]?.kind ?? sel.id;
    const c = CIVIC[key];
    if (c) {
      const projects = ALL_PROJECTS.filter((p) => p.category === c.category);
      body = (
        <div>
          <PanelHeader kicker={c.kicker} title={c.title} />
          <div className="mt-2 text-[13px] leading-relaxed text-ink-soft">{c.text}</div>
          {c.category && (
            <div className="mt-3">
              {projects.map((p) => {
                const st = state.gov.projects.find((q) => q.id === p.id);
                return <Row key={p.id} label={p.name} value={st ? (st.done ? 'Built' : 'Under construction') : `$${Math.round(p.cost / 1000)}k`} accent={st?.done ? '#3D7BC0' : undefined} />;
              })}
            </div>
          )}
        </div>
      );
    }
  }
  if (!body) return null;
  return (
    <motion.div key={`${sel.kind}-${sel.id}`} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="panel relative w-full p-4">
      <button onClick={() => ctrl.select(null)} className="absolute right-3 top-3 rounded-full p-1.5 text-ink-faint hover:bg-paper-deep hover:text-ink" aria-label="Close details">
        <CloseIcon />
      </button>
      {body}
    </motion.div>
  );
}
