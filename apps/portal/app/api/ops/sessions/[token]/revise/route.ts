import { NextResponse } from "next/server";

import { isDbConfigured } from "@/lib/db";
import { enqueueJob } from "@/lib/jobs";
import { advancePhase } from "@/lib/meeting-repo";

// Ops action (KAR-41): queue a chat-driven revision — "kardeş şu metni
// değiştir". Behind CF Access (operator-initiated; the customer-facing channel
// comes later). The instruction is treated as data by the agent (ADR-0005).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
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
    const jobId = await enqueueJob("revise_site", {
      token,
      instruction: instruction.trim(),
    });
    const advanced = await advancePhase(token, "BUILDING");
    console.log(`[ops/revise] ${token.slice(0, 8)}… job=${jobId} advanced=${advanced}`);
    return NextResponse.json({ ok: true, jobId });
  } catch (err) {
    console.error("[ops/revise] failed", err);
    return NextResponse.json({ error: "revise_failed" }, { status: 500 });
  }
}
