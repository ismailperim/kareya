"use client";

import { useRouter } from "next/navigation";

const DEMO_TOKEN = "kar-demo-123456";

export default function Home() {
  const router = useRouter();

  // Fresh meeting = a brand-new random token (empty draft). Resume = the fixed
  // demo token, which rehydrates the last draft (KAR-26/KAR-28).
  const startNew = () => router.push(`/meeting/${crypto.randomUUID()}`);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-indigo-50/70 via-white to-white p-6 text-center">
      <svg width="64" height="64" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="kareyaHome" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366F1" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="12" fill="url(#kareyaHome)" />
        <rect x="13" y="13" width="22" height="22" rx="5" stroke="#fff" strokeWidth="3" />
        <rect x="23.5" y="23.5" width="11.5" height="11.5" rx="3" fill="#fff" />
      </svg>

      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-gray-900">kareya</h1>
        <p className="mt-2 max-w-md text-lg text-gray-600">
          AI-kadrolu web ajansı. Kısa bir görüşmeyle, işinize yakışan web
          sitenizi birlikte tasarlayalım.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={startNew}
          className="rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-7 py-3.5 font-medium text-white shadow-lg shadow-indigo-600/20 transition hover:opacity-95"
        >
          Yeni görüşme başlat
        </button>
        <a
          href={`/meeting/${DEMO_TOKEN}`}
          className="text-sm font-medium text-indigo-600 transition hover:text-indigo-700"
        >
          Demo görüşmesine devam et →
        </a>
      </div>
    </main>
  );
}
