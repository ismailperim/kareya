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
 * Neon HTTP driver; SKIP LOCKED prevents double-processing).
 */
export async function claimNextJob(): Promise<ClaimedJob | null> {
  const rows = await sql()`
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

/** Machine-validated phase transition (mirrors the portal's advancePhase). */
export async function advancePhase(token: string, to: Phase): Promise<boolean> {
  const rows = await sql()`select phase from meeting_session where token = ${token}`;
  const current = rows[0]?.phase as string | undefined;
  if (!current || !isPhase(current) || !canTransition(current, to)) return false;
  await sql()`
    update meeting_session set phase = ${to}, updated_at = now()
    where token = ${token}
  `;
  return true;
}
