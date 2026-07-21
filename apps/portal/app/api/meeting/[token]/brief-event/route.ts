import { NextResponse } from "next/server";

import { isDbConfigured } from "@/lib/db";
import { recordBriefEvent } from "@/lib/meeting-repo";

// Server-side sink for the meeting agent's tool-calls (KAR-22): set_archetype,
// update_field, set_flag, update_section, set_feature, append_note. Persists to
// Neon (KAR-20). Fire-and-forget from the client, so a DB failure is logged but
// never breaks the meeting — the response still succeeds.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length < 8) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }

  let body: { kind?: unknown; field?: unknown; value?: unknown; payload?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const kind = typeof body.kind === "string" && body.kind ? body.kind : "update_brief";
  const field = typeof body.field === "string" ? body.field : null;
  const value = typeof body.value === "string" ? body.value : null;

  console.log(
    `[meeting/brief-event] session=${token.slice(0, 8)}… ${kind}${field ? ` field=${field}` : ""}${value ? ` value=${value}` : ""}`,
  );

  if (!isDbConfigured) {
    return NextResponse.json({ ok: true, persisted: false });
  }
  try {
    await recordBriefEvent(token, { kind, field, value, payload: body.payload });
    return NextResponse.json({ ok: true, persisted: true });
  } catch (err) {
    console.error("[meeting/brief-event] persist failed", err);
    return NextResponse.json({ ok: true, persisted: false });
  }
}
