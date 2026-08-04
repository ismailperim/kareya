import { NextResponse } from "next/server";

import { safeParseBrief } from "@kareya/schemas";

import { isDbConfigured } from "@/lib/db";
import { getDraft, saveDraft } from "@/lib/meeting-repo";

// Live brief draft for resume (KAR-26): GET rehydrates the room after a reload;
// PUT persists the current brief on every change.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length < 8) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }
  if (!isDbConfigured) return NextResponse.json({ brief: null });
  try {
    const draft = await getDraft(token);
    // Validate/normalize so the client always receives a well-formed brief.
    const parsed = draft ? safeParseBrief(draft) : null;
    return NextResponse.json({ brief: parsed?.success ? parsed.data : null });
  } catch (err) {
    console.error("[meeting/brief] load failed", err);
    return NextResponse.json({ brief: null });
  }
}

export async function PUT(
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
  if (!isDbConfigured) return NextResponse.json({ ok: true, persisted: false });
  try {
    await saveDraft(token, parsed.data);
    return NextResponse.json({ ok: true, persisted: true });
  } catch (err) {
    // Unknown token = no session was ever minted for it (KAR-42) — a real 404,
    // not a soft failure. Transient DB errors still degrade gracefully.
    if (err instanceof Error && err.message === "unknown_session") {
      return NextResponse.json({ error: "invalid_token" }, { status: 404 });
    }
    console.error("[meeting/brief] save failed", err);
    return NextResponse.json({ ok: true, persisted: false });
  }
}
