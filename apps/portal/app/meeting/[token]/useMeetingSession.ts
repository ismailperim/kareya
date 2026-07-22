"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createEmptyBrief,
  evaluateGate,
  formatGateSignal,
  type Brief,
  type GateResult,
} from "@kareya/schemas";

import { applyToolCall, buildCollectedSummary } from "@/lib/meeting/brief-reducer";
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

  // Persist the live brief draft so a reload/reconnect can resume (KAR-26).
  const persistDraft = useCallback(
    (next: Brief) => {
      void fetch(`/api/meeting/${token}/brief`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: next }),
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
      persistDraft(next);
      return "ok";
    },
    [logEvent, persistDraft],
  );

  // Rehydrate from the saved draft on load (resume after reload).
  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/meeting/${token}/brief`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { brief?: Brief } | null) => {
        if (!cancelled && data?.brief) {
          briefRef.current = data.brief;
          setBrief(data.brief);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token]);

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
      const summary = buildCollectedSummary(briefRef.current);
      // Resume-aware opening (KAR-56): a half-finished meeting is continued,
      // not restarted — the greeting reflects that.
      const businessName = briefRef.current.business.name;
      const greeting = summary
        ? `Tekrar hoş geldiniz! ${businessName ? businessName + " için başladığımız" : "Başladığımız"} görüşmeye kaldığımız yerden devam edelim. Notlarım duruyor — hazırsanız sürdürelim.`
        : "Merhaba, ben Kareya'nın proje danışmanıyım. Size gerçekten yakışan bir web sitesi çıkarabilmemiz için biraz sohbet edip işinizi tanımak istiyorum. Öncelikle, ne iş yaptığınızı biraz anlatır mısınız?";
      const session = await createMeetingSession(
        auth,
        {
          onStatusChange: setStatus,
          onModeChange: setMode,
          onError: (message) => {
            setStatus("error");
            setError(message || "Beklenmeyen bir ses hatası oluştu.");
          },
          onToolCall: handleToolCall,
        },
        {
          dynamicVariables: {
            collected_summary: summary || "Henüz bilgi toplanmadı.",
            greeting,
          },
        },
      );
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
