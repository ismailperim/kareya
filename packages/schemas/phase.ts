// Workflow phase machine (KAR-45, ADR-0006). The state machine owns control
// flow (DESIGN §2 / CLAUDE.md rule 1): transitions are deterministic and typed,
// never LLM-decided. Persisted in meeting_session.phase (Neon).

export const PHASES = [
  "BRIEF", // meeting in progress, brief being collected
  "BRIEF_COMPLETED", // customer confirmed the brief
  "BUILDING", // build_site job queued/running
  "PREVIEW_READY", // static site published to R2, awaiting human approval
  "LIVE", // approved + live
  "CARE", // maintenance subscription
  "FAILED", // build failed — surfaced in ops, retryable
] as const;
export type Phase = (typeof PHASES)[number];

/** Allowed transitions. Anything not listed is invalid. */
const TRANSITIONS: Record<Phase, Phase[]> = {
  BRIEF: ["BRIEF_COMPLETED"],
  BRIEF_COMPLETED: ["BUILDING", "BRIEF"], // BRIEF: meeting reopened
  BUILDING: ["PREVIEW_READY", "FAILED"],
  PREVIEW_READY: ["LIVE", "BUILDING"], // BUILDING: rebuild/revision
  LIVE: ["CARE", "BUILDING"],
  CARE: ["BUILDING"],
  FAILED: ["BUILDING"], // retry
};

export function canTransition(from: Phase, to: Phase): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** Validate + return the next phase; throws on an invalid transition. */
export function transition(from: Phase, to: Phase): Phase {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid phase transition: ${from} → ${to}`);
  }
  return to;
}

export function isPhase(v: unknown): v is Phase {
  return typeof v === "string" && (PHASES as readonly string[]).includes(v);
}

// ---- Job types (queue contract between the portal and the runner) ----

export const JOB_TYPES = ["build_site"] as const;
export type JobType = (typeof JOB_TYPES)[number];

/** Payload for a build_site job. */
export type BuildSiteJobPayload = {
  token: string;
  /** Version in the `brief` table to build from (latest if omitted). */
  briefVersion?: number;
};
