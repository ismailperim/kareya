import { Conversation } from "@elevenlabs/client";

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
      clientTools: {
        // The agent calls update_brief(field, value) as it learns each fact.
        // We forward it through the vendor-agnostic callback; the room turns
        // it into a live panel update + a server-side log.
        update_brief: async (params: { field: string; value: string }) => {
          const result = await this.callbacks.onToolCall?.({
            name: "update_brief",
            parameters: { field: params.field, value: params.value },
          });
          return typeof result === "string" ? result : "ok";
        },
      },
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
