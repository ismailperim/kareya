import { NextResponse } from "next/server";

import { isDbConfigured } from "@/lib/db";
import { recordBriefEvent } from "@/lib/meeting-repo";

// Server-side sink for update_brief tool-calls (KAR-14 acceptance: the tool
// call is triggered AND logged server-side). For now it logs; persisting brief
// events to Neon and building the real Brief JSON is a later ticket
// (schema-guardian / database-dev).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length < 8) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }

  let field: unknown;
  let value: unknown;
  try {
    const body = (await req.json()) as { field?: unknown; value?: unknown };
    field = body.field;
    value = body.value;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (typeof field !== "string" || typeof value !== "string") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  console.log(
    `[meeting/brief-event] session=${token.slice(0, 8)}… update_brief field=${field} value=${value}`,
  );

  // Persist to Neon (KAR-20). Fire-and-forget from the client, so a DB failure
  // is logged but must not break the meeting — the response still succeeds.
  if (!isDbConfigured) {
    return NextResponse.json({ ok: true, persisted: false });
  }
  try {
    await recordBriefEvent(token, { kind: "update_brief", field, value });
    return NextResponse.json({ ok: true, persisted: true });
  } catch (err) {
    console.error("[meeting/brief-event] persist failed", err);
    return NextResponse.json({ ok: true, persisted: false });
  }
}
