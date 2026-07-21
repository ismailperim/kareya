# ADR-0005: AI agent + access security (PoC baseline)

- **Status:** Accepted
- **Date:** 2026-07-21
- **Deciders:** İsmail Perim
- **Related ticket:** KAR-36 (epic KAR-29)

## Context

Two security surfaces open up as the product grows: (1) an **AI dev agent** that edits customer site code and deploys it — fed by **untrusted customer input** (revision requests); (2) a **public meeting room** that spends paid tokens (ElevenLabs minutes + Claude), so anyone reaching it can burn money. This is a PoC, but the guardrails must be designed in from the start.

## Decision

### Access control (stop token burn)

- **PoC:** put the portal behind **Cloudflare Access** (Zero Trust, email allowlist) — only İsmail + invited testers can load it. Handled by İsmail.
- **Production (KAR-42):** single-use, account-bound **minted meeting tokens** (booking → mint, unguessable, DB-validated) + **Cloudflare Turnstile** (bot check) before a meeting starts + rate limits / concurrency caps. Set ElevenLabs concurrency + monthly minute caps as a hard ceiling.

### AI dev agent

- **Isolation:** each site is edited in its own isolated worktree/sandbox — no access to other customers' data and no access to Kareya's core secrets.
- **Least privilege:** git/deploy credentials are **scoped per site** (fine-grained), injected at runtime, never stored in the site's code/repo.
- **Prompt-injection boundary:** the customer's revision text is **data, not instructions**. The agent follows Kareya's system rules only; embedded "do X" in a customer message is never authority.
- **Human review gate (Faz a):** every AI change → preview + **İsmail approval → deploy**. No auto-merge/auto-deploy initially; automation increases only as trust is earned. Build/tests must pass before deploy. Revision-round limits apply. Every change is written to an **audit log**.

### Repository strategy

- **PoC:** **no per-site GitHub repos** — generate the code, store it, and deploy via CF Pages **direct upload**. Fewer moving parts, no repo-security surface.
- **When repos are adopted** (customer code ownership / handoff): a **dedicated GitHub Organization** + a **GitHub App** with **per-repo fine-grained** permissions, **private** repos, kept **separate from Kareya-dev**. **Not** self-hosted GitLab (unjustified ops + security burden for now).

## Consequences

- **Positive:** strong safety baseline before scale; token-burn closed for the PoC; the human-review gate makes AI code changes safe and matches the Faz-a model.
- **Negative / trade-offs:** manual review overhead per revision (intended early; loosened as trust grows); minted-token + Turnstile + per-site credential automation is future work (KAR-42 + KAR-41).
- **Follow-ups:** KAR-42 (prod access), KAR-41 (chat revision agent with these guardrails). CF Access + ElevenLabs caps are İsmail's immediate manual steps.
