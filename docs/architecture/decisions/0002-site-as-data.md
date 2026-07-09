# ADR-0002: Site = DATA + workflow-driven orchestration

- **Status:** Accepted
- **Date:** 2026-07-08
- **Deciders:** İsmail Perim
- **Related ticket:** —

## Context

Two core architectural decisions shape the rest of the system: (1) how agents build the site, (2) who owns control flow. builder.ai's collapse (unbounded generation + autonomous swarm) and the need for cost/debug predictability make both decisions mandatory. Details: `docs/DESIGN.md` §8.0.

## Options considered

1. **Agent-driven + LLM writes raw HTML/CSS** — flexible, flashy in demos; but unpredictable cost, hard to resume/debug, code-injection risk, no quality floor (the builder.ai debt model).
2. **Workflow-driven + Site = DATA (Site JSON + deterministic renderer)** — control lives in the state machine; agents are stateless workers; the site is a single schema-validated JSON; rendering is deterministic.

## Decision

**Option 2.** Two linked principles:

**A) Workflow-driven, not agent-driven.** The **state machine** owns control flow (DESIGN §2); agents are **stateless workers** invoked per stage with schema-fixed inputs/outputs. No agent decides "what's next." Payoff: predictable cost, resumable jobs, debuggable failures.

**B) Site = DATA, not code.** Each site is a single **Site JSON** document (pages → section list → props + content + brand tokens), schema-validated. The **renderer is deterministic**: Site JSON + component kit → build. **The LLM never writes raw HTML/CSS.** A revision = **ChangeOps** (a typed JSON patch; diffable, reversible, cheap). The `OUT_OF_SCOPE` op auto-escalates scope creep to an add-on proposal.

## Consequences

- **Positive:** revisions are cheap JSON patches; QA = schema + visual; code injection is impossible; the quality floor comes from the component kit (the 500-site craft); the antidote to builder.ai's "unbounded generation" death.
- **Negative / trade-offs:** the component kit + three schemas (Brief/Site/ChangeOps) require upfront investment; requests outside the kit demand `OUT_OF_SCOPE` discipline (an accepted constraint).
- **Follow-ups:** Brief/Site JSON + ChangeOps schema v1 tickets; component kit + section inventory; `schema-guardian` + `component-kit-reviewer` guard this decision.
