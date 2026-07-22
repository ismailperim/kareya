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

export type RoomStatus = {
  phase: string | null;
  siteReady: boolean;
  building: boolean;
};

export type UseMeetingSession = {
  status: MeetingStatus;
  mode: AgentMode | null;
  /** Live Brief assembled from the agent's tool calls (KAR-22). */
  brief: Brief;
  /** Completeness gate over the live brief (KAR-21). */
  gate: GateResult;
  /** Project state of this room (KAR-57): brief mode vs site-ready mode. */
  room: RoomStatus;
  error: string | null;
  voiceConfigured: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  /** Written revision from the room panel; returns true when queued. */
  submitRevision: (instruction: string) => Promise<boolean>;
  refreshStatus: () => Promise<void>;
};

export function useMeetingSession(token: string): UseMeetingSession {
  const [status, setStatus] = useState<MeetingStatus>("idle");
  const [mode, setMode] = useState<AgentMode | null>(null);
  const [brief, setBrief] = useState<Brief>(() => createEmptyBrief());
  const [error, setError] = useState<string | null>(null);
  const [voiceConfigured, setVoiceConfigured] = useState(true);
  const [room, setRoom] = useState<RoomStatus>({ phase: null, siteReady: false, building: false });
  const roomRef = useRef<RoomStatus>(room);
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

  // Project status (KAR-57): brief mode vs site-ready mode; polled so a queued
  // build/revision flips the room when it finishes.
  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/meeting/${token}/status`);
      if (!res.ok) return;
      const data = (await res.json()) as RoomStatus;
      const next = {
        phase: data.phase ?? null,
        siteReady: !!data.siteReady,
        building: !!data.building,
      };
      roomRef.current = next;
      setRoom(next);
    } catch {
      /* keep last known */
    }
  }, [token]);

  useEffect(() => {
    void refreshStatus();
    const t = setInterval(() => void refreshStatus(), 15000);
    return () => clearInterval(t);
  }, [refreshStatus]);

  // Written revision channel (room panel).
  const submitRevision = useCallback(
    async (instruction: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/meeting/${token}/revise`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instruction }),
        });
        if (res.ok) void refreshStatus();
        return res.ok;
      } catch {
        return false;
      }
    },
    [token, refreshStatus],
  );

  const handleToolCall = useCallback(
    async (call: MeetingToolCall): Promise<unknown> => {
      // The agent asks what's still missing; answer from the latest brief.
      if (call.name === "check_completeness") {
        return formatGateSignal(evaluateGate(briefRef.current));
      }
      // Voice revision (KAR-57): forward to the customer revision channel.
      if (call.name === "request_revision") {
        const instruction = String(call.parameters.instruction ?? "").trim();
        if (!instruction) return "Talep boş — müşteriden netleştirme iste.";
        logEvent(call);
        const ok = await submitRevision(instruction);
        return ok
          ? "Talep alındı; birkaç dakika içinde siteye yansıyacak."
          : "Talep iletilemedi — müşteriden az sonra tekrar denemesini iste.";
      }
      const next = applyToolCall(briefRef.current, call);
      briefRef.current = next;
      setBrief(next);
      logEvent(call);
      persistDraft(next);
      return "ok";
    },
    [logEvent, persistDraft, submitRevision],
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
      // Phase-aware opening (KAR-56/57): revision mode when the site is built;
      // resume when a half-finished brief exists; fresh otherwise.
      const businessName = briefRef.current.business.name;
      const { siteReady, building } = roomRef.current;
      const greeting = siteReady
        ? `Tekrar hoş geldiniz! ${businessName ? businessName + " siteniz" : "Siteniz"} ${building ? "şu an güncelleniyor" : "hazır"} — sağdaki panelden önizleyebilirsiniz. Değiştirmek istediğiniz bir şey var mı?`
        : summary
          ? `Tekrar hoş geldiniz! ${businessName ? businessName + " için başladığımız" : "Başladığımız"} görüşmeye kaldığımız yerden devam edelim. Notlarım duruyor — hazırsanız sürdürelim.`
          : "Merhaba, ben Kareya'nın proje danışmanıyım. Size gerçekten yakışan bir web sitesi çıkarabilmemiz için biraz sohbet edip işinizi tanımak istiyorum. Öncelikle, ne iş yaptığınızı biraz anlatır mısınız?";
      const siteStatus = siteReady ? "yayında" : "henüz yok";
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
            site_status: siteStatus,
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

  return {
    status,
    mode,
    brief,
    gate,
    room,
    error,
    voiceConfigured,
    connect,
    disconnect,
    submitRevision,
    refreshStatus,
  };
}
