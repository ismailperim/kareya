"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Invite entry (KAR-42): the public door to a meeting room. A customer (or
// demo guest) types the code İsmail gave them; a valid code mints a fresh
// session and drops them straight into their room.

export default function InvitePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "checking" | "error">("idle");

  const submit = async () => {
    if (!code.trim() || state === "checking") return;
    setState("checking");
    try {
      const res = await fetch("/api/invite/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = (await res.json()) as { room?: string };
      if (data.room) {
        router.push(data.room);
        return;
      }
      setState("error");
    } catch {
      setState("error");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-indigo-50/70 via-white to-white px-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm ring-1 ring-black/5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 font-semibold text-white">
            k
          </span>
          <span className="text-xl font-semibold tracking-tight text-gray-900">kareya</span>
        </div>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-gray-900">
          Görüşme odanıza hoş geldiniz
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          Size iletilen davet kodunu girin — yapay zekâ danışmanımızla görüşmeniz
          hemen başlasın.
        </p>

        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (state === "error") setState("idle");
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Davet kodunuz"
          autoFocus
          className="mt-6 w-full rounded-xl border border-gray-200 px-4 py-3 font-mono text-sm tracking-wide outline-none transition focus:border-indigo-400"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!code.trim() || state === "checking"}
          className="mt-3 w-full rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-3 font-medium text-white shadow-lg shadow-indigo-600/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {state === "checking" ? "Kontrol ediliyor…" : "Görüşmeye Başla"}
        </button>

        {state === "error" && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            Kod geçersiz, süresi dolmuş ya da kullanılmış. Kodunuzu kontrol edin
            veya bizimle iletişime geçin.
          </p>
        )}

        <p className="mt-6 text-center text-xs text-gray-400">
          Davet kodunuz yok mu?{" "}
          <a href="https://kareya.app" className="font-medium text-indigo-500 hover:underline">
            kareya.app
          </a>{" "}
          üzerinden bize ulaşın.
        </p>
      </div>
    </main>
  );
}
