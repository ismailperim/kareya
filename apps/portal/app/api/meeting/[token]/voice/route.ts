import { NextResponse } from "next/server";

import { isDbConfigured } from "@/lib/db";
import { getSessionId } from "@/lib/meeting-repo";

// Mints a short-lived ElevenLabs conversation token for a WebRTC session.
// The API key is server-only and NEVER sent to the client — the client
// receives only the opaque per-session token (see ADR-0003 + docs).
//
// Returns 503 `voice_not_configured` when the env is not set, so the room can
// render a graceful "voice not configured yet" state instead of crashing.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  // Voice minutes cost money: only sessions that actually exist (minted via
  // invite code or ops — KAR-42) may mint a conversation token.
  if (!token || token.length < 8) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }
  if (isDbConfigured && !(await getSessionId(token))) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!apiKey || !agentId) {
    return NextResponse.json(
      { error: "voice_not_configured" },
      { status: 503 },
    );
  }

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { "xi-api-key": apiKey } },
    );
    if (!res.ok) {
      const detail = await res.text();
      console.error("[meeting/voice] token mint failed", res.status, detail);
      return NextResponse.json({ error: "token_mint_failed" }, { status: 502 });
    }
    const data = (await res.json()) as { token?: string };
    if (!data.token) {
      return NextResponse.json({ error: "token_mint_failed" }, { status: 502 });
    }
    return NextResponse.json({
      provider: "elevenlabs",
      conversationToken: data.token,
    });
  } catch (err) {
    console.error("[meeting/voice] token mint error", err);
    return NextResponse.json({ error: "token_mint_failed" }, { status: 502 });
  }
}
