# Implementation progress (restore point)

Source of truth for what is done and what is missing while implementing [PLAN.md](PLAN.md).
If a session breaks: read this file, check `git status`, resume from the first unchecked step.
Each step is done by a subagent; the model used is noted. Mark `[x]` only after the orchestrator has verified the result.

## Orchestration

| Step | Scope (PLAN.md)                                                                                                      | Model               | Status |
| ---- | -------------------------------------------------------------------------------------------------------------------- | ------------------- | ------ |
| 1    | Phase 1 – project setup (Vite, TS, Tailwind, shadcn, Vitest, oxlint plugins, scripts)                                | sonnet              | [x]    |
| 2    | Phase 2 – finance engine `src/lib/finance` + Vitest tests                                                            | opus                | [x]    |
| 3    | Phases 3+4 – state/persistence (zod, localStorage, import/export) + layout + input panel + InfoPopover + NumberField | sonnet              | [x]    |
| 4a   | Phase 5 views 2+3 – price×duration matrix, max price per duration chart                                              | opus                | [x]    |
| 4b   | Phase 5 views 1+4+5 – summary cards & traffic lights, down payment ↔ rata, money bar                                 | sonnet              | [x]    |
| 4c   | Phase 5 view 6 – amortization chart + expandable table                                                               | sonnet              | [x]    |
| 4d   | Phase 5 view 7 – "Come funziona" content section                                                                     | haiku               | [x]    |
| 5    | Wire views into App + Phase 6 polish (dark mode, responsive, empty states, it-IT format)                             | sonnet              | [x]    |
| 6    | Final review (lint, format, typecheck, test, build, control values, browser check)                                   | opus + orchestrator | [x]    |

## Shared contracts (decided by orchestrator)

- Finance engine public API lives in `src/lib/finance/index.ts` (re-exports). UI imports only from there.
- Shared types (`HouseInputs`, `CountryPreset`, `DownPaymentChoice`, `Light`, `Binding`) live in `src/lib/finance/types.ts` (orchestrator-owned). Zod schema mirroring `HouseInputs` + `version` in `src/lib/state/schema.ts`.
- Presets: `COUNTRY_PRESETS: Record<Country, CountryPreset>` and `DEFAULT_INPUTS: HouseInputs` exported from `src/lib/finance/presets.ts` (step 2 creates it; step 3 imports it).
- `InfoPopover` component (`src/components/info-popover.tsx`) = the ⓘ button opening a shadcn Popover.
- Formatting helpers in `src/lib/format.ts` (`formatEur`, `formatPct`, `parseItNumber`).
- Each view is one file in `src/components/views/`, takes `{ inputs, scenario, setInputs }` style props as defined in step 3 notes.

## Log / notes

<!-- Append one line per finished step: date, step, model, key files, anything the next step must know. -->

