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

// write_code (LLM agent -> sources/) and build_publish (sources/ -> sites/) are
// the v2 split (KAR-63): brief approval enqueues write_code, which chains a
// build_publish. build_site remains as the legacy all-in-one job.
export const JOB_TYPES = ["build_site", "revise_site", "write_code", "build_publish"] as const;
export type JobType = (typeof JOB_TYPES)[number];

/** Runner roles (KAR-63): same binary, RUNNER_ROLE decides which jobs it claims. */
export const RUNNER_ROLES: Record<string, string[]> = {
  all: [...JOB_TYPES],
  writer: ["write_code", "revise_site", "build_site"],
  builder: ["build_publish"],
};
export type RunnerRole = keyof typeof RUNNER_ROLES;

/** Payload for a build_publish job (sources/<slug> -> astro build -> sites/<slug>). */
export type BuildPublishJobPayload = {
  token: string;
  projectId?: string;
  slug?: string;
};

/** Payload for build_site (legacy all-in-one) and write_code jobs. */
export type BuildSiteJobPayload = {
  token: string;
  /** Version in the `brief` table to build from (latest if omitted). */
  briefVersion?: number;
  /** Owning project (KAR-39). Publishing uses the slug; token is the fallback. */
  projectId?: string;
  slug?: string;
};

/** Payload for a revise_site job (KAR-41 — chat-driven revision). */
export type ReviseSiteJobPayload = {
  token: string;
  /** The revision request in natural language ("başlığı X yap"). */
  instruction: string;
};
