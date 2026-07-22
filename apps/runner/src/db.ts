import { canTransition, isPhase, type Phase } from "@kareya/schemas";
import { neon } from "@neondatabase/serverless";

import { requireEnv } from "./env";

// Runner-side data access: queue claiming + brief loading + phase updates.

let _sql: ReturnType<typeof neon> | null = null;
export function sql() {
  if (!_sql) _sql = neon(requireEnv("DATABASE_URL"));
  return _sql;
}

export type ClaimedJob = {
  id: string;
  type: string;
  payload: { token?: string; briefVersion?: number } & Record<string, unknown>;
  attempts: number;
};

/**
 * Atomically claim the oldest queued job (single statement — safe over the
 * Neon HTTP driver; SKIP LOCKED prevents double-processing). `types` scopes
 * the claim to this runner's role (KAR-63: writer vs builder).
 */
export async function claimNextJob(types?: string[]): Promise<ClaimedJob | null> {
  const rows = types?.length
    ? await sql()`
        update job
        set status = 'running', attempts = attempts + 1, started_at = now()
        where id = (
          select id from job
          where status = 'queued' and type = ANY(${types})
          order by created_at
          limit 1
          for update skip locked
        )
        returning id, type, payload, attempts
      `
    : await sql()`
        update job
        set status = 'running', attempts = attempts + 1, started_at = now()
        where id = (
          select id from job
          where status = 'queued'
          order by created_at
          limit 1
          for update skip locked
        )
        returning id, type, payload, attempts
      `;
  return rows.length ? (rows[0] as unknown as ClaimedJob) : null;
}

/** Enqueue a follow-up job (KAR-63 chain: write_code → build_publish). */
export async function enqueueJob(type: string, payload: unknown): Promise<string> {
  const rows = await sql()`
    insert into job (type, payload, status)
    values (${type}, ${JSON.stringify(payload)}::jsonb, 'queued')
    returning id
  `;
  return rows[0].id as string;
}

export async function appendJobLog(id: string, line: string): Promise<void> {
  console.log(`  ${line}`);
  // A transient DB blip on a log write must never kill the build itself.
  try {
    const stamped = `[${new Date().toISOString()}] ${line}`;
    await sql()`update job set logs = logs || ${stamped + "\n"} where id = ${id}`;
  } catch (err) {
    console.warn(`  (log write failed: ${err instanceof Error ? err.message : err})`);
  }
}

export async function finishJob(id: string, result: unknown): Promise<void> {
  await sql()`
    update job set status = 'done', result = ${JSON.stringify(result)}::jsonb,
      finished_at = now()
    where id = ${id}
  `;
}

export async function failJob(id: string, error: string): Promise<void> {
  const stamped = `[${new Date().toISOString()}] ERROR: ${error}`;
  await sql()`
    update job set status = 'failed', logs = logs || ${stamped + "\n"},
      finished_at = now()
    where id = ${id}
  `;
}

/** Load a brief snapshot (specific version, or latest) for a meeting token. */
export async function loadBrief(
  token: string,
  version?: number,
): Promise<unknown | null> {
  const rows = version
    ? await sql()`
        select b.data from brief b
        join meeting_session s on s.id = b.meeting_session_id
        where s.token = ${token} and b.version = ${version}
      `
    : await sql()`
        select b.data from brief b
        join meeting_session s on s.id = b.meeting_session_id
        where s.token = ${token}
        order by b.version desc limit 1
      `;
  return rows.length ? rows[0].data : null;
}

/** Current generated Site JSON for a token (null before the first build). */
export async function getCurrentSite(token: string): Promise<unknown | null> {
  const rows = await sql()`select current_site from meeting_session where token = ${token}`;
  return rows.length ? (rows[0].current_site ?? null) : null;
}

/** Persist the current generated Site JSON (after build/revision). */
export async function saveCurrentSite(token: string, site: unknown): Promise<void> {
  await sql()`
    update meeting_session set current_site = ${JSON.stringify(site)}::jsonb, updated_at = now()
    where token = ${token}
  `;
  // Project owns the state (KAR-39); session mirrors during the transition.
  await sql()`
    update project set current_site = ${JSON.stringify(site)}::jsonb, updated_at = now()
    where id = (select project_id from meeting_session where token = ${token})
  `;
}

/** Publish prefix for a token: the project's sites/<slug>, else sites/<token>. */
export async function getPublishPrefix(token: string): Promise<string> {
  const rows = await sql()`
    select p.slug, p.r2_prefix
    from meeting_session s join project p on p.id = s.project_id
    where s.token = ${token}
  `;
  const slug = rows[0]?.slug as string | undefined;
  const stored = rows[0]?.r2_prefix as string | undefined;
  return stored ?? (slug ? `sites/${slug}` : `sites/${token}`);
}

/** Record where the project is published. */
export async function saveR2Prefix(token: string, r2Prefix: string): Promise<void> {
  await sql()`
    update project set r2_prefix = ${r2Prefix}, updated_at = now()
    where id = (select project_id from meeting_session where token = ${token})
  `;
}

/** Machine-validated phase transition (mirrors the portal's advancePhase). */
export async function advancePhase(token: string, to: Phase): Promise<boolean> {
  const rows = await sql()`select phase from meeting_session where token = ${token}`;
  const current = rows[0]?.phase as string | undefined;
  if (!current || !isPhase(current) || !canTransition(current, to)) return false;
  await sql()`
    update meeting_session set phase = ${to}, updated_at = now()
    where token = ${token}
  `;
  // Project owns the phase (KAR-39); session mirrors during the transition.
  await sql()`
    update project set phase = ${to}, updated_at = now()
    where id = (select project_id from meeting_session where token = ${token})
  `;
  return true;
}
