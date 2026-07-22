import { NextResponse } from "next/server";

import { isDbConfigured } from "@/lib/db";
import { createInviteCode, listInviteCodes } from "@/lib/meeting-repo";

// Ops invite management (KAR-42). Behind the /api/ops Basic Auth middleware.

export async function GET() {
  if (!isDbConfigured) return NextResponse.json({ codes: [] });
  return NextResponse.json({ codes: await listInviteCodes() });
}

export async function POST(req: Request) {
  if (!isDbConfigured) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as {
      code?: string;
      note?: string;
      maxUses?: number;
      expiresAt?: string;
    };
    const created = await createInviteCode(body);
    return NextResponse.json({ code: created });
  } catch (err) {
    console.error("[ops/invites] create failed", err);
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }
}
