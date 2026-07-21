import { NextResponse } from "next/server";

import { isPhase } from "@kareya/schemas";

import { isDbConfigured } from "@/lib/db";
import { advancePhase } from "@/lib/meeting-repo";

// Ops action (KAR-47): human-gated, machine-validated phase transition
// (e.g. PREVIEW_READY → LIVE — the Faz-a approval gate). Behind CF Access.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!isDbConfigured) return NextResponse.json({ error: "db_unconfigured" }, { status: 503 });

  let to: unknown;
  try {
    to = ((await req.json()) as { to?: unknown }).to;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (!isPhase(to)) return NextResponse.json({ error: "invalid_phase" }, { status: 400 });

  try {
    const ok = await advancePhase(token, to);
    if (!ok) return NextResponse.json({ error: "invalid_transition" }, { status: 409 });
    console.log(`[ops/phase] ${token.slice(0, 8)}… → ${to}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[ops/phase] failed", err);
    return NextResponse.json({ error: "phase_failed" }, { status: 500 });
  }
}
