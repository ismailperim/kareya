# Kareya

AI-kadrolu web ajansı. Bkz. `CLAUDE.md` ve `docs/DESIGN.md`.

Bu repo hem Kareya'yı geliştiren **modus** operating model'ini (Linear + subagent'lar + `/modus:*`) hem de ürün kodunu (portal + görüşme odası) barındırır.

## Stack

- **Next.js** (App Router, TS) — portal + görüşme odası
- **Tailwind CSS v4**
- **Neon** (serverless Postgres) — dev DB. _Auth ve Storage ileride ayrı kararlaştırılır (Neon saf Postgres)._
- **Cloudflare** deploy — Workers, [OpenNext](https://opennext.js.org/cloudflare) adapter (`@opennextjs/cloudflare`)

> Üretilen müşteri siteleri ayrı bir statik-export render hattıyla üretilir (component-kit — sonraki ticket'lar). Bu app dinamiktir (Cloudflare Workers).

## Kurulum

1. Bağımlılıklar:
   ```bash
   npm install
   ```
2. Ortam değişkenleri — `.env.example`'ı kopyala:
   ```bash
   cp .env.example .env.local
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
- Alternatif: CF **Workers Builds** ile GitHub repo bağlanır, otomatik build/deploy. `DATABASE_URL` CF proje ayarlarına secret olarak girilir; lokal Workers runtime için `.dev.vars`.

## Çalışma modeli

Her iş bir Linear ticket'ından başlar (`KAR-*`). Döngü ve komutlar: `CLAUDE.md` › Çalışma modeli (modus), detay `docs/process/`.
