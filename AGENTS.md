# AGENTS.md

## Cursor Cloud specific instructions

This repo hosts a **Price Elasticity of Demand** analytics product (Persian / RTL, Jalali calendar). It has three parts:

- `server/` — standalone **Fastify (Node.js + TypeScript)** API. Computes elasticity per product and per group from an uploaded transactions CSV (log-log OLS), plus 95% confidence intervals, statistical significance, cross-price elasticity (substitutes/complements), pricing guidance, and profit-optimal pricing (Lerner, only surfaced when in a plausible ±50% range). Pure engine logic lives in `src/elasticity.ts`, `src/regression.ts`, `src/stats.ts`.
- `web/` — **Next.js (App Router) + shadcn/ui** frontend (nova preset, RTL, Vazirmatn font). Upload CSV → dashboard (KPIs, charts, results table, cross-price + yearly heatmaps, insights) → What-if price simulator. Charts use **Plotly loaded from CDN** (see `src/app/layout.tsx` and `src/components/plotly-chart.tsx`), not an npm package.
- `index.html`, `elasticity_dashboard.html` — the **legacy** single-file static dashboards that predate the app. They fetch a `elasticity_results.json` (not committed). Kept for reference; the real product is `web/` + `server/`.

### Running locally (two services)

- Backend: `pnpm --dir server dev` → listens on `http://localhost:4000` (`GET /api/health`, `POST /api/analyze`). Override port with `PORT`.
- Frontend: `pnpm --dir web dev` → `http://localhost:3000`. It calls the backend via `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:4000`; set in `web/.env.local`).
- Both must run for the app to work end to end. The frontend calls the backend **from the browser**, so the backend's permissive CORS matters.
- Try it fast: on the landing page click "استفاده از دادهٔ نمونه" — it loads `web/public/sample-transactions.csv`. Regenerate that sample with `node server/scripts/gen_sample_csv.mjs <path>`.

### Lint / test / build

- Backend tests (engine correctness): `pnpm --dir server test` (node:test via tsx). Typecheck: `pnpm --dir server typecheck`.
- Frontend: `pnpm --dir web lint`, typecheck `pnpm --dir web exec tsc --noEmit`, build `pnpm --dir web build`.

### Non-obvious gotchas

- CSV columns are matched by flexible EN/FA aliases (see `server/src/csv.ts`); required: date, group, product, price, quantity. `cost` is optional and unlocks profit-optimal pricing.
- Base UI (shadcn nova) callbacks differ from Radix: `Select.onValueChange` gives `(value: string | null)`, and `Slider.onValueChange` gives `number | number[]` — handle both.
- Profit-optimal price is intentionally hidden when the constant-elasticity Lerner optimum falls outside ±50% of the current price (avoids misleading extrapolation).
- Deployment to Vercel is two separate projects (root dirs `server` and `web`); see `DEPLOYMENT.md`. The Fastify app runs serverless via `server/api/index.ts` + `server/vercel.json`.
- Screen recording is unreliable in this VM (the recorder process can die); prefer screenshots for GUI evidence.
