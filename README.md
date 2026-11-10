# When I Buy a House

A personal, front-end-only dashboard that answers one question:

> With the capital I have, which house can I buy, with what mortgage, what monthly payment, and how much interest in total?

It is built for exploring possibilities quickly, for example: "I have €150,000, a €200k house: do I need a mortgage? For a €400k house, a 30-year or a 10-year loan? What is the monthly payment?"

Live demo: https://gabrieleghisleni.github.io/when-i-buy-a-house/

## Features

- Summary cards: whether a mortgage is needed, loan amount, monthly payment, total interest, total repaid, total house cost.
- Traffic lights for feasibility: capital check and payment-to-income check, with an overall verdict.
- Price × duration matrix, colored by feasibility. Click a cell to load its price and duration.
- Maximum affordable price per loan duration, with the constraint (capital or income) that limits it.
- Down payment vs. monthly payment and liquidity.
- Where your money goes: down payment, purchase costs, furniture and works, emergency fund, leftover liquidity.
- Amortization schedule: principal and interest per year, remaining debt, and an expandable yearly table.
- Italy and Spain presets (purchase costs, LTV, payment-to-income threshold, rate), all editable.
- Autosave to localStorage, plus JSON export and import.
- Light and dark theme, responsive down to phone width.

## Model

- Deterministic: a fixed rate, the same for every duration, with a French amortization schedule (constant monthly payment).
- Purchase costs are a percentage of the price. The minimum down payment is price × (1 − LTV).
- No variable rate, no TAEG, no regional detail. The defaults are indicative, based mostly on commercial and comparison sources, and are explained in the "How it works" section of the app.

## Development

Requires Node.js 22 and pnpm.

```bash
pnpm install
pnpm dev        # local dev server
pnpm test       # Vitest unit tests (finance engine and state)
pnpm typecheck  # tsc -b
pnpm lint       # oxlint
pnpm format     # oxfmt
pnpm build      # typecheck + static build into dist/
```

## Stack

Vite, React, TypeScript, Tailwind CSS, shadcn/ui, Recharts (via shadcn charts), Zod, Vitest, oxlint and oxfmt.

## Deployment

Pushes to `main` build the app and publish it to GitHub Pages through the workflow in `.github/workflows/deploy.yml`. The build uses `base: './'`, so it works from a sub-path.

## Disclaimer

This is a personal exploration tool, not financial advice. Check real offers from banks and a notary before deciding anything.
