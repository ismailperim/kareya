import { NextResponse } from "next/server";

import { isDbConfigured } from "@/lib/db";
import { enqueueJob } from "@/lib/jobs";
import { advancePhase, getProjectForToken } from "@/lib/meeting-repo";

// Customer revision channel (KAR-57): "kardeş şu metni değiştir" from the
// meeting room (typed or via the voice agent's request_revision tool). The
// meeting token scopes authority to this project only; the instruction is
// treated as DATA by the dev agent (ADR-0005). PoC access sits behind CF
// Access; the staging+approval gate for LIVE sites is a follow-up.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length < 8) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }
  if (!isDbConfigured) return NextResponse.json({ error: "db_unconfigured" }, { status: 503 });

  let instruction: unknown;
  try {
    instruction = ((await req.json()) as { instruction?: unknown }).instruction;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (typeof instruction !== "string" || !instruction.trim() || instruction.length > 2000) {
    return NextResponse.json({ error: "invalid_instruction" }, { status: 400 });
  }

  try {
    // Only sessions with a built project can request revisions.
    const project = await getProjectForToken(token);
    if (!project?.r2_prefix) {
      return NextResponse.json({ error: "no_built_site" }, { status: 409 });
    }
    const jobId = await enqueueJob("revise_site", {
      token,
      instruction: instruction.trim(),
    });
    await advancePhase(token, "BUILDING");
    console.log(`[meeting/revise] ${project.slug} job=${jobId}`);
    return NextResponse.json({ ok: true, jobId });
  } catch (err) {
    console.error("[meeting/revise] failed", err);
    return NextResponse.json({ error: "revise_failed" }, { status: 500 });
  }
}
