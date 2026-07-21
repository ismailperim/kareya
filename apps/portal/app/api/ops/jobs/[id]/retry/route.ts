import { NextResponse } from "next/server";

import { getDb, isDbConfigured } from "@/lib/db";
import { retryJob } from "@/lib/jobs";
import { advancePhase } from "@/lib/meeting-repo";

// Ops action (KAR-47): re-queue a failed job. Also moves the session's phase
// FAILED → BUILDING so the workflow reflects the retry. Behind CF Access.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isDbConfigured) return NextResponse.json({ error: "db_unconfigured" }, { status: 503 });
  try {
    const ok = await retryJob(id);
    if (!ok) return NextResponse.json({ error: "not_retryable" }, { status: 409 });

    // Best effort: reflect the retry in the workflow phase.
    const sql = getDb();
    const rows = await sql`select payload->>'token' as token from job where id = ${id}`;
    const token = rows[0]?.token as string | undefined;
    if (token) await advancePhase(token, "BUILDING");

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[ops/retry] failed", err);
    return NextResponse.json({ error: "retry_failed" }, { status: 500 });
  }
}