2026-11-09 step 1 (sonnet): scaffold done. Vite 8.3.6, React 19, TS 7 (native, `tsc -b`), Tailwind 4 (@tailwindcss/vite), shadcn CLI latest with style `radix-nova` (radix, neutral, CSS vars, lucide, Geist font) via components.json; globals/theme live in `src/index.css` (dark via `.dark` class variant); UI in `src/components/ui/` (card, slider, input, popover, tooltip, switch, select, table, chart, button, label, tabs, collapsible, badge), `cn` in `src/lib/utils.ts`; chart component is `src/components/ui/chart.tsx` (ChartContainer/ChartTooltip/ChartConfig over Recharts). Vitest 5.1.0 configured in `vite.config.ts` (env node, passWithNoTests, include `src/**/*.test.ts` only: use .test.tsx? then widen include). Tooltip needs a TooltipProvider at app root. Zod 4.6.7, recharts installed. oxlint plugins react+vitest, env.browser; lint/format/typecheck/test/build all green; no sample tests kept.
2026-11-09 orchestrator: replaced stray npm package `cn` with clsx+tailwind-merge `cn` in `src/lib/utils.ts`; wrote `src/lib/finance/types.ts`. Step 1 verified -> [x]. Steps 2 and 3 launched in parallel.
2026-11-09 step 2 (opus): finance engine in `src/lib/finance/` — `mortgage.ts` (monthlyFactor, installment + internal EPS/helpers), `scenario.ts` (computeScenario, Scenario, also exports installmentLight/combineLights), `amortization.ts`, `max-price.ts` (maxAffordablePrice, maxPriceCurve), `matrix.ts` (matrixPrices, priceMatrix), `sweep.ts` (downPaymentSweep + `DownPaymentPoint` interface = the contract's inline type), `index.ts` re-exports all + types + presets; `test-helpers.ts` for tests. 102 Vitest tests in 6 `*.test.ts` files; lint/format/typecheck green. All PLAN control values match the formulas (no discrepancy: 959.19/435.57/3055.57/1387.55, interest 18103/59806/57669/190517, capital limit 442307.7, max 278090.4 @25y income-bound). Behaviour notes: capital check is red when C − costs − A − F < min down payment (≡ max ≥ min except when min = 0 and extras exceed capital, e.g. price 0 with C < A + F → red with missing capital); comparisons use 1e-9 tolerance (ratio exactly s → yellow, exactly s − 5 pp → green); totalInterest = 0 and installmentToIncome = 0 (not null) when no mortgage and income present; overall = "na" only if all checks na (never, capital is always evaluated); maxAffordablePrice with K ≤ 0 returns capitalLimit 0 and incomeLimit 0 (null if no income); LTV 100% + costs 0 denominator guarded to stay finite; matrixPrices keeps the center price exact (not rounded), dedupes and drops ≤ 0 rows (so fewer than 9 rows for small centers); amortizationSchedule returns [] for loan ≤ 0.

### Finance engine API (contract, implemented in step 2, exported from `src/lib/finance/index.ts`)

```ts
monthlyFactor(annualRate: number, years: number): number            // k; rate 0 -> 1/n
installment(loan: number, annualRate: number, years: number): number // M = L*k
computeScenario(inputs: HouseInputs): Scenario
interface Scenario {
  purchaseCosts: number; minDownPayment: number; maxDownPayment: number;
  downPayment: number;            // chosen, clamped; = min when capital insufficient
  capitalSufficient: boolean;     // max >= min
  loan: number; needsMortgage: boolean;
  installment: number; totalInterest: number; totalRepaid: number; totalHouseCost: number;
  installmentToIncome: number | null; effectiveLtv: number;
  residualLiquidity: number;      // may be negative
  missingCapital: number;         // max(0, -residualLiquidity)
  checks: { capital: Light; installment: Light };
  overall: Light; incomplete: boolean; // incomplete = income missing
}
amortizationSchedule(loan: number, annualRate: number, years: number): YearRow[]
interface YearRow { year: number; principal: number; interest: number; remaining: number }
maxAffordablePrice(inputs: HouseInputs, years: number, threshold?: number): MaxPrice
interface MaxPrice { price: number; binding: Binding | null; capitalLimit: number; incomeLimit: number | null }
maxPriceCurve(inputs: HouseInputs, minYears?: number /*5*/, maxYears?: number /*40*/): MaxPricePoint[]
interface MaxPricePoint { years: number; maxPrice: number; comfortablePrice: number; binding: Binding | null }
downPaymentSweep(inputs: HouseInputs, steps?: number /*~21*/): Array<{ downPayment: number; installment: number; totalInterest: number; residualLiquidity: number }>
priceMatrix(inputs: HouseInputs, prices: number[], durations: number[]): MatrixCell[][]
interface MatrixCell { price: number; years: number; installment: number; totalInterest: number; installmentToIncome: number | null; overall: Light; loan: number }
matrixPrices(centerPrice: number, spread?: number /*0.5*/, rows?: number /*9*/): number[] // step rounded to 5k/10k
// plus re-exports of types.ts and presets.ts
```

2026-11-09 orchestrator: wrote src/lib/finance/presets.ts. Step 2 (opus) and step 3 (sonnet) running in parallel (finance/* vs state/components/App).
2026-11-09 step 3 (sonnet): done. Files: `src/lib/format.ts` (formatEur/formatPct/formatNumberIt/parseItNumber; comma = decimal, dot+exactly 3 digits or multiple dots = thousands, so "1.500" = 1500), `src/lib/state/{schema,storage}.ts` (zod `parseState`, `serializeState`, key `quando-compro-casa:v1`, `loadInputs/saveInputs/exportJson/importJson`), `src/hooks/use-house-inputs.ts`, `src/components/{info-popover,number-field,input-panel,theme-toggle}.tsx`, `src/App.tsx`. API for views: in App, `const api = useHouseInputs()` -> `{ inputs, setInputs, update(partial), setCountry, resetCountryPreset, importFromFile, exportToFile }` (type `HouseInputsApi`); `const scenario = computeScenario(api.inputs)`; pass `{ inputs, scenario, update }` (or `setInputs`) as props to each view. To load a matrix cell: `update({ price, years })`. Reusable: `<InfoPopover title="...">rich children</InfoPopover>` for every card/chart ⓘ; `<NumberField>`/`<SliderField>` (percent mode uses fractions). Views go in the `<main>` of App.tsx at `{/* views go here: step 4 */}`, replacing the provisional "Riepilogo" debug card; header/TooltipProvider/theme toggle (`.dark` on html, pref in localStorage `quando-compro-casa:theme`) already in place. Vitest still node-only (`*.test.ts`). Not browser-tested.
2026-11-09 orchestrator: steps 2+3 verified (102 tests, lint/format/typecheck/build green) -> [x]. Wrote `src/components/views/types.ts` (ViewProps). Step 4 views launched in parallel: each agent creates only its own files in src/components/views/; orchestrator wires App.tsx in step 5.
2026-11-09 step 4c (sonnet): done. `src/components/views/amortization.tsx` exports `AmortizationView(props: ViewProps)`: ComposedChart (stacked bars principal+interest, line remaining on right axis, --chart-N/--foreground colors), Collapsible annual Table with totals row, empty state when no mortgage. Not browser-tested.
2026-11-09 step 4d (haiku): created how-it-works.tsx (HowItWorks)
2026-11-09 orchestrator TODO for step 5: --chart-1..5 in src/index.css are grayscale -> give real hues (light+dark) and re-check view color picks (amortization uses chart-1/2).
2026-11-09 step 4b (sonnet): added src/components/views/{traffic-light,summary-cards,down-payment-chart,money-bar}.tsx. Exports: `TrafficLight({light,label?,className?})` + `lightLabel` (traffic-light), `SummaryCards`, `DownPaymentChart`, `MoneyBar` (all take ViewProps). Not wired into App.tsx; not browser-tested. lint/typecheck/format/build green.
2026-11-09 step 4a (opus): `src/components/views/price-duration-matrix.tsx` exports `PriceDurationMatrix(props: ViewProps)` (card "Matrice prezzo × durata": local ±25/50/75% range toggle, default ±50%; cells are buttons coloured by `overall`, current price+years ringed, desktop Tooltip with rata/interessi/rata-reddito/mutuo, click → `update({ price, years })`; empty state for price ≤ 0; table in overflow-x-auto, compact "200k €" row labels on mobile; legend). `src/components/views/max-price-chart.tsx` exports `MaxPriceChart(props: ViewProps)` (card "Prezzo massimo per durata": LineChart 5–40 y, solid maxPrice + dashed comfortablePrice, dot shape = binding (square capital / circle income), ReferenceLines for capital limit, current years, current price; summary sentence at current duration; "Oltre N anni…" note; income-missing note; K ≤ 0 empty state). Both need TooltipProvider (already in App) and use only `update`. Colors: chart lines use --chart-4 (light) / --chart-1 (dark) and --chart-2 (theme vars are greyscale); matrix uses emerald/amber/red Tailwind tints. SSR smoke-rendered with control values (959/436 €, max 278.090 € @25y income-bound). Not browser-tested (not wired in App yet).
2026-11-09 orchestrator: step 4 (a-d) verified green -> [x]. Step 5 (sonnet) launched: wiring App.tsx + chart palette + phase 6 polish + browser check.
2026-11-09 step 5 (sonnet): wired all views into App.tsx (anchor nav + sections riepilogo/matrice/prezzo-massimo/anticipo/ammortamento/come-funziona; MoneyBar right after SummaryCards; scenario via useMemo; removed provisional card). Palette: --chart-1..5 now blue/orange/teal/violet/magenta (light+dark oklch) in src/index.css; amortization (principal c1, interest c2), max-price (maxPrice c1, comfortable c2, price line c3), down-payment (installment c1, interest c2, liquidity c3) all use `color: "var(--chart-N)"` in ChartConfig; traffic lights keep emerald/amber/red. Verified: SSR smoke test (temp, deleted) rendering every view for default/capital 0/price 0/no income/all zero/rate 0/huge price/no mortgage -> no NaN/Infinity/undefined; default mutuo 97.000 EUR, rata 485,60 EUR, interessi 48.681 EUR (matches UI); browser pane at 375px: scrollWidth == 375 (no horizontal scroll), no console errors, dark mode renders with distinct chart colors. NOT verified: visual check of every view in light mode / each empty state in the real browser (only SSR text check), interactions (matrix click, tooltips), other viewports, per-element info-icon audit not redone (step 4 views already include InfoPopover).
2026-11-09 orchestrator: step 5 verified green -> [x]. Step 6 review: opus code review agent + orchestrator browser interaction test.
2026-11-09 orchestrator browser test OK: it-IT parse 400.000, matrix values = control values, cell click loads price+years, autosave+reload persists, 375px dark no h-scroll, no console errors. Waiting on opus review findings.

### Step 6 review findings (opus) — fix list (step 6b, sonnet). Tick when fixed.

- [x] R1 bug: down payment slider can't reach exact max (Radix step rounding) -> can't return to {mode:"max"} (number-field.tsx SliderField, input-panel.tsx)
- [x] R2 bug: money-bar double counts missing capital (total = capital + 2*missing) (money-bar.tsx)
- [x] R3 bug: Esc in NumberField commits instead of cancel (number-field.tsx)
- [x] R4 minor: focus+blur without typing rounds stored value (number-field.tsx)
- [x] R5 plan gap: matrix cell click must also set downPayment {mode:"max"} (price-duration-matrix.tsx)
- [x] R6 plan gap: matrixPrices default range is ±60% not ±50% (matrix.ts + test)
- [x] R7 minor: parseItNumber "0.035" -> 35; percent fields single dot = decimal (format.ts + test)
- [x] R8 minor: € fields need max 1e10 to match schema (input-panel.tsx), or clamp on load
- [x] R9 minor: LTV 100% & costs 0 -> capitalLimit 1e11 squashes chart; represent "no capital limit" (max-price.ts, max-price-chart.tsx)
- [x] R10 cosmetic: Rata/reddito tile shows 0,0% next to n.d. when no mortgage -> show "n.d." (summary-cards.tsx)
      2026-11-09 step 6b (sonnet): R1–R10 fixed. R1 SliderField track max = lo+ceil((hi−lo)/step)·step, emitted value clamped to hi (browser: price 205k → End = 102.700 + {mode:"max"}); R2 money-bar total = needed sum, second thin bar "coperto dal capitale"/"mancante" (browser: capital 40k → 45,3% / 54,7%); R3/R4 NumberField cancel ref + skip onChange when draft == initial edit text, editing shows up to 3 (percent) / 2 decimals; R5 matrix click sets downPayment max; R6 matrixPrices step floored (5k < 50k raw, else 10k, min 5k; 200k → 100k..300k step 25k); R7 parseItNumber leading-zero + `{percent:true}` single dot = decimal; R8 € fields max 1e10 (loadInputs already falls back to defaults on invalid state); R9 capitalLimit = Infinity when 1−LTV+c ≈ 0 (price Infinity + binding null when also no income; chart shows "nessun limite calcolabile", yMax from curve ×1.15, capital line only within domain else a note; only max-price-chart consumes these); R10 Rata/reddito tile "n.d." when check is "na". 114 tests; lint/format/typecheck/test/build green.
      2026-11-10 orchestrator: step 6b verified (114 tests, all checks green; R1-R3 browser-checked by fixer, R4+R7 browser-checked by orchestrator). Step 6 -> [x]. ALL STEPS DONE. Nothing committed yet.
