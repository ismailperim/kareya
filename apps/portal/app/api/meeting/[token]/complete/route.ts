import { NextResponse } from "next/server";

import { safeParseBrief } from "@kareya/schemas";

import { isDbConfigured } from "@/lib/db";
import { enqueueJob } from "@/lib/jobs";
import { advancePhase, saveBrief, setPhase } from "@/lib/meeting-repo";

// Completes the meeting (KAR-23): saves a finalized, versioned Brief snapshot,
// advances the workflow phase, and notifies the agency. The customer then sees
// the next-step screen. Real proposal generation is a later phase.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length < 8) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const parsed = safeParseBrief((body as { brief?: unknown })?.brief ?? body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_brief" }, { status: 400 });
  }
  const brief = parsed.data;

  if (!isDbConfigured) {
    return NextResponse.json({ ok: true, persisted: false });
  }
  try {
    const version = await saveBrief(token, brief);
    await setPhase(token, "BRIEF_COMPLETED");
    // Agency notification (MVP: server log — a real channel like WhatsApp/email
    // comes later). This line is the hook a notifier plugs into.
    console.log(
      `[meeting/complete] 🔔 NEW BRIEF — session=${token.slice(0, 8)}… business="${brief.business.name ?? "?"}" archetype=${brief.archetype ?? "?"} version=${version}`,
    );

    // Workflow trigger (KAR-45): queue the site build; the runner picks it up.
    let jobId: string | null = null;
    try {
      jobId = await enqueueJob("build_site", { token, briefVersion: version });
      const advanced = await advancePhase(token, "BUILDING");
      if (!advanced) console.warn("[meeting/complete] phase not advanced to BUILDING");
      console.log(`[meeting/complete] build_site queued job=${jobId}`);
    } catch (err) {
      // Completion still succeeds for the customer; the build can be re-queued
      // from the ops dashboard.
      console.error("[meeting/complete] enqueue failed", err);
    }

    return NextResponse.json({ ok: true, persisted: true, version, jobId });
  } catch (err) {
    console.error("[meeting/complete] failed", err);
    return NextResponse.json({ error: "complete_failed" }, { status: 500 });
  }
}
