"use client";

import { useCallback, useState } from "react";

import type { Brief, GateResult } from "@kareya/schemas";

import type { AgentMode, MeetingStatus } from "@/lib/meeting/types";
import { useMeetingSession } from "./useMeetingSession";

type Step = "consent" | "mic" | "room";
type MicStatus = "idle" | "requesting" | "granted" | "denied";

export function MeetingRoom({ token }: { token: string }) {
  const [step, setStep] = useState<Step>("consent");
  const [micStatus, setMicStatus] = useState<MicStatus>("idle");
  const [micError, setMicError] = useState<string | null>(null);

  const requestMic = useCallback(async () => {
    setMicStatus("requesting");
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Permission granted; stop the stream for now — the audio session is
      // set up in KAR-14 behind the MeetingSession abstraction.
      stream.getTracks().forEach((t) => t.stop());
      setMicStatus("granted");
      setStep("room");
    } catch (err) {
      setMicStatus("denied");
      setMicError(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Mikrofon izni reddedildi. Görüşme için tarayıcı ayarlarından izin verin."
          : "Mikrofona erişilemedi. Cihaz ve bağlantıyı kontrol edin.",
      );
    }
  }, []);

  return (
    <div className="relative min-h-screen bg-gray-50">
      <HumanHandoffButton />
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center p-6">
        {step === "consent" && <ConsentStep onAccept={() => setStep("mic")} />}
        {step === "mic" && (
          <MicStep status={micStatus} error={micError} onRequest={requestMic} />
        )}
        {step === "room" && <RoomView token={token} />}
      </div>
    </div>
  );
}

// KVKK consent gate — must be accepted before entering the room.
function ConsentStep({ onAccept }: { onAccept: () => void }) {
  const [checked, setChecked] = useState(false);
  return (
    <section className="w-full rounded-2xl bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold">Görüşme Odası</h1>
      <p className="mt-2 text-gray-600">
        Görüşmeye başlamadan önce onayınız gerekiyor.
      </p>
      <div className="mt-6 space-y-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
        <p>
          Bu görüşme, talebinizi doğru hazırlayabilmek için{" "}
          <strong>ses kaydı ve metne dökme (transkript)</strong> yoluyla işlenir.
          Kayıtlar yalnızca bu amaçla kullanılır.
        </p>
        <p>
          Devam ederek KVKK kapsamında görüşmenin kaydedilmesini ve işlenmesini
          kabul etmiş olursunuz. Dilediğiniz an “İnsanla devam et” ile temsilciye
          bağlanabilirsiniz.
        </p>
      </div>
      <label className="mt-4 flex items-start gap-3 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-1"
        />
        <span>Görüşmenin kaydedilmesini ve işlenmesini onaylıyorum.</span>
      </label>
      <button
        type="button"
        disabled={!checked}
        onClick={onAccept}
        className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40"
      >
        Onaylıyorum ve devam et
      </button>
    </section>
  );
}

// Microphone permission request with granted/denied handling.
function MicStep({
  status,
  error,
  onRequest,
}: {
  status: MicStatus;
  error: string | null;
  onRequest: () => void;
}) {
  return (
    <section className="w-full rounded-2xl bg-white p-8 text-center shadow-sm">
      <h2 className="text-xl font-semibold">Mikrofon izni</h2>
      <p className="mt-2 text-gray-600">
        Sesli görüşme için mikrofonunuza erişim gerekiyor.
      </p>
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={onRequest}
        disabled={status === "requesting"}
        className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition disabled:opacity-40"
      >
        {status === "requesting"
          ? "İzin isteniyor…"
          : status === "denied"
            ? "Tekrar dene"
            : "Mikrofona izin ver"}
      </button>
    </section>
  );
}

// Room layout: live voice panel (KAR-14) + live brief panel (KAR-15).
function RoomView({ token }: { token: string }) {
  const { status, mode, brief, gate, error, voiceConfigured, connect, disconnect } =
    useMeetingSession(token);

  return (
    <div className="w-full">
      <div className="grid gap-4 md:grid-cols-2">
        <VoicePanel
          status={status}
          mode={mode}
          error={error}
          voiceConfigured={voiceConfigured}
          onConnect={connect}
          onDisconnect={disconnect}
        />

        <BriefPanel brief={brief} gate={gate} />
      </div>
      <p className="mt-4 text-center text-xs text-gray-400">
        Oturum: {token.slice(0, 8)}…
      </p>
    </div>
  );
}

