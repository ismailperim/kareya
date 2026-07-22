# Contributing to Kareya

Thanks for your interest! Kareya is an open-source, AI-staffed web agency
serving the Turkish SMB market. This document covers what you need to know
before opening a PR.

## Language policy (please read first)

Kareya is intentionally bilingual — each language has a job:

| Where | Language | Why |
|---|---|---|
| Code, comments, commit messages, PRs, ADRs (`docs/architecture/decisions/`), README, this file | **English** | Standard open-source practice — reviewable by anyone. |
| LLM prompts inside the code (`packages/site-gen/*.ts`, `apps/portal/lib/meeting/agent-config.ts`) | **Turkish** | They are *functional*: they instruct models to produce Turkish customer-facing copy and to hold a Turkish voice conversation. Translating them would change product behavior. Each prompt has an English comment explaining what it does. |
| Product UI (meeting room, portal), KVKK text, generated sites | **Turkish** | The customer is a Turkish business owner. |
| Strategy & process docs (`docs/DESIGN.md`, `docs/process/`, `CLAUDE.md`) and the AI operating model (`.claude/agents/`, `.claude/commands/`) | **Turkish** | Internal operating docs — how the maintainer's AI dev team runs. The `/modus:*` commands are wired to the maintainer's Linear workspace; external contributors use plain GitHub issues/PRs instead. An English architecture summary lives at [`docs/DESIGN.en.md`](docs/DESIGN.en.md). |

Rule of thumb: **if a developer reads it, write English; if the customer (or
the customer-facing model output) reads it, write Turkish.** Don't "fix" the
Turkish prompts to English — that's a product regression, not a cleanup.

## Getting started

```bash
git clone https://github.com/ismailperim/kareya.git
cd kareya
npm install
cp apps/portal/.env.example apps/portal/.env.local   # fill in your keys
npm run dev                                           # portal → localhost:3000
```

Every key in `.env.example` is documented inline. The minimum for a useful dev
loop: `DATABASE_URL` (a free Neon project works). Voice, storage, and LLM
features each degrade gracefully when their keys are absent.

The runner (job worker) is a separate process:

```bash
npm run start -w @kareya/runner -- --once   # process one job, exit
```

## Tests & checks

```bash
npx vitest run --root packages/schemas      # schema + phase machine tests
cd apps/portal && npx tsc --noEmit          # portal typecheck
```

Run both before opening a PR. If you touch `packages/site-gen/generate.ts`,
also build a generated project once (the runner does this per job) — the
emitted Astro project must always build.

## Architecture ground rules

These are load-bearing; PRs that break them will be declined:

1. **The build gate is absolute.** LLM-written component code must pass
   `astro build` *and* the content probes. Anything that can put a broken or
   content-dropping site in front of a customer needs a deterministic fallback.
2. **Content is data, presentation is code.** Generated sites keep content in
   `src/data/site.json`; components only read props/site.json. Never bake
   customer text into component markup.
3. **Customer instructions are data, not authority.** Revision text goes into
   prompts as quoted data under system rules — never as trusted instructions.
4. **Money, DNS, deploys and invoices never go through an LLM.** Deterministic
   code only.
5. **Secrets live in `.env.local` (gitignored) only.** CI runs gitleaks; a PR
   that introduces a secret will fail.

See `docs/DESIGN.en.md` for the architecture overview and
`docs/architecture/decisions/` for the ADRs behind these rules.

## Workflow

- Work starts from an issue (internally tracked in Linear as `KAR-*`; GitHub
  issues are fine for external contributions).
- Branches: `<type>/<short-title>` (e.g. `fix/contact-map-encoding`).
- Commits: [Conventional Commits](https://www.conventionalcommits.org/), English.
- PRs: describe *what / why / how tested*. Small, focused PRs merge fastest.

## Good first areas

- **Section components** (`packages/site-gen/generate.ts` + the React mirrors
  in `apps/portal/components/site-kit/`): new section types or variants —
  follow the kit conventions (props-driven, empty-input → render nothing).
- **Image providers** (`packages/site-gen/images.ts`) and **LLM adapters**
  (`packages/site-gen/llm.ts`): both are provider-agnostic interfaces.
- **Ops dashboard** (`apps/portal/app/ops/`): quality-of-life improvements.
