# Kareya — Architecture Overview (English)

> Condensed English summary of [`docs/DESIGN.md`](DESIGN.md) (Turkish, the
> canonical design doc). Decisions live in
> [`docs/architecture/decisions/`](architecture/decisions/) — those ADRs are
> in English.

## What Kareya is

A **done-for-you web agency, staffed by AI**, for Turkish SMBs. The customer
never touches an editor:

1. **Meeting room** (browser, WebRTC): a voice AI consultant (ElevenLabs
   voice + turn-taking, Claude as the brain) runs a 15–30 min discovery
   interview in Turkish. A live brief panel fills as they talk.
2. **Brief approval** turns the meeting into a **project** with a slug,
   phase, and publish location.
3. **Build pipeline** produces a real Astro site and publishes a preview.
4. **Review & revisions**: the customer asks for changes by voice or chat
   ("change that headline", "make the corners sharper") — content revisions
   patch data, design revisions patch component code, both gated.
5. **Launch & care**: DNS/live cutover and a maintenance subscription (MRR).

## Core principles

- **Workflow-driven, not agent-driven.** A typed phase machine
  (BRIEF → BRIEF_COMPLETED → BUILDING → PREVIEW_READY → LIVE → CARE, plus
  FAILED/retry) owns control flow. LLMs are stateless workers invoked at
  specific steps; they never decide what happens next in the lifecycle.
- **LLMs decide content and design; deterministic code touches money, DNS,
  deploys, invoices.**
- **The customer's instruction is data, not authority.** Revision text enters
  prompts as quoted data under system rules (prompt-injection safe).
- **Everything the customer gets is real, portable code.** No proprietary
  runtime in the generated sites.

## The generation pipeline (v2)

```
Brief ─→ Site JSON ─→ polish ─→ images ─→ Astro kit ─→ Design Pass ─→ publish
        (deterministic  (LLM copy,  (Pexels)  (content/     (Claude writes
         structure)      TR)                   presentation   per-project
                                               split)         component code)
```

- **Site JSON** is the single source of truth for content
  (`packages/schemas/site.ts`, zod). The deterministic assembler
  (`packages/site-gen/assemble.ts`) maps the brief to pages/sections; an LLM
  polish pass rewrites copy only (structure-locked, no fabrication —
  provider chain: Gemini → Claude).
- **The emitted Astro project separates content from presentation**:
  `src/data/site.json` + props-driven `src/components/*.astro` + thin pages.
- **Design Pass** (the v2 feature): Claude rewrites a handful of components
  for this specific business's character. Guardrails, in order:
  1. protocol validation (rewritable-path allowlist, no `<script>`,
     external-URL host allowlist, data-wiring check),
  2. `astro build` must pass in an isolated worktree,
  3. content probes — business name, headline, service names, phone must
     survive in the built HTML,
  4. one retry with the error fed back, then **fallback to the deterministic
     kit**. A broken build can never reach a customer.
- **Art direction & stability**: brand palette, photos, and the chosen design
  are **pinned** after the first build — rebuilds don't re-roll them;
  revisions can change them explicitly. A contrast guard derives readable
  text tokens from any customer-chosen palette (WCAG-AA for small text).

## Runtime topology

- **Portal** (`apps/portal`): Next.js → Cloudflare Worker (OpenNext). Meeting
  room, `/s/[id]` preview redirects, `/ops` dashboard, meeting/build APIs.
- **Runner** (`apps/runner`): stateless Node worker, container-ready. Claims
  jobs from a Postgres queue (single-statement `SKIP LOCKED` over Neon's HTTP
  driver). `RUNNER_ROLE=all|writer|builder` splits LLM work from
  build/publish work across containers of the same image when desired.
- **Job chain**: brief approval → `write_code` (LLM → validates → publishes
  the source tree to `sources/<slug>/` with a manifest) → `build_publish`
  (fetches sources from R2 → `astro build` → publishes `sites/<slug>/`).
- **Storage** (Cloudflare R2): `sites/<slug>/` = published output,
  `sources/<slug>/` = the customer's canonical source (their code, theirs to
  take). Generated sites use relative asset paths, so they work on the
  preview host and on the customer's own domain without a rebuild.

## Why Turkish appears in the source

The LLM prompts in `packages/site-gen/` and the voice-agent config are
written in Turkish **on purpose**: they produce Turkish customer-facing copy
and drive a Turkish voice conversation. They are product behavior, not
documentation. See the language policy in
[`CONTRIBUTING.md`](../CONTRIBUTING.md).
