# ADR-0004: Site delivery — data for preview, real code on approval

- **Status:** Accepted
- **Date:** 2026-07-21
- **Deciders:** İsmail Perim
- **Related ticket:** KAR-36 (epic KAR-29)

## Context

Kareya is an AI-staffed **agency**, not a Wix-style template builder. Two needs shape site delivery: (1) the customer must end up with a **real, ownable codebase**, not just a page-builder document; (2) revisions never end — customers ask for changes forever, like they would from a human agency ("hey, change this text"). Sites are static SMB marketing sites with **no per-site database**. This refines the earlier DESIGN §8.4 assumption ("component kit → Cloudflare Pages per-site deploy") with an explicit data→code split and a chat-driven revision model.

## Options considered

1. **Dynamic multi-tenant render (site = data only)** — one renderer serves all sites from Site JSON. Cheap revisions, but no per-site code, capped by what the schema/kit express; feels like a builder, not an agency.
2. **Generate real code per site + per-site deploy** — each approved site is a real Astro project, deployed per site; revisions edit the real code. Ownable + agency-grade flexibility; more automation needed.
3. **Hybrid: data for preview, code on approval** — dynamic render for fast preview during the meeting; on approval, materialize a real Astro project and deploy it; revisions run on the real code.

## Decision

**Option 3.**

- **Preview = data.** Meeting → Brief → **Site JSON** → deterministic dynamic render (`/s/[id]`). Instant, cheap, no build — used to show the customer a site during/after the meeting.
- **Approval = real code.** On approval, Site JSON + the component kit generate a real **Astro static project** (no DB) → deployed **per site** via **Cloudflare Pages direct upload** (git repos deferred; see ADR-0005). From this point the codebase is the living site.
- **Lifecycle.** The ephemeral meeting session (draft brief in `meeting_session.current_brief`) is **promoted on approval to a persistent `project` + `site` record** in Neon (brief version, Site JSON, code/deploy location, URL, domain, workflow phase, care). "After approval it becomes a DB record."
- **Sites are static / DB-less.** Astro static output; contact forms post to a shared endpoint/service, not a per-site backend. Assets live in **Cloudflare R2**, referenced from Site JSON.
- **Revisions = conversation.** The customer requests a change in plain language (portal / WhatsApp / voice); an **AI dev agent** edits the site's code (routine/structural edits regenerate from Site JSON; free-form edits touch the code directly) → preview → **İsmail approves (Faz a)** → deploy. 2 rounds included; `OUT_OF_SCOPE` → add-on. Security in ADR-0005.

## Consequences

- **Positive:** customer gets real, ownable code + agency-grade flexibility; static sites keep hosting trivial and cheap; the ongoing "just tell us what to change" flow is the product (and the CARE/MRR heart); mirrors how Kareya itself is built (AI edits a repo, human reviews).
- **Negative / trade-offs:** per-site build/deploy + revision automation is real work; revisions cost more than pure-JSON patches (bounded by human review, the kit, and round limits — the builder.ai caution); the component kit's breadth/quality is the make-or-break (out-of-kit needs escalate).
- **Follow-ups:** KAR-30 (Site JSON schema), KAR-31 (kit), KAR-32 (preview render) → done. KAR-33 (Brief→Site JSON), KAR-37 (Site JSON→Astro generator), KAR-38 (per-site deploy), KAR-39 (session→project lifecycle), KAR-40 (R2 assets), KAR-41 (chat revision). Security: ADR-0005.
