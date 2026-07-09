// Vendor-agnostic meeting session contract.
//
// The meeting room talks to the voice agent ONLY through `MeetingSession`.
// Swapping the voice vendor (ElevenLabs → Vapi/OpenAI Realtime, per ADR-0003)
// means writing a new adapter that implements this interface — nothing in the
// UI changes. The server mints a short-lived credential and tags it with a
// `provider`; the client factory picks the matching adapter.

export type MeetingStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

/** What the agent is currently doing, for the room's talk indicator. */
export type AgentMode = "listening" | "speaking";

/** A tool the agent invoked client-side (e.g. update_brief). */
export type MeetingToolCall = {
  name: string;
  parameters: Record<string, unknown>;
};

export interface MeetingSessionCallbacks {
  onStatusChange?: (status: MeetingStatus) => void;
  onModeChange?: (mode: AgentMode) => void;
  /** Return value (if any) is passed back to the agent as the tool result. */
  onToolCall?: (call: MeetingToolCall) => unknown | Promise<unknown>;
  onError?: (message: string) => void;
}

export interface MeetingSession {
  /** Open the audio session (requires an already-granted microphone). */
  start(): Promise<void>;
  /** Close the audio session and release the vendor connection. */
  stop(): Promise<void>;
}

/**
 * Short-lived credential minted server-side. `provider` selects the adapter;
 * `conversationToken` is opaque to the UI (only the adapter understands it).
 */
export type MeetingAuth = {
  provider: "elevenlabs";
  conversationToken: string;
};
