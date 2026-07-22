"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Client-side controls for the ops dashboard (KAR-47): auto/manual refresh,
// job retry, and human-gated phase transitions.

export function RefreshControl() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 15000);
    return () => clearInterval(t);
  }, [router]);
  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
    >
      Yenile ↻
    </button>
  );
}

function ActionButton({
  label,
  onClick,
  tone = "brand",
}: {
  label: string;
  onClick: () => Promise<Response>;
  tone?: "brand" | "neutral";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const run = async () => {
    setBusy(true);
    setError(false);
    try {
      const res = await onClick();
      if (!res.ok) setError(true);
    } catch {
      setError(true);
    }
    setBusy(false);
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className={[
        "rounded-lg px-2.5 py-1 text-xs font-medium transition disabled:opacity-40",
        tone === "brand"
          ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white hover:opacity-95"
          : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
        error ? "ring-2 ring-red-300" : "",
      ].join(" ")}
    >
      {busy ? "…" : label}
    </button>
  );
}

export function RetryJobButton({ jobId }: { jobId: string }) {
  return (
    <ActionButton
      label="Yeniden dene"
      tone="neutral"
      onClick={() => fetch(`/api/ops/jobs/${jobId}/retry`, { method: "POST" })}
    />
  );
}

// "Kardeş şu metni değiştir" — queue a chat-driven revision (KAR-41).
export function RevisionForm({ token }: { token: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`/api/ops/sessions/${token}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: text.trim() }),
      });
      if (!res.ok) setError(true);
      else setText("");
    } catch {
      setError(true);
    }
    setBusy(false);
    router.refresh();
  };

  return (
    <div className="mt-2 flex gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder='Revizyon: "başlığı ... yap", "SSS bölümünü kaldır"…'
        className={[
          "w-full rounded-lg border px-3 py-1.5 text-xs outline-none transition focus:border-indigo-400",
          error ? "border-red-300" : "border-gray-200",
        ].join(" ")}
      />
      <button
        type="button"
        onClick={submit}
        disabled={busy || !text.trim()}
        className="shrink-0 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-95 disabled:opacity-40"
      >
        {busy ? "…" : "Revize et"}
      </button>
    </div>
  );
}

export function PhaseButton({
  token,
  to,
  label,
}: {
  token: string;
  to: string;
  label: string;
}) {
  return (
    <ActionButton
      label={label}
      onClick={() =>
        fetch(`/api/ops/sessions/${token}/phase`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to }),
        })
      }
    />
  );
}
