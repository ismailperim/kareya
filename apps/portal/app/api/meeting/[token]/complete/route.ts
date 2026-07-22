import { NextResponse } from "next/server";

import { safeParseBrief } from "@kareya/schemas";

import { isDbConfigured } from "@/lib/db";
import { enqueueJob } from "@/lib/jobs";
import {
  advancePhase,
  findOrCreateProjectForSession,
  linkBriefToProject,
  saveBrief,
  setPhase,
} from "@/lib/meeting-repo";

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

    // Project attach (KAR-39): the approved meeting becomes/joins a PROJECT —
    // the durable entity owning phase, site state and the publish location.
    let jobId: string | null = null;
    let projectSlug: string | null = null;
    try {
      const project = await findOrCreateProjectForSession(
        token,
        brief.business.name ?? "",
      );
      projectSlug = project.slug;
      await linkBriefToProject(token, version, project.id);
      console.log(`[meeting/complete] project=${project.slug} (${project.id.slice(0, 8)}…)`);

      // Workflow trigger (KAR-45; KAR-63 split): queue the writer stage — it
      // chains a build_publish job when the sources are ready.
      jobId = await enqueueJob("write_code", {
        token,
        briefVersion: version,
        projectId: project.id,
        slug: project.slug,
      });
      const advanced = await advancePhase(token, "BUILDING");
      if (!advanced) console.warn("[meeting/complete] phase not advanced to BUILDING");
      console.log(`[meeting/complete] write_code queued job=${jobId}`);
    } catch (err) {
      // Completion still succeeds for the customer; the build can be re-queued
      // from the ops dashboard.
      console.error("[meeting/complete] project/enqueue failed", err);
    }

    return NextResponse.json({ ok: true, persisted: true, version, jobId, projectSlug });
  } catch (err) {
    console.error("[meeting/complete] failed", err);
    return NextResponse.json({ error: "complete_failed" }, { status: 500 });
  }
}
