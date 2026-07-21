import { buildSite } from "./build-site";
import { advancePhase, appendJobLog, claimNextJob, failJob, finishJob } from "./db";

// Kareya build runner (KAR-46, ADR-0006): a stateless, container-ready worker
// that claims jobs from the Neon queue and executes them. Runs anywhere Node
// runs — homelab, a VPS, or Cloudflare Containers (same image).
//
// Usage:
//   npm run start -w @kareya/runner          # poll loop
//   npm run once  -w @kareya/runner          # process at most one job, then exit

const POLL_MS = Number(process.env.RUNNER_POLL_MS ?? 5000);
const once = process.argv.includes("--once");

async function processOne(): Promise<boolean> {
  const job = await claimNextJob();
  if (!job) return false;

  console.log(`▶ job ${job.id} (${job.type}, attempt ${job.attempts})`);
  try {
    if (job.type === "build_site") {
      const result = await buildSite(job);
      await finishJob(job.id, result);
      console.log(`✓ job ${job.id} done — ${result.r2Prefix} (${result.uploaded} files)`);
    } else {
      throw new Error(`Unknown job type: ${job.type}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await failJob(job.id, message);
    // Reflect the failure in the workflow phase (BUILDING → FAILED).
    const token = String(job.payload.token ?? "");
    if (token) {
      const moved = await advancePhase(token, "FAILED");
      if (moved) await appendJobLog(job.id, "phase → FAILED");
    }
    console.error(`✗ job ${job.id} failed: ${message}`);
  }
  return true;
}

async function main() {
  console.log(`kareya runner up (${once ? "single-shot" : `polling every ${POLL_MS}ms`})`);
  if (once) {
    const had = await processOne();
    console.log(had ? "done" : "queue empty");
    return;
  }
  // Poll loop — sequential on purpose (one build at a time on small hardware).
  for (;;) {
    try {
      const had = await processOne();
      if (!had) await new Promise((r) => setTimeout(r, POLL_MS));
    } catch (err) {
      console.error("runner loop error:", err);
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
