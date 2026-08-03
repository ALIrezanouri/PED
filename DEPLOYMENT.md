# Deployment (Vercel + GitHub)

This repo is a monorepo with two independently deployable apps:

- `web/` — Next.js frontend (dashboard + What-if simulator).
- `server/` — Fastify (Node.js) API that computes the elasticity analysis.

Because Vercel is serverless, the Fastify app is exposed through a serverless
entrypoint (`server/api/index.ts`) and `server/vercel.json` rewrites all routes
to it. Deploy the two folders as **two separate Vercel projects** from the same
GitHub repository.

## 1. Backend project (`server/`)

1. In Vercel, "Add New Project" → import this GitHub repo.
2. Set **Root Directory** to `server`.
3. Framework preset: **Other**. Install command `pnpm install` (auto-detected).
4. Deploy. The API will be at `https://<backend>.vercel.app` with
   `GET /api/health` and `POST /api/analyze`.

No environment variables are required for the backend MVP.

## 2. Frontend project (`web/`)

1. "Add New Project" → import the **same** GitHub repo again.
2. Set **Root Directory** to `web`.
3. Framework preset: **Next.js** (auto-detected).
4. Add an environment variable:
   - `NEXT_PUBLIC_API_URL = https://<backend>.vercel.app`
5. Deploy.

## Notes

- `NEXT_PUBLIC_API_URL` must be set at **build time** (it is inlined into the
  client bundle). Redeploy the frontend after changing it.
- The backend enables permissive CORS for the MVP. Before production, restrict
  the allowed origin to the frontend domain in `server/src/app.ts`.
- Local development: run the backend (`pnpm --dir server dev`, port 4000) and the
  frontend (`pnpm --dir web dev`, port 3000). `web/.env.local` already points at
  `http://localhost:4000`.
