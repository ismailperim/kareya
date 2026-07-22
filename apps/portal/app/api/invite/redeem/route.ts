import { NextResponse } from "next/server";

import { isDbConfigured } from "@/lib/db";
import { redeemInviteCode } from "@/lib/meeting-repo";

// Invite redemption (KAR-42): the public entry gate. A valid code atomically
// consumes one use and mints a fresh meeting session; the customer lands in
// their room. The code IS the secret — no extra auth on this route.
export async function POST(req: Request) {
  if (!isDbConfigured) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  let code = "";
  try {
    const body = (await req.json()) as { code?: string };
    code = String(body.code ?? "").trim();
  } catch {
    /* fall through to the empty-code check */
  }
  if (!code || code.length > 100) {
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }
  try {
    const token = await redeemInviteCode(code);
    if (!token) {
      return NextResponse.json({ error: "invalid_code" }, { status: 404 });
    }
    return NextResponse.json({ token, room: `/meeting/${token}` });
  } catch (err) {
    console.error("[invite/redeem] failed", err);
    return NextResponse.json({ error: "redeem_failed" }, { status: 500 });
  }
}
