import { canTransition, isPhase, type Phase } from "@kareya/schemas";

import { getDb } from "@/lib/db";

// Server-only data access for meeting sessions + briefs (KAR-20; KAR-42).
// Access is keyed by the meeting token. Sessions are MINTED — by invite-code
// redemption or by ops — never auto-created from an unknown token: otherwise
// anyone could conjure a session and reach the voice endpoint.

/** Session id for an EXISTING token; null for unknown tokens (→ 404). */
export async function getSessionId(token: string): Promise<string | null> {
  const sql = getDb();
  const rows = await sql`select id from meeting_session where token = ${token}`;
  return rows.length ? (rows[0].id as string) : null;
}

// ---- Invite codes (KAR-42) ----

export type InviteCode = {
  code: string;
  note: string | null;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  created_at: string;
};

/** Create an invite code (ops). Auto-generates a readable code when omitted. */
export async function createInviteCode(input: {
  code?: string;
  note?: string;
  maxUses?: number;
  expiresAt?: string;
}): Promise<InviteCode> {
  const sql = getDb();
  const code =
    input.code?.trim() ||
    `kareya-${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;
  const rows = await sql`
    insert into invite_code (code, note, max_uses, expires_at)
    values (${code}, ${input.note ?? null}, ${Math.max(1, input.maxUses ?? 1)},
            ${input.expiresAt ?? null})
    returning code, note, max_uses, used_count, expires_at, created_at
  `;
  return rows[0] as unknown as InviteCode;
}

export async function listInviteCodes(limit = 50): Promise<InviteCode[]> {
  const sql = getDb();
  const rows = await sql`
    select code, note, max_uses, used_count, expires_at, created_at
    from invite_code order by created_at desc limit ${limit}
  `;
  return rows as unknown as InviteCode[];
}

/**
 * Redeem an invite code: atomically consume one use (single statement — safe
 * over the HTTP driver; the guarded UPDATE can't double-spend), then mint a
 * fresh meeting session. Returns its token, or null when the code is unknown,
 * exhausted, or expired.
 */
export async function redeemInviteCode(code: string): Promise<string | null> {
  const sql = getDb();
  const consumed = await sql`
    update invite_code
    set used_count = used_count + 1
    where code = ${code.trim()}
      and used_count < max_uses
      and (expires_at is null or expires_at > now())
    returning code
  `;
  if (!consumed.length) return null;
  const token = `kar-${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
  await sql`insert into meeting_session (token) values (${token})`;
  return token;
}

export type BriefEventInput = {
  kind?: string;
  field?: string | null;
  value?: string | null;
  payload?: unknown;
};

/** Append a tool-call event (update_brief / update_section / append_note). */
export async function recordBriefEvent(
  token: string,
  event: BriefEventInput,
): Promise<void> {
  const sql = getDb();
  const sessionId = await getSessionId(token);
  if (!sessionId) throw new Error("unknown_session");
  const payload = event.payload === undefined ? null : JSON.stringify(event.payload);
  await sql`
    insert into brief_event (meeting_session_id, kind, field, value, payload)
    values (
      ${sessionId},
      ${event.kind ?? "update_brief"},
      ${event.field ?? null},
      ${event.value ?? null},
      ${payload}::jsonb
    )
  `;
}

/** Save a new versioned Brief snapshot; returns the version number. */
export async function saveBrief(token: string, data: unknown): Promise<number> {
  const sql = getDb();
  const sessionId = await getSessionId(token);
  if (!sessionId) throw new Error("unknown_session");
  const rows = await sql`
    insert into brief (meeting_session_id, version, data)
    select
      ${sessionId},
      coalesce(max(version), 0) + 1,
      ${JSON.stringify(data)}::jsonb
    from brief
    where meeting_session_id = ${sessionId}
    returning version
  `;
  return rows[0].version as number;
}

/** Latest Brief snapshot for a token, or null if none saved yet. */
export async function getLatestBrief(
  token: string,
): Promise<{ version: number; data: unknown } | null> {
  const sql = getDb();
  const rows = await sql`
    select b.version, b.data
    from brief b
    join meeting_session s on s.id = b.meeting_session_id
    where s.token = ${token}
    order by b.version desc
    limit 1
  `;
  if (rows.length === 0) return null;
  return { version: rows[0].version as number, data: rows[0].data };
}

/** Current generated Site JSON for a token (null before the first build). */
export async function getCurrentSite(token: string): Promise<unknown | null> {
  const sql = getDb();
  const rows = await sql`select current_site from meeting_session where token = ${token}`;
  return rows.length ? (rows[0].current_site ?? null) : null;
}

// ---- Project model (KAR-39) ----

export type ProjectRef = { id: string; slug: string; name: string };

/** URL-safe slug from a Turkish business name. */
export function slugify(name: string): string {
  const map: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
    Ç: "c", Ğ: "g", İ: "i", I: "i", Ö: "o", Ş: "s", Ü: "u",
  };
  const full = name
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (full.length <= 40) return full || "proje";
  // Cut at a word boundary — no mid-word tails like "…-ticaret-l".
  const cut = full.slice(0, 40);
  const atBoundary = cut.replace(/-[^-]*$/, "");
  return atBoundary || cut;
}

