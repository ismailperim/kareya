# ADR-0006: Runtime orchestration — custom job queue + portable runner (no n8n)

- **Status:** Accepted
- **Date:** 2026-07-22
- **Deciders:** İsmail Perim
- **Related ticket:** KAR-43 (epic)

## Context

The end-to-end flow (brief approval → site generation → build → publish → revisions) needs orchestration. The edge Worker cannot run builds (`npm install` / `astro build` / AI code-editing need a filesystem and long-running processes). DESIGN §8.4 originally assumed **n8n** for Faz-a orchestration — but the project is now planned as an **open-source release**: anyone must be able to `git clone → set env → run`, with zero external orchestration dependencies. n8n adds a self-hosted tool to that path, is fair-code (not open source), and its visual nodes fit integration glue better than a code-heavy build/AI pipeline.

## Options considered

1. **n8n (original plan)** — visual, quick for integrations; but an external self-hosted dependency, poor fit for code-heavy pipelines, weak testability, and a licensing/story problem for an open-source repo.
2. **CF Queues + Workflows** — stays in Cloudflare, but Workers still can't build; adds vendor-coupled orchestration to the open-source story.
3. **Custom: Postgres job queue + typed phase machine + portable Node runner** — no external orchestration; everything in the repo; testable code; the queue is the interface, the runner is deployable anywhere.

## Decision

**Option 3.**

- **Queue:** a `job` table in Neon (type, payload, status, attempts, logs) claimed with `FOR UPDATE SKIP LOCKED`. The portal Worker only **enqueues** (e.g. brief approval → `build_site`).
- **Phase machine:** typed phases + valid transitions in `packages/schemas` (BRIEF → BRIEF_COMPLETED → BUILDING → PREVIEW_READY → LIVE → CARE), state persisted in Neon; transitions deterministic (never LLM-decided — CLAUDE.md rule 3).
- **Runner:** one **stateless, container-ready Node process** (`apps/runner`) that polls the queue and executes job steps. The pipeline **agents are modules inside the runner** (Site Assembler → Content Writer → Generator → Builder → Deployer), not separate services; isolation is **per job** (own temp worktree — ADR-0005). Split into separate workers later only if scale demands it — the queue interface doesn't change.
- **Deploy targets:** the runner runs on the **homelab** now; the same Docker image targets **Cloudflare Containers** for hosted production; open-source users run `node runner` or `docker run`. Where it runs is a deploy detail, not an architecture change.
- n8n is retired from the stack (supersedes the DESIGN §8.4 assumption).

## Consequences

- **Positive:** zero-dependency open-source story (`clone → env → run`); testable, versioned orchestration code; portable runner (homelab today, CF Containers tomorrow); agents can be split out later without interface changes.
- **Negative / trade-offs:** we own queue/retry/visibility plumbing that n8n gave for free (mitigated: the ops dashboard KAR-47 provides visibility; the queue is a small, well-understood pattern).
- **Follow-ups:** KAR-45 (queue + phase machine + approval trigger), KAR-46 (runner + publish pipeline), KAR-47 (ops dashboard). DESIGN §8.4 n8n references to be updated.
