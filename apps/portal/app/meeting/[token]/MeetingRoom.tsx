"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import { ARCHETYPE_SECTIONS, type Brief, type GateResult } from "@kareya/schemas";

import type { AgentMode, MeetingStatus } from "@/lib/meeting/types";
import { useMeetingSession } from "./useMeetingSession";

type Step = "consent" | "mic" | "room";
type MicStatus = "idle" | "requesting" | "granted" | "denied";

// Brand logomark (kare motif — a square framing a nested square) + wordmark.
function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width="28" height="28" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="kareyaHdr" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366F1" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="12" fill="url(#kareyaHdr)" />
        <rect x="13" y="13" width="22" height="22" rx="5" stroke="#fff" strokeWidth="3" />
        <rect x="23.5" y="23.5" width="11.5" height="11.5" rx="3" fill="#fff" />
      </svg>
      <span className="text-lg font-semibold tracking-tight text-gray-900">kareya</span>
    </span>
  );
}

export function MeetingRoom({ token }: { token: string }) {
  const [step, setStep] = useState<Step>("consent");
  const [micStatus, setMicStatus] = useState<MicStatus>("idle");
  const [micError, setMicError] = useState<string | null>(null);

  const requestMic = useCallback(async () => {
    setMicStatus("requesting");
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Permission granted; stop the stream — the audio session opens later
      // behind the MeetingSession abstraction.
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
    <div className="relative min-h-screen bg-gradient-to-b from-indigo-50/70 via-white to-white">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/75 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <Logo />
          <HumanHandoffButton />
        </div>
      </header>
      <main className="mx-auto flex min-h-[calc(100vh-58px)] max-w-5xl items-center justify-center p-5 sm:p-6">
        {step === "consent" && <ConsentStep onAccept={() => setStep("mic")} />}
        {step === "mic" && (
          <MicStep status={micStatus} error={micError} onRequest={requestMic} />
        )}
        {step === "room" && <RoomView token={token} />}
      </main>
    </div>
  );
}

// KVKK consent gate — must be accepted before entering the room.
function ConsentStep({ onAccept }: { onAccept: () => void }) {
  const [checked, setChecked] = useState(false);
  return (
    <section className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-xl shadow-indigo-500/5 ring-1 ring-black/5">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xl text-white shadow-lg shadow-indigo-500/20">
        💬
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-gray-900">
        Görüşme Odası
      </h1>
      <p className="mt-2 text-gray-600">
        Size gerçekten yakışan bir web sitesi çıkarmak için kısa bir sohbet
        edeceğiz. Başlamadan önce onayınız gerekiyor.
      </p>
      <div className="mt-6 space-y-3 rounded-2xl bg-indigo-50/60 p-4 text-sm text-gray-600">
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
          className="mt-1 h-4 w-4 rounded border-gray-300 accent-indigo-600"
        />
        <span>Görüşmenin kaydedilmesini ve işlenmesini onaylıyorum.</span>
      </label>
      <button
        type="button"
        disabled={!checked}
        onClick={onAccept}
        className="mt-6 w-full rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-3 font-medium text-white shadow-lg shadow-indigo-600/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
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
    <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl shadow-indigo-500/5 ring-1 ring-black/5">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-2xl text-white shadow-lg shadow-indigo-500/20">
        🎤
      </div>
      <h2 className="mt-5 text-xl font-semibold text-gray-900">Mikrofon izni</h2>
      <p className="mt-2 text-gray-600">
        Sesli görüşme için mikrofonunuza erişim gerekiyor.
      </p>
      {error && (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}
      <button
        type="button"
        onClick={onRequest}
        disabled={status === "requesting"}
        className="mt-6 w-full rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-3 font-medium text-white shadow-lg shadow-indigo-600/20 transition hover:opacity-95 disabled:opacity-40"
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

// Room layout: live voice panel (KAR-14/25) + live brief panel (KAR-24).
function RoomView({ token }: { token: string }) {
  const { status, mode, brief, gate, error, voiceConfigured, connect, disconnect } =
    useMeetingSession(token);

  return (
    <div className="w-full">
      <div className="grid items-start gap-5 md:grid-cols-2">
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

// Consultant avatar: two looping clips (speaking / listening) crossfaded by the
// agent's mode (KAR-25). Honors prefers-reduced-motion with a static poster.
function AvatarVideo({ speaking }: { speaking: boolean }) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (reduced) {
    return (
      <video
        src="/avatar/listening.mp4"
        poster="/avatar/poster.jpg"
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }

  return (
    <>
      <video
        src="/avatar/listening.mp4"
        poster="/avatar/poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        className={[
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
          speaking ? "opacity-0" : "opacity-100",
        ].join(" ")}
      />
      <video
        src="/avatar/speaking.mp4"
        poster="/avatar/poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        className={[
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
          speaking ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />
    </>
  );
}

// Live voice panel: avatar + connect/disconnect + connection status + talk state.
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
  const speaking = connected && mode === "speaking";

  return (
    <section className="flex min-h-[420px] flex-col items-center rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <h2 className="self-start text-sm font-semibold uppercase tracking-wide text-gray-400">
        Danışman
      </h2>

      <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <div className="relative h-48 w-48">
          <div className="relative h-full w-full overflow-hidden rounded-3xl bg-gray-100 shadow-lg ring-1 ring-black/5">
            <AvatarVideo speaking={speaking} />
            {connecting && <div className="absolute inset-0 animate-pulse bg-gray-200/60" />}
          </div>
          {speaking && (
            <div className="pointer-events-none absolute -inset-1 animate-pulse rounded-[1.75rem] ring-4 ring-indigo-400/60" />
          )}
        </div>

        {!voiceConfigured ? (
          <p className="max-w-xs text-sm text-gray-500">
            Sesli görüşme henüz yapılandırılmadı. Kısa süre içinde aktif olacak.
          </p>
        ) : connected ? (
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
            <span
              className={[
                "h-2 w-2 rounded-full",
                speaking ? "animate-pulse bg-indigo-500" : "bg-indigo-300",
              ].join(" ")}
            />
            {speaking ? "Danışman konuşuyor…" : "Sizi dinliyorum…"}
          </div>
        ) : connecting ? (
          <p className="text-sm text-gray-500">Bağlanıyor…</p>
        ) : (
          <p className="max-w-xs text-sm text-gray-500">
            Hazır olduğunuzda görüşmeyi başlatın; danışmanınız sizi karşılayacak.
          </p>
        )}

        {error && (
          <p className="max-w-xs rounded-xl bg-red-50 p-3 text-sm text-red-600">
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
              className="rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-3 font-medium text-white shadow-lg shadow-indigo-600/20 transition hover:opacity-95 disabled:opacity-40"
            >
              {status === "error" ? "Tekrar dene" : "Görüşmeyi başlat"}
            </button>
          ))}
      </div>
    </section>
  );
}

const CONTENT_SOURCE_LABELS: Record<string, string> = {
  client_text: "müşteride metin",
  client_photos: "müşteride görsel",
  instagram: "Instagram",
  provided_file: "dosya verilecek",
  existing_site: "mevcut site",
  agency_generated: "biz üreteceğiz",
  none: "yok",
};

const FEATURE_LABELS: Record<string, string> = {
  contact_form: "İletişim formu",
  map: "Harita",
  whatsapp_button: "WhatsApp butonu",
  appointment: "Online randevu",
  reservation: "Rezervasyon",
  multilang: "Çok dillilik",
  social_feed: "Sosyal medya akışı",
};

function yesNo(v: boolean | null): string | null {
  return v === true ? "Evet" : v === false ? "Hayır" : null;
}

// A single labeled fact; dimmed when not yet collected.
function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5">
      <span className="shrink-0 text-xs text-gray-400">{label}</span>
      <span className={value ? "text-right text-sm font-medium text-gray-800" : "text-sm text-gray-300"}>
        {value || "—"}
      </span>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
        {title}
      </div>
      <div className="rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-black/5">{children}</div>
    </div>
  );
}

