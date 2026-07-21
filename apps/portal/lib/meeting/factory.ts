import type {
  MeetingAuth,
  MeetingSession,
  MeetingSessionCallbacks,
} from "./types";

// Picks the adapter for the credential's provider. The vendor SDK is loaded
// via dynamic import so it stays out of the SSR/initial bundle and is only
// pulled in when the user actually connects (a client-side user gesture).
export type MeetingSessionOptions = {
  /** Resume context passed to the agent (KAR-26), e.g. { collected_summary }. */
  dynamicVariables?: Record<string, string>;
};

export async function createMeetingSession(
  auth: MeetingAuth,
  callbacks: MeetingSessionCallbacks,
  options: MeetingSessionOptions = {},
): Promise<MeetingSession> {
  switch (auth.provider) {
    case "elevenlabs": {
      const { ElevenLabsSession } = await import("./elevenlabs");
      return new ElevenLabsSession(auth.conversationToken, callbacks, options);
    }
    default:
      throw new Error(`Unknown voice provider: ${(auth as MeetingAuth).provider}`);
  }
}
