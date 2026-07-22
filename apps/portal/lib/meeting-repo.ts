import { canTransition, isPhase, type Phase } from "@kareya/schemas";

import { getDb } from "@/lib/db";

// Server-only data access for meeting sessions + briefs (KAR-20).
// Access is keyed by the meeting token for now; a session row is created on
// first use. Real account-bound, single-use token validation comes later.

/** Get the session id for a token, creating the row if needed. */
export async function getOrCreateSession(token: string): Promise<string> {
  const sql = getDb();
  const rows = await sql`
    insert into meeting_session (token)
    values (${token})
    on conflict (token) do update set updated_at = now()
    returning id
  `;
  return rows[0].id as string;
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
  const sessionId = await getOrCreateSession(token);
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
  const sessionId = await getOrCreateSession(token);
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

/** Save the live brief draft (KAR-26 resume). Upserts the session. */
export async function saveDraft(token: string, brief: unknown): Promise<void> {
  const sql = getDb();
  await sql`
    insert into meeting_session (token, current_brief)
    values (${token}, ${JSON.stringify(brief)}::jsonb)
    on conflict (token) do update
      set current_brief = ${JSON.stringify(brief)}::jsonb, updated_at = now()
  `;
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
};

/** Recent meeting sessions for the ops dashboard (KAR-47). */
export async function listSessions(limit = 50): Promise<SessionSummary[]> {
  const sql = getDb();
  const rows = await sql`
    select token, phase, updated_at,
           current_brief->'business'->>'name' as business_name,
           (current_brief is not null) as has_draft
    from meeting_session
    order by updated_at desc
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
  return true;
}
