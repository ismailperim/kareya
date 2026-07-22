import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { safeParseBrief } from "@kareya/schemas";
import {
  briefToSite,
  generateAstroProject,
  pickLlm,
  polishSite,
  uploadDirToR2,
} from "@kareya/site-gen";

import { advancePhase, appendJobLog, loadBrief, type ClaimedJob } from "./db";
import { env, requireEnv } from "./env";

// build_site job (KAR-46): brief → Site JSON → Astro project → static build →
// R2 publish → phase PREVIEW_READY. Runs in an isolated temp worktree per job
// (ADR-0005); the worktree is removed afterwards.

export type BuildSiteResult = {
  token: string;
  briefVersion?: number;
  r2Prefix: string;
  uploaded: number;
  businessName: string;
};

function run(cmd: string, cwd: string): string {
  return execSync(cmd, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 5 * 60 * 1000,
    env: { ...process.env, CI: "1" },
  });
}

export async function buildSite(job: ClaimedJob): Promise<BuildSiteResult> {
  const token = String(job.payload.token ?? "");
  const briefVersion = job.payload.briefVersion;
  if (!token) throw new Error("build_site payload missing token");
  const log = (line: string) => appendJobLog(job.id, line);

  // 1) Load + validate the brief.
  const raw = await loadBrief(token, briefVersion);
  if (!raw) throw new Error(`No brief found for token=${token} version=${briefVersion ?? "latest"}`);
  const parsed = safeParseBrief(raw);
  if (!parsed.success) throw new Error(`Brief failed schema validation: ${parsed.error.message.slice(0, 300)}`);
  const brief = parsed.data;
  await log(`brief loaded (version=${briefVersion ?? "latest"}, business=${brief.business.name ?? "?"})`);

  // 2) Assemble Site JSON (structure is deterministic).
  let site = briefToSite(brief);
  await log(`site assembled (${site.pages[0]?.sections.length ?? 0} sections)`);

  // 2b) Content polish (KAR-50): LLM rewrites the copy only — structure never
  // changes; any failure falls back to the deterministic baseline.
  const llmChoice = pickLlm({
    GEMINI_API_KEY: env("GEMINI_API_KEY"),
    ANTHROPIC_API_KEY: env("ANTHROPIC_API_KEY"),
    LLM_MODEL: env("LLM_MODEL"),
  });
  if (llmChoice) {
    const polished = await polishSite(site, brief, llmChoice.llm);
    site = polished.site;
    await log(
      polished.polished
        ? `content polished (${llmChoice.name})`
        : `content polish skipped (${llmChoice.name}: ${polished.error}) — deterministic copy`,
    );
  } else {
    await log("no LLM key — deterministic copy (set GEMINI_API_KEY or ANTHROPIC_API_KEY)");
  }

  // 2c) Generate the Astro project from the (possibly polished) site.
  const files = generateAstroProject(site);
  await log(`astro project generated → ${Object.keys(files).length} files`);

  // 3) Materialize into an isolated temp worktree.
  const work = mkdtempSync(join(tmpdir(), `kareya-build-${job.id.slice(0, 8)}-`));
  try {
    for (const [rel, content] of Object.entries(files)) {
      const path = join(work, rel);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content);
    }

    // 4) Install + static build.
    await log("npm install…");
    run("npm install --no-audit --no-fund --silent", work);
    await log("astro build…");
    run("npm run build", work);
    await log("static build complete");

    // 5) Publish dist/ to R2.
    const r2Prefix = `sites/${token}`;
    const keys = await uploadDirToR2(join(work, "dist"), r2Prefix, {
      accountId: requireEnv("R2_ACCOUNT_ID"),
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
      bucket: requireEnv("R2_BUCKET"),
    });
    await log(`published ${keys.length} files → r2://${requireEnv("R2_BUCKET")}/${r2Prefix}`);

    // 6) Advance the phase.
    const advanced = await advancePhase(token, "PREVIEW_READY");
    await log(advanced ? "phase → PREVIEW_READY" : "phase NOT advanced (unexpected current phase)");

    return {
      token,
      briefVersion,
      r2Prefix,
      uploaded: keys.length,
      businessName: brief.business.name ?? "",
    };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
