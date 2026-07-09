"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createMeetingSession } from "@/lib/meeting/factory";
import type {
  AgentMode,
  MeetingAuth,
  MeetingSession,
  MeetingStatus,
} from "@/lib/meeting/types";

export type UseMeetingSession = {
  status: MeetingStatus;
  mode: AgentMode | null;
  /** Brief facts collected live via update_brief tool-calls (KAR-15 panel). */
  brief: Record<string, string>;
  error: string | null;
  /** false once the server reports the voice vendor is not configured. */
  voiceConfigured: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

export function useMeetingSession(token: string): UseMeetingSession {
  const [status, setStatus] = useState<MeetingStatus>("idle");
  const [mode, setMode] = useState<AgentMode | null>(null);
  const [brief, setBrief] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [voiceConfigured, setVoiceConfigured] = useState(true);
  const sessionRef = useRef<MeetingSession | null>(null);

  const handleBrief = useCallback(
    (field: string, value: string) => {
      setBrief((prev) => ({ ...prev, [field]: value }));
      // Fire-and-forget server-side log (KAR-14 acceptance).
      void fetch(`/api/meeting/${token}/brief-event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, value }),
      }).catch(() => {});
    },
    [token],
  );

  const connect = useCallback(async () => {
    if (status === "connecting" || status === "connected") return;
    setError(null);
    setStatus("connecting");
    try {
      const res = await fetch(`/api/meeting/${token}/voice`, { method: "POST" });
      if (res.status === 503) {
        setVoiceConfigured(false);
        setStatus("idle");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        setError("Ses bağlantısı başlatılamadı. Lütfen tekrar deneyin.");
        return;
      }
      const auth = (await res.json()) as MeetingAuth;
      const session = await createMeetingSession(auth, {
        onStatusChange: setStatus,
        onModeChange: setMode,
        onError: (message) => {
          setStatus("error");
          setError(message || "Beklenmeyen bir ses hatası oluştu.");
        },
        onToolCall: (call) => {
          if (call.name === "update_brief") {
            const { field, value } = call.parameters as {
              field?: string;
              value?: string;
            };
            if (typeof field === "string" && typeof value === "string") {
              handleBrief(field, value);
            }
          }
          return "ok";
        },
      });
      sessionRef.current = session;
      await session.start();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Ses bağlantısı kurulamadı.");
    }
  }, [status, token, handleBrief]);

  const disconnect = useCallback(async () => {
    await sessionRef.current?.stop();
    sessionRef.current = null;
    setMode(null);
    setStatus("disconnected");
  }, []);

  // Ensure the vendor connection is released if the room unmounts mid-call.
  useEffect(() => {
    return () => {
      void sessionRef.current?.stop();
      sessionRef.current = null;
    };
  }, []);

  return { status, mode, brief, error, voiceConfigured, connect, disconnect };
}