// Live brief panel v2 — the "notlarımı alıyor" trust UX (KAR-24). Full section
// map + content sources + free-form notes + gate gaps, filling in real time.
function BriefPanel({ brief, gate }: { brief: Brief; gate: GateResult }) {
  const sectionLabels: Record<string, string> = brief.archetype
    ? Object.fromEntries(ARCHETYPE_SECTIONS[brief.archetype].map((s) => [s.key, s.label]))
    : {};
  const decidedSections = brief.sections.filter((s) => s.willInclude !== null);

  return (
    <section className="flex min-h-[420px] flex-col rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Brief</h2>
        <span
          className={[
            "rounded-full px-2.5 py-0.5 text-xs font-medium",
            gate.canComplete ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700",
          ].join(" ")}
        >
          {gate.canComplete ? "Hazır" : `${gate.missing.length} eksik`}
        </span>
      </div>

      <div className="mt-3 flex-1 space-y-4 overflow-y-auto pr-1" style={{ maxHeight: 440 }}>
        <Group title="İşletme">
          <Fact label="Ad" value={brief.business.name} />
          <Fact label="Sektör" value={brief.business.sector} />
          <Fact label="Arketip" value={brief.archetype} />
          <Fact label="Slogan" value={brief.business.tagline} />
          <Fact label="Bölge" value={brief.business.region} />
          <Fact label="Ton" value={brief.brand.tone} />
          <Fact label="Ana hedef" value={brief.cta.primaryGoal} />
          <Fact label="Termin" value={brief.deadline} />
        </Group>

        <Group title="İletişim">
          <Fact label="Telefon" value={brief.contact.phone} />
          <Fact label="E-posta" value={brief.contact.email} />
          <Fact label="Adres" value={brief.contact.address} />
          <Fact label="Saatler" value={brief.contact.hours} />
          <Fact label="Instagram" value={brief.social.instagram} />
        </Group>

        <Group title="İçerik & marka">
          <Fact label="Logo" value={yesNo(brief.brand.hasLogo)} />
          <Fact label="Metin sizde mi" value={yesNo(brief.contentSources.hasText)} />
          <Fact label="Görsel sizde mi" value={yesNo(brief.contentSources.hasPhotos)} />
        </Group>

        {decidedSections.length > 0 && (
          <Group title="Sayfa bölümleri">
            <ul className="space-y-1.5">
              {decidedSections.map((s) => (
                <li key={s.key} className="text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-gray-800">
                      {sectionLabels[s.key] ?? s.key}
                    </span>
                    <span className={s.willInclude ? "text-xs text-indigo-600" : "text-xs text-gray-400"}>
                      {s.willInclude
                        ? s.contentSource
                          ? (CONTENT_SOURCE_LABELS[s.contentSource] ?? s.contentSource)
                          : "kaynak?"
                        : "yok"}
                    </span>
                  </div>
                  {s.willInclude && s.keyMessage && (
                    <p className="mt-0.5 text-xs text-gray-500">{s.keyMessage}</p>
                  )}
                </li>
              ))}
            </ul>
          </Group>
        )}

        {brief.featureDecisions.length > 0 && (
          <Group title="Özellikler">
            <div className="flex flex-wrap gap-1.5">
              {brief.featureDecisions.map((d) => (
                <span
                  key={d.feature}
                  className={[
                    "rounded-full px-2 py-0.5 text-xs",
                    d.enabled
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-gray-200 text-gray-500 line-through",
                  ].join(" ")}
                >
                  {FEATURE_LABELS[d.feature] ?? d.feature}
                </span>
              ))}
            </div>
          </Group>
        )}

        {brief.notes && (
          <Group title="Görüşme notları">
            <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">
              {brief.notes}
            </p>
          </Group>
        )}

        {!gate.canComplete && gate.missing.length > 0 && (
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-500">
              Eksikler ({gate.missing.length})
            </div>
            <ul className="space-y-1 rounded-xl bg-amber-50 px-3 py-2 ring-1 ring-amber-100">
              {gate.missing.slice(0, 8).map((m) => (
                <li key={m.gate + m.field} className="text-xs text-amber-800">
                  • {m.reason}
                </li>
              ))}
              {gate.missing.length > 8 && (
                <li className="text-xs text-amber-600">+{gate.missing.length - 8} daha…</li>
              )}
            </ul>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={!gate.canComplete}
        className="mt-4 w-full rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-3 font-medium text-white shadow-lg shadow-indigo-600/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
      >
        {gate.canComplete ? "Brief'i onayla" : "Görüşme sürüyor…"}
      </button>
    </section>
  );
}

// Always-visible escalation to a human (placeholder action for now).
function HumanHandoffButton() {
  const [requested, setRequested] = useState(false);
  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setRequested(true)}
        className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
      >
        İnsanla devam et
      </button>
      {requested && (
        <span className="absolute top-14 z-20 max-w-[220px] rounded-lg bg-gray-900 px-3 py-1.5 text-right text-xs text-white shadow-lg">
          Talebiniz alındı — bir temsilci sizinle iletişime geçecek (yakında).
        </span>
      )}
    </div>
  );
}
