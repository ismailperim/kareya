// Kareya shared contracts (Brief JSON / Site JSON / ChangeOps).
// Consumed as the single source of truth by the portal, the
// renderer/component-kit, and the agent workers. Real schemas (zod
// validation) arrive in later tickets.

export const SCHEMAS_VERSION = "0.0.0";

/** Live brief-panel draft in the meeting room (KAR-15 stub). */
export type BriefDraft = {
  businessName?: string;
  sector?: string;
  hasLogo?: boolean;
  referenceSite?: string;
};
