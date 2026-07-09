# ADR-0001: Tech stack

- **Status:** Accepted
- **Date:** 2026-07-08
- **Deciders:** İsmail Perim
- **Related ticket:** —

## Context

Kareya is an AI-leveraged, done-for-you website agency for Turkish SMBs. Core flow: collect a brief in the meeting room → proposal → an AI crew builds the site → review → launch → maintenance (MRR). The founder is indie and cost-sensitive, keeps compute on Cloudflare, and is experienced with n8n/DevOps and CMS work. Every generated site can be static (content site) → that is where the hosting margin comes from. Details: `docs/DESIGN.md` §8.4.

## Options considered

1. **Off-the-shelf SaaS website builder + integration** — fast but no moat; scope control and deterministic rendering are impossible (builder.ai lesson: unbounded scope = death).
2. **Own orchestration + component kit + Site JSON (balanced buy/build)** — buy voice/payments/hosting; build the kit + schema + orchestration + ChangeOps. This is the moat.
3. **Fully custom, everything in-house** — highest control, slowest; rewriting voice/payments/turn-taking is waste.

## Decision

**Option 2 — balanced buy/build.**

- **Orchestration:** **n8n** (self-host, Phase a) + **Supabase** (Postgres + RLS + Auth + Storage) for state. State machine: BRIEF→PROPOSED→ACCEPTED→BUILDING→QA→CLIENT_REVIEW→REVISION(≤2)→LAUNCH_PREP→LIVE→CARE. (Movable to Temporal/Inngest in Phase b if needed — the state-machine definition is kept portable.)
- **Production:** **Astro + Tailwind** component kit → deterministic build from Site JSON → **Cloudflare Pages** (per-site deploy). Static output ≈ zero marginal hosting.
- **Portal:** kareya.app (Next.js / CF Pages) — marketing + customer portal + preview + meeting room.
- **Agent runtime:** Node/TS workers + **Claude API (Agent SDK)** + job queue; model routing (parse/patch → cheap, copy/art-direction → strong, visual QA → vision). Target LLM+vision **<$10** per site.
- **Payments/invoicing:** iyzico (deposit/link) + Paraşüt e-Arşiv — **rule-based, no LLM**.
- **Comms:** WhatsApp Business API (Meta/Twilio).
- **Voice (Phase b/spike):** ElevenLabs Agents vs OpenAI Realtime — behind a `MeetingSession` abstraction; **buy, don't build** (turn-taking).
- **Dogfood monitoring:** client sites' SSL via CertWarden, uptime via Upti.

## Consequences

- **Positive:** uses the strongest areas (n8n, CF, CMS); low/predictable cost; static output carries the maintenance margin; vendor lock-in limited by abstractions.
- **Negative / trade-offs:** operational load from n8n self-host + build/QA runner; many integrations (iyzico/Paraşüt/WhatsApp/voice) to manage.
- **Follow-ups:** repo bootstrap, schema v1, CI/CD, n8n skeleton tickets; ADR-0002 (site = data).

> Note: some choices have since evolved during bootstrap — **Neon** as the dev DB (instead of Supabase), **Next.js** as the renderer (instead of Astro), and an `apps/portal` monorepo. A superseding ADR will record the new baseline; this ADR captures the original Phase-a decision.
