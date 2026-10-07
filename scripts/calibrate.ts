/** Prints the model trajectory so the config can be tuned: `npm run calibrate`. */
import { DEFAULT_POLICY, type Policy } from '../src/sim/config';
import { Economy } from '../src/sim/engine';

const overrides = Object.fromEntries(process.argv.slice(2).map((a: string) => a.split('=')).map(([k, v]: string[]) => [k, Number(v)])) as Partial<Policy>;
const e = new Economy({ ...DEFAULT_POLICY, ...overrides });
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const row = () => {
  const m = e.metrics;
  console.log(
    `Y${m.year.toFixed(0).padStart(2)} gdp ${fmt(m.gdp).padStart(10)} wkr ${m.workers} emp ${m.employed} idle ${m.idleWorkers} biz ${m.businesses} ind ${m.industries} prod ${m.avgProductivity.toFixed(0)} freed ${fmt(m.hoursFreedRate)}h/mo tot ${fmt(m.hoursFreedTotal)} tax ${fmt(m.taxRevenue)} tre ${fmt(m.treasury)} inv ${fmt(m.govInvestmentTotal)} svc ${(m.servicesShare * 100).toFixed(0)}% st ${m.stage} L ${JSON.stringify(e.gov.levels)} gdp/w ${fmt(m.gdpPerWorker)}`,
  );
};
row();
for (const ev of e.drainEvents()) if (ev.type === 'milestone') console.log('   ★', ev.title);
while (!e.finished) {
  e.step();
  for (const ev of e.drainEvents()) {
    const y = e.year.toFixed(2);
    if (ev.type === 'milestone') console.log(`   ★ ${y}`, ev.title);
    if (ev.type === 'projectCompleted') console.log(`   ▣ ${y}`, ev.project.name);
    if (ev.type === 'businessFounded') console.log(`   + ${y}`, ev.business.name, ev.newIndustry ? '(new market)' : '');
    if (ev.type === 'techShock' && ev.info.featured) console.log(`   ⚙ ${y}`, ev.info.businessName, ev.info.upgrade, ev.info.hoursBefore, '→', ev.info.hoursAfter);
    if (ev.type === 'districtUnlocked') console.log(`   ◇ ${y} district`, ev.district);
    if (ev.type === 'stageUnlocked') console.log(`   ▲ ${y} stage`, ev.stage);
  }
  if (e.month % 12 === 0) row();
}
