# Kareya

AI-kadrolu web ajansı. Bkz. `CLAUDE.md` ve `docs/DESIGN.md`.

Bu repo hem Kareya'yı geliştiren **modus** operating model'ini (Linear + subagent'lar + `/modus:*`) hem de ürün kodunu (portal + görüşme odası) barındırır.

## Stack

- **Next.js** (App Router, TS) — portal + görüşme odası
- **Tailwind CSS v4**
- **Neon** (serverless Postgres) — dev DB. _Auth ve Storage ileride ayrı kararlaştırılır (Neon saf Postgres)._
- **Cloudflare** deploy — Workers, [OpenNext](https://opennext.js.org/cloudflare) adapter (`@opennextjs/cloudflare`)

> Üretilen müşteri siteleri ayrı bir statik-export render hattıyla üretilir (component-kit — sonraki ticket'lar). Bu app dinamiktir (Cloudflare Workers).

## Yapı (npm workspaces)

- `apps/portal/` — portal app (Next.js): pazarlama + müşteri portalı + görüşme odası. Deployable → CF Worker `kareya-portal`.
- `packages/schemas/` — paylaşılan sözleşmeler (`@kareya/schemas`): Brief/Site JSON/ChangeOps.
- İleride kardeşler: `apps/web` (pazarlama sitesi), `apps/workers` (agent runtime), `packages/component-kit` (renderer).

Root'tan `npm run dev|build|preview|deploy` komutları `@kareya/portal`'a delege eder.

## Kurulum

1. Bağımlılıklar:
   ```bash
   npm install
   ```
2. Ortam değişkenleri — `.env.example`'ı kopyala:
   ```bash
   cp apps/portal/.env.example apps/portal/.env.local
   ```
   Neon **Console > Connection Details**'ten (pooled) connection string'i `DATABASE_URL`'e koy. Bu bir secret'tır — commit etme.
3. Geliştirme sunucusu:
   ```bash
   npm run dev
   ```
   http://localhost:3000 · sağlık kontrolü: http://localhost:3000/health

## Build & deploy

- Standart build: `npm run build`
- Cloudflare önizleme (lokal Workers runtime): `npm run preview`
- Cloudflare deploy: `npm run deploy` (`wrangler login` sonrası) — OpenNext build + `wrangler deploy`.
- CF **Workers Builds** (git-connected): GitHub repo'yu bağla → **Root directory: `apps/portal`**, build command `npx opennextjs-cloudflare build`, Worker adı `kareya-portal`. `DATABASE_URL` proje ayarlarına secret olarak girilir; lokal Workers runtime için `apps/portal/.dev.vars`.

## Çalışma modeli

Her iş bir Linear ticket'ından başlar (`KAR-*`). Döngü ve komutlar: `CLAUDE.md` › Çalışma modeli (modus), detay `docs/process/`.
