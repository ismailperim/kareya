import { isDbConfigured } from "@/lib/db";
import { listJobs, type JobRow } from "@/lib/jobs";
import { listSessions, type SessionSummary } from "@/lib/meeting-repo";

import { PhaseButton, RefreshControl, RetryJobButton } from "./OpsActions";

// Ops dashboard (KAR-47): the whole workflow on one screen — sessions with
// phases + approval gates, and the job queue with logs. İsmail-only (the portal
// sits behind Cloudflare Access, ADR-0005). Auto-refreshes every 15s.

export const dynamic = "force-dynamic";

const PHASE_STYLES: Record<string, string> = {
  BRIEF: "bg-gray-100 text-gray-600",
  BRIEF_COMPLETED: "bg-blue-100 text-blue-700",
  BUILDING: "bg-amber-100 text-amber-700",
  PREVIEW_READY: "bg-violet-100 text-violet-700",
  LIVE: "bg-green-100 text-green-700",
  CARE: "bg-teal-100 text-teal-700",
  FAILED: "bg-red-100 text-red-700",
};

const JOB_STYLES: Record<string, string> = {
  queued: "bg-gray-100 text-gray-600",
  running: "bg-amber-100 text-amber-700",
  done: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

function Badge({ value, styles }: { value: string; styles: Record<string, string> }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[value] ?? "bg-gray-100 text-gray-600"}`}
    >
      {value}
    </span>
  );
}

function SessionRow({ s }: { s: SessionSummary }) {
  return (
    <tr className="border-t border-gray-100">
      <td className="px-3 py-2 font-mono text-xs text-gray-500">{s.token.slice(0, 14)}…</td>
      <td className="px-3 py-2 text-sm font-medium text-gray-800">
        {s.business_name || <span className="text-gray-300">—</span>}
      </td>
      <td className="px-3 py-2">
        <Badge value={s.phase} styles={PHASE_STYLES} />
      </td>
      <td className="px-3 py-2 text-xs text-gray-400">
        {new Date(s.updated_at).toLocaleString("tr-TR")}
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <a
            href={`/s/${s.token}`}
            target="_blank"
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Önizleme
          </a>
          <a
            href={`/meeting/${s.token}`}
            target="_blank"
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Oda
          </a>
          {s.phase === "PREVIEW_READY" && (
            <PhaseButton token={s.token} to="LIVE" label="LIVE'a geçir ✓" />
          )}
          {s.phase === "LIVE" && <PhaseButton token={s.token} to="CARE" label="CARE'e al" />}
        </div>
      </td>
    </tr>
  );
}

function JobCard({ j }: { j: JobRow }) {
  const token = typeof j.payload?.token === "string" ? (j.payload.token as string) : "";
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge value={j.status} styles={JOB_STYLES} />
          <span className="text-sm font-medium text-gray-800">{j.type}</span>
          {token && <span className="font-mono text-xs text-gray-400">{token.slice(0, 14)}…</span>}
          <span className="text-xs text-gray-400">deneme {j.attempts}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {new Date(j.created_at).toLocaleString("tr-TR")}
          </span>
          {j.status === "failed" && <RetryJobButton jobId={j.id} />}
        </div>
      </div>
      {j.logs && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-700">
            Loglar
          </summary>
          <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-gray-900 p-3 text-[11px] leading-relaxed text-gray-200">
            {j.logs}
          </pre>
        </details>
      )}
    </div>
  );
}

export default async function OpsPage() {
  if (!isDbConfigured) {
    return <main className="p-8 text-gray-500">DB yapılandırılmamış.</main>;
  }
  const [sessions, jobs] = await Promise.all([listSessions(), listJobs()]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50/70 via-white to-white">
      <header className="sticky top-0 z-10 border-b border-black/5 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <span className="text-lg font-semibold tracking-tight text-gray-900">
            kareya <span className="font-normal text-gray-400">/ ops</span>
          </span>
          <RefreshControl />
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-8 p-5">
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
            Projeler ({sessions.length})
          </h2>
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2 font-medium">Oturum</th>
                  <th className="px-3 py-2 font-medium">İşletme</th>
                  <th className="px-3 py-2 font-medium">Faz</th>
                  <th className="px-3 py-2 font-medium">Güncelleme</th>
                  <th className="px-3 py-2 font-medium">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <SessionRow key={s.token} s={s} />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
            İş Kuyruğu ({jobs.length})
          </h2>
          <div className="space-y-3">
            {jobs.length === 0 && <p className="text-sm text-gray-400">Kuyruk boş.</p>}
            {jobs.map((j) => (
              <JobCard key={j.id} j={j} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
