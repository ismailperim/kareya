import type { BuildSiteJobPayload, JobType } from "@kareya/schemas";

import { getDb } from "@/lib/db";

// Job queue access for the portal side (KAR-45, ADR-0006): the portal only
// ENQUEUES and inspects; claiming/executing belongs to the runner (apps/runner).

export type JobRow = {
  id: string;
  type: JobType;
  payload: BuildSiteJobPayload | Record<string, unknown>;
  status: "queued" | "running" | "done" | "failed";
  attempts: number;
  logs: string;
  result: Record<string, unknown> | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
};

export async function enqueueJob(
  type: JobType,
  payload: BuildSiteJobPayload,
): Promise<string> {
  const sql = getDb();
  const rows = await sql`
    insert into job (type, payload)
    values (${type}, ${JSON.stringify(payload)}::jsonb)
    returning id
  `;
  return rows[0].id as string;
}

/** Recent jobs, newest first (ops dashboard). */
export async function listJobs(limit = 50): Promise<JobRow[]> {
  const sql = getDb();
  const rows = await sql`
    select id, type, payload, status, attempts, logs, result,
           created_at, started_at, finished_at
    from job order by created_at desc limit ${limit}
  `;
  return rows as unknown as JobRow[];
}

/** Re-queue a failed job (ops "retry"). */
export async function retryJob(id: string): Promise<boolean> {
  const sql = getDb();
  const rows = await sql`
    update job
    set status = 'queued', logs = logs || E'\n--- retried ---', finished_at = null
    where id = ${id} and status = 'failed'
    returning id
  `;
  return rows.length > 0;
}
