# Kareya

AI-staffed web agency. See `CLAUDE.md` and `docs/DESIGN.md`.

This repo holds both the **modus** operating model that builds Kareya (Linear + subagents + `/modus:*`) and the product code (portal + meeting room).

## Stack

- **Next.js** (App Router, TS) — portal + meeting room
- **Tailwind CSS v4**
- **Neon** (serverless Postgres) — dev DB. _Auth and Storage are decided separately later (Neon is plain Postgres)._
- **Cloudflare** deploy — Workers, [OpenNext](https://opennext.js.org/cloudflare) adapter (`@opennextjs/cloudflare`)

> Generated client sites are produced by a separate static-export render pipeline (component-kit — later tickets). This app is dynamic (Cloudflare Workers).

## Structure (npm workspaces)

- `apps/portal/` — portal app (Next.js): marketing + customer portal + meeting room. Deployable → CF Worker `kareya-portal`.
- `packages/schemas/` — shared contracts (`@kareya/schemas`): Brief/Site JSON/ChangeOps.
- Future siblings: `apps/web` (marketing site), `apps/workers` (agent runtime), `packages/component-kit` (renderer).

From the repo root, `npm run dev|build|preview|deploy` delegate to `@kareya/portal`.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Environment — copy `.env.example`:
   ```bash
   cp apps/portal/.env.example apps/portal/.env.local
   ```
   Put the (pooled) connection string from Neon **Console > Connection Details** into `DATABASE_URL`. It is a secret — do not commit it.
3. Dev server:
   ```bash
   npm run dev
   ```
   http://localhost:3000 · health check: http://localhost:3000/health

## Build & deploy

- Standard build: `npm run build`
- Cloudflare preview (local Workers runtime): `npm run preview`
- Cloudflare deploy: `npm run deploy` (after `wrangler login`) — OpenNext build + `wrangler deploy`.
- CF **Workers Builds** (git-connected): connect the GitHub repo → **Root directory: `apps/portal`**, build command `npx opennextjs-cloudflare build`, Worker name `kareya-portal`. Set `DATABASE_URL` as a project secret; for the local Workers runtime use `apps/portal/.dev.vars`.

## Operating model

Every task starts from a Linear ticket (`KAR-*`). See `CLAUDE.md` and `docs/process/` for the cycle and the `/modus:*` commands.
