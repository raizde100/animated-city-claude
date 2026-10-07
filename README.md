# The Productivity Flywheel

An animated, isometric miniature town that shows how a small local economy grows over twenty years:

> People work → businesses produce → people and businesses transact → income and profits → taxes → public
> investment in roads, energy, connectivity and education → higher productivity → **fewer hours needed for
> the same output → freed human hours start new businesses** → more transactions, more income, a larger tax
> base → the cycle accelerates.

Everything runs locally in the browser. There is no backend.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
npm run calibrate  # print the model's 20-year trajectory (try: npm run calibrate -- taxRate=0.35)
```

## What you see

- **The town.** About 25 houses, 10 businesses, a Town Hall, school, clinic, farms, a grain depot and a power
  station. People walk between homes, jobs and shops; trucks shuttle goods (stop-and-go on dirt roads, faster
  once roads are paved); buses run after the transit line opens.
- **Money flows.** Restrained particles: consumer payments (gold), supplier payments (teal), salaries (green),
  taxes (violet) and public investment (blue). Coins in the cash era become instant dots once digital payments
  arrive. A sale often triggers a tax payment that flies on to the Town Hall, whose treasury badge updates.
- **Freed human hours** (amber) are the signature colour. When a technology upgrade lets a business produce the
  same output with fewer hours, the released hours glow; when enough capacity accumulates, it flows into a new
  business that rises out of an empty plot, and the workers walk over.
- **Public investment** physically changes the town: paved roads sweep outward from the Town Hall, card terminals
  appear in shop doorways, broadband towers, a modern power plant, solar and wind farms, a logistics hub, a
  technical college, a university and a data centre.
- **Story moments** (Year 1 basic economy, the bakery’s 40h → 24h productivity shock, digital payments, roads,
  automation, hours released, the first new market, software, services overtaking agriculture) appear as
  temporary cards; milestones are also marked on the timeline.
- **The flywheel** is drawn around the town around Year 11 (or any time via the *Flywheel* button). Its nodes
  pulse when the town actually does the thing — a sale lights *More transactions*, a tax payment lights
  *More tax revenue*, a project opening lights *Better infrastructure*.
- **Year 20** zooms out and compares Year 1 with Year 20.

Interactions: play / pause (Space), 1× / 2× / 5×, restart, click the timeline to jump to a year, click buildings,
the Town Hall (or its treasury badge) and people to inspect them, and adjust tax rate, technology adoption,
infrastructure and education spending.

## Architecture

```
src/
  sim/                    Pure TypeScript economic model — no DOM, no React
    config.ts             Every tunable number (population, productivity effects, taxes, spending, …)
    industries.ts         14 industries, the 10 starting businesses, the catalogue of future businesses, tech upgrades
    projects.ts           Public investment projects (roads, digital, energy, education)
    map.ts                28×28 grid, road lattice, district templates and lots
    engine.ts             `Economy`: monthly step, emits events (businessFounded, techShock, projectCompleted, …)
    types.ts
  visual/
    iso.ts, shapes.tsx    Isometric projection and primitive shapes (boxes, roofs, cylinders, trees)
    paths.ts              Road network + shortest paths for walkers and vehicles
    agents.ts             Imperative SVG layer: people, vehicles, money particles, labels (60 fps, outside React)
    controller.ts         Runs the clock, feeds engine events to the agents and the UI store, drives the camera
  components/             Town, Building, Civic, Government, Business, Person, TransactionFlow, EconomicDashboard,
                          HoursFreedPanel, Timeline, EventOverlay, PolicyControls, Inspector, Flywheel, FinalScene
```

The engine advances in monthly steps and knows nothing about rendering. The controller converts simulated time
(≈ 8 s per year at 1×) into steps and forwards the engine’s events to the animation layer and the React UI.
Static scenery (ground, roads, buildings) is React-rendered SVG that re-renders only when the world changes;
everything that moves is updated imperatively each animation frame.

## The model, briefly

- Each business has a **productivity index** = 100 × road, digital and energy multipliers (weighted by how
  sensitive its industry is) × accumulated skills × its own technology multiplier.
- Mature businesses serve slowly growing demand, so when productivity rises they need **fewer labour hours**.
  Those workers join an idle **capacity pool**.
- When the pool can staff the next business in the catalogue — and the economy has reached the right stage
  (services after productivity ≈ 112; knowledge work after broadband + a technical college; research after a
  university) — a **new business** opens on the next free plot, opening new districts as needed.
- Taxes are a share of output. Running costs scale with population; the surplus funds an infrastructure track and
  an education track, according to the spending sliders. Projects take months to build.
- High taxes fund faster public investment but reduce private capital (slower technology adoption and business
  formation) and slow demand growth; low taxes do the reverse. Education acts slowly but compounds.
- “Human hours freed” is the number of monthly hours every business’s original output no longer requires.

All numbers are simulated and illustrative. Tune `src/sim/config.ts`, `industries.ts` and `projects.ts`, then
run `npm run calibrate` to see the new trajectory.
