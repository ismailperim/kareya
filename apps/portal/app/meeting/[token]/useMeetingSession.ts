"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createEmptyBrief,
  evaluateGate,
  formatGateSignal,
  type Brief,
  type GateResult,
} from "@kareya/schemas";

import { applyToolCall } from "@/lib/meeting/brief-reducer";
import { createMeetingSession } from "@/lib/meeting/factory";
import type {
  AgentMode,
  MeetingAuth,
  MeetingSession,
  MeetingStatus,
  MeetingToolCall,
} from "@/lib/meeting/types";

export type UseMeetingSession = {
  status: MeetingStatus;
  mode: AgentMode | null;
  /** Live Brief assembled from the agent's tool calls (KAR-22). */
  brief: Brief;
  /** Completeness gate over the live brief (KAR-21). */
  gate: GateResult;
  error: string | null;
  voiceConfigured: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

export function useMeetingSession(token: string): UseMeetingSession {
  const [status, setStatus] = useState<MeetingStatus>("idle");
  const [mode, setMode] = useState<AgentMode | null>(null);
  const [brief, setBrief] = useState<Brief>(() => createEmptyBrief());
  const [error, setError] = useState<string | null>(null);
  const [voiceConfigured, setVoiceConfigured] = useState(true);
  const sessionRef = useRef<MeetingSession | null>(null);
  // Source of truth for tool-call reduction — kept current so check_completeness
  // reflects the very latest brief even between renders.
  const briefRef = useRef<Brief>(brief);

  const gate = useMemo(() => evaluateGate(brief), [brief]);

  const logEvent = useCallback(
    (call: MeetingToolCall) => {
      void fetch(`/api/meeting/${token}/brief-event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: call.name,
          field: typeof call.parameters.path === "string" ? call.parameters.path : null,
          value: typeof call.parameters.value === "string" ? call.parameters.value : null,
          payload: call.parameters,
        }),
      }).catch(() => {});
    },
    [token],
  );

  const handleToolCall = useCallback(
    (call: MeetingToolCall): unknown => {
      // The agent asks what's still missing; answer from the latest brief.
      if (call.name === "check_completeness") {
        return formatGateSignal(evaluateGate(briefRef.current));
      }
      const next = applyToolCall(briefRef.current, call);
      briefRef.current = next;
      setBrief(next);
      logEvent(call);
      return "ok";
    },
    [logEvent],
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
        onToolCall: handleToolCall,
      });
      sessionRef.current = session;
      await session.start();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Ses bağlantısı kurulamadı.");
    }
  }, [status, token, handleToolCall]);

  const disconnect = useCallback(async () => {
    await sessionRef.current?.stop();
    sessionRef.current = null;
    setMode(null);
    setStatus("disconnected");
  }, []);

  useEffect(() => {
    return () => {
      void sessionRef.current?.stop();
      sessionRef.current = null;
    };
  }, []);

  return { status, mode, brief, gate, error, voiceConfigured, connect, disconnect };
}