// Live brief panel — the "notlarımı alıyor" trust UX. Fields + free-form notes
// fill in real time as the agent calls its tools; the completeness gate (KAR-21)
// drives the "tamamla" button. The full section-map view arrives in KAR-24.
function BriefPanel({ brief, gate }: { brief: Brief; gate: GateResult }) {
  const rows: { label: string; value: string | null | undefined }[] = [
    { label: "İşletme", value: brief.business.name },
    { label: "Sektör", value: brief.business.sector },
    { label: "Arketip", value: brief.archetype },
    { label: "Slogan", value: brief.business.tagline },
  ];

  return (
    <section className="flex min-h-[320px] flex-col rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Brief</h2>
        <span
          className={[
            "rounded-full px-2 py-0.5 text-xs font-medium",
            gate.canComplete ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700",
          ].join(" ")}
        >
          {gate.canComplete ? "Hazır" : `${gate.missing.length} eksik`}
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Görüşme sırasında notlarınız burada belirir.
      </p>

      <dl className="mt-4 space-y-2">
        {rows.map(({ label, value }) => (
          <div
            key={label}
            className={[
              "rounded-lg px-3 py-2 transition-colors",
              value ? "bg-blue-50" : "bg-gray-50",
            ].join(" ")}
          >
            <dt className="text-xs uppercase tracking-wide text-gray-400">{label}</dt>
            <dd className={value ? "text-sm font-medium text-gray-800" : "text-sm text-gray-300"}>
              {value || "—"}
            </dd>
          </div>
        ))}
      </dl>

      {brief.notes && (
        <div className="mt-3">
          <div className="text-xs uppercase tracking-wide text-gray-400">Görüşme notları</div>
          <p className="mt-1 max-h-28 overflow-y-auto whitespace-pre-line rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
            {brief.notes}
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={!gate.canComplete}
        className="mt-auto w-full rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {gate.canComplete ? "Brief'i onayla" : "Görüşme sürüyor…"}
      </button>
    </section>
  );
}

// Live voice panel: connect/disconnect + connection status + talk indicator.
// Falls back to a "not configured yet" state when the server has no voice env.
function VoicePanel({
  status,
  mode,
  error,
  voiceConfigured,
  onConnect,
  onDisconnect,
}: {
  status: MeetingStatus;
  mode: AgentMode | null;
  error: string | null;
  voiceConfigured: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const connected = status === "connected";
  const connecting = status === "connecting";

  return (
    <section className="flex min-h-[320px] flex-col rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Görüşme</h2>
      <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div
          className={[
            "flex h-20 w-20 items-center justify-center rounded-full transition",
            connected && mode === "speaking"
              ? "animate-pulse bg-blue-500"
              : connected
                ? "bg-blue-100"
                : connecting
                  ? "animate-pulse bg-gray-200"
                  : "bg-gray-100",
          ].join(" ")}
        >
          <span className="text-2xl">🎙️</span>
        </div>

        {!voiceConfigured ? (
          <p className="max-w-xs text-sm text-gray-500">
            Sesli görüşme henüz yapılandırılmadı. Kısa süre içinde aktif olacak.
          </p>
        ) : connected ? (
          <p className="text-sm font-medium text-gray-700">
            {mode === "speaking" ? "Ajan konuşuyor…" : "Sizi dinliyorum…"}
          </p>
        ) : connecting ? (
          <p className="text-sm text-gray-500">Bağlanıyor…</p>
        ) : (
          <p className="max-w-xs text-sm text-gray-500">
            Hazır olduğunuzda görüşmeyi başlatın; sesli asistan sizi karşılayacak.
          </p>
        )}

        {error && (
          <p className="max-w-xs rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {voiceConfigured &&
          (connected ? (
            <button
              type="button"
              onClick={onDisconnect}
              className="rounded-xl bg-gray-900 px-6 py-3 font-medium text-white transition hover:bg-gray-800"
            >
              Görüşmeyi bitir
            </button>
          ) : (
            <button
              type="button"
              onClick={onConnect}
              disabled={connecting}
              className="rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-40"
            >
              {status === "error" ? "Tekrar dene" : "Görüşmeyi başlat"}
            </button>
          ))}
      </div>
    </section>
  );
}

// Always-visible escalation to a human (placeholder action for now).
function HumanHandoffButton() {
  const [requested, setRequested] = useState(false);
  return (
    <div className="fixed right-4 top-4 z-10 flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setRequested(true)}
        className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
      >
        İnsanla devam et
      </button>
      {requested && (
        <span className="max-w-[220px] rounded-lg bg-gray-900 px-3 py-1.5 text-right text-xs text-white">
          Talebiniz alındı — bir temsilci sizinle iletişime geçecek (yakında).
        </span>
      )}
    </div>
  );
}