/**
 * On approval the meeting attaches to a project (KAR-39). Reuses the session's
 * existing project; otherwise creates one with a unique slug.
 */
export async function findOrCreateProjectForSession(
  token: string,
  businessName: string,
): Promise<ProjectRef> {
  const sql = getDb();
  const existing = await sql`
    select p.id, p.slug, p.name
    from meeting_session s join project p on p.id = s.project_id
    where s.token = ${token}
  `;
  if (existing.length && existing[0].slug) return existing[0] as unknown as ProjectRef;

  const name = businessName.trim() || "Yeni Proje";
  const base = slugify(name);
  // Unique slug: base, then base-2, base-3, …
  const taken = await sql`select slug from project where slug like ${base + "%"}`;
  const takenSet = new Set(taken.map((r) => r.slug as string));
  let slug = base;
  for (let i = 2; takenSet.has(slug); i++) slug = `${base}-${i}`;

  const created = await sql`
    insert into project (name, slug, phase)
    values (${name}, ${slug}, 'BRIEF_COMPLETED')
    returning id, slug, name
  `;
  const project = created[0] as unknown as ProjectRef;
  await sql`update meeting_session set project_id = ${project.id}, updated_at = now() where token = ${token}`;
  return project;
}

/** Link a saved brief version to its project. */
export async function linkBriefToProject(
  token: string,
  version: number,
  projectId: string,
): Promise<void> {
  const sql = getDb();
  await sql`
    update brief set project_id = ${projectId}
    where version = ${version}
      and meeting_session_id = (select id from meeting_session where token = ${token})
  `;
}

/** Project publish prefix for a token (sites/<slug>), or null if no project. */
export async function getProjectForToken(token: string): Promise<
  (ProjectRef & { r2_prefix: string | null; phase: string }) | null
> {
  const sql = getDb();
  const rows = await sql`
    select p.id, p.slug, p.name, p.r2_prefix, p.phase
    from meeting_session s join project p on p.id = s.project_id
    where s.token = ${token}
  `;
  return rows.length ? (rows[0] as never) : null;
}

/** Save the live brief draft (KAR-26 resume). Existing sessions only (KAR-42). */
export async function saveDraft(token: string, brief: unknown): Promise<void> {
  const sql = getDb();
  const rows = await sql`
    update meeting_session
    set current_brief = ${JSON.stringify(brief)}::jsonb, updated_at = now()
    where token = ${token}
    returning id
  `;
  if (!rows.length) throw new Error("unknown_session");
}

/** Load the live brief draft for a token, or null if none. */
export async function getDraft(token: string): Promise<unknown | null> {
  const sql = getDb();
  const rows = await sql`select current_brief from meeting_session where token = ${token}`;
  return rows.length ? (rows[0].current_brief ?? null) : null;
}

/** Update the workflow phase for a session. */
export async function setPhase(token: string, phase: string): Promise<void> {
  const sql = getDb();
  await sql`
    update meeting_session set phase = ${phase}, updated_at = now()
    where token = ${token}
  `;
}

export type SessionSummary = {
  token: string;
  phase: string;
  updated_at: string;
  business_name: string | null;
  has_draft: boolean;
  /** Where the project publishes (KAR-39); sources/ is derived from it (KAR-64). */
  r2_prefix: string | null;
};

/** Recent meeting sessions for the ops dashboard (KAR-47). */
export async function listSessions(limit = 50): Promise<SessionSummary[]> {
  const sql = getDb();
  const rows = await sql`
    select s.token, s.phase, s.updated_at,
           s.current_brief->'business'->>'name' as business_name,
           (s.current_brief is not null) as has_draft,
           p.r2_prefix
    from meeting_session s
    left join project p on p.id = s.project_id
    order by s.updated_at desc
    limit ${limit}
  `;
  return rows as unknown as SessionSummary[];
}

/**
 * Validated phase transition (KAR-45): reads the current phase, checks the
 * machine, then updates. Returns false when the transition is invalid.
 */
export async function advancePhase(token: string, to: Phase): Promise<boolean> {
  const sql = getDb();
  const rows = await sql`select phase from meeting_session where token = ${token}`;
  const current = rows[0]?.phase as string | undefined;
  if (!current || !isPhase(current) || !canTransition(current, to)) return false;
  await setPhase(token, to);
  // The project owns the phase (KAR-39); the session mirrors it during the
  // transition period so existing room/ops reads keep working.
  await sql`
    update project set phase = ${to}, updated_at = now()
    where id = (select project_id from meeting_session where token = ${token})
  `;
  return true;
}
