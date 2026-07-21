import { Conversation } from "@elevenlabs/client";

import { MEETING_TOOL_NAMES } from "./agent-config";
import type {
  AgentMode,
  MeetingSession,
  MeetingSessionCallbacks,
  MeetingStatus,
} from "./types";

// The only vendor-coupled file. Wraps the ElevenLabs Agents client SDK
// (@elevenlabs/client) behind the MeetingSession interface. Uses a WebRTC
// connection with a short-lived conversation token minted server-side.
export class ElevenLabsSession implements MeetingSession {
  private conversation: Awaited<
    ReturnType<typeof Conversation.startSession>
  > | null = null;

  constructor(
    private readonly conversationToken: string,
    private readonly callbacks: MeetingSessionCallbacks,
  ) {}

  async start(): Promise<void> {
    this.callbacks.onStatusChange?.("connecting");
    this.conversation = await Conversation.startSession({
      conversationToken: this.conversationToken,
      connectionType: "webrtc",
      // v2 brief-collection tools (KAR-22). Each forwards to the vendor-agnostic
      // callback; the room applies it to the Brief + gate and logs it. The
      // callback's return value is passed back to the agent (used by
      // check_completeness to report what's still missing).
      clientTools: Object.fromEntries(
        MEETING_TOOL_NAMES.map((name) => [
          name,
          async (params: Record<string, unknown>) => {
            const result = await this.callbacks.onToolCall?.({ name, parameters: params ?? {} });
            return typeof result === "string" ? result : "ok";
          },
        ]),
      ),
      onConnect: () => this.callbacks.onStatusChange?.("connected"),
      onDisconnect: () => this.callbacks.onStatusChange?.("disconnected"),
      onError: (message: string) => this.callbacks.onError?.(message),
      onStatusChange: ({ status }: { status: string }) =>
        this.callbacks.onStatusChange?.(normalizeStatus(status)),
      onModeChange: ({ mode }: { mode: string }) =>
        this.callbacks.onModeChange?.(mode === "speaking" ? "speaking" : "listening"),
    });
  }

  async stop(): Promise<void> {
    await this.conversation?.endSession();
    this.conversation = null;
  }
}

function normalizeStatus(status: string): MeetingStatus {
  switch (status) {
    case "connected":
      return "connected";
    case "connecting":
      return "connecting";
    case "disconnected":
    case "disconnecting":
      return "disconnected";
    default:
      return "idle";
  }
}

// Keep AgentMode referenced so the type stays in this adapter's surface.
export type { AgentMode };
