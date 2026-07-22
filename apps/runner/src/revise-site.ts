import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { safeParseBrief, safeParseSite, type Brief, type Site } from "@kareya/schemas";
import {
  anthropicLlm,
  contentProbes,
  designRevise,
  fetchFromR2,
  generateAstroProject,
  geminiLlm,
  missingProbes,
  relativizeAssetPaths,
  reviseSite,
  uploadDirToR2,
  uploadFilesToR2,
} from "@kareya/site-gen";

import {
  materializeBuildPublish,
  r2Creds,
  readBuiltHtml,
  restoreDesignOverrides,
  run,
  sourcePrefixFor,
  tryBuild,
  writeTree,
} from "./build-site";
import {
  advancePhase,
  appendJobLog,
  getCurrentSite,
  getPublishPrefix,
  loadBrief,
  saveCurrentSite,
  type ClaimedJob,
} from "./db";
import { env } from "./env";

// revise_site job (KAR-41): "kardeş şu metni değiştir" — a natural-language
// revision is applied by the AI dev agent (Claude preferred — code/edit work)
// to the CURRENT Site JSON, then rebuilt and republished. Guardrails in
// site-gen/revise.ts (ADR-0005): instruction is data, schema-validated output,
// no fabrication, out-of-scope → no change.

export type ReviseSiteResult = {
  token: string;
  changed: boolean;
  instruction: string;
  r2Prefix?: string;
  uploaded?: number;
};

/** Claude first for revision (dev-agent work); Gemini fallback. */
function revisionLlm() {
  const anthropicKey = env("ANTHROPIC_API_KEY") ?? env("CLAUDE_API_KEY");
  if (anthropicKey) return { name: "claude", llm: anthropicLlm(anthropicKey) };
  const geminiKey = env("GEMINI_API_KEY");
  if (geminiKey) return { name: "gemini", llm: geminiLlm(geminiKey) };
  return null;
}

/**
 * Design revision (KAR-63): apply the instruction to the project's component
 * CODE (current sources = kit + pinned design-pass overrides), through the
 * same validators + build/content gates as the Design Pass. Returns null when
 * the LLM judges the request non-design (caller falls through to no-change).
 */
async function tryDesignRevision(
  job: ClaimedJob,
  token: string,
  site: Site,
  brief: Brief,
  instruction: string,
): Promise<ReviseSiteResult | null> {
  const log = (line: string) => appendJobLog(job.id, line);
  const anthropicKey = env("ANTHROPIC_API_KEY") ?? env("CLAUDE_API_KEY");
  if (!anthropicKey) return null;

  const prefix = await getPublishPrefix(token);
  const kitFiles = generateAstroProject(site);
  const pinned = (await restoreDesignOverrides(prefix)) ?? {};
  const currentFiles = { ...kitFiles, ...pinned };

  const llm = anthropicLlm(anthropicKey, env("DESIGN_PASS_MODEL") ?? "claude-sonnet-4-5", 16000);
  const probes = contentProbes(site);

  // Restore existing images so gate builds don't 404 asset paths.
  const imageFiles: Record<string, Buffer> = {};
  for (const page of site.pages) {
    for (const section of page.sections) {
      const imageUrl =
        (section.type === "hero" || section.type === "about") && section.imageUrl
          ? section.imageUrl
          : "";
      if (imageUrl && !imageUrl.startsWith("http") && !imageFiles[`public/${imageUrl}`]) {
        const buf = await fetchFromR2(`${prefix}/${imageUrl}`, r2Creds());
        if (buf) imageFiles[`public/${imageUrl}`] = buf;
      }
    }
  }

  const work = mkdtempSync(join(tmpdir(), `kareya-drev-${job.id.slice(0, 8)}-`));
  try {
    writeTree(work, currentFiles);
    writeTree(work, imageFiles);
    await log("npm install…");
    run("npm install --no-audit --no-fund --silent", work);

    let feedback: string | undefined;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const dr = await designRevise(site, brief, currentFiles, instruction, llm, feedback);
      if (dr.noChange) {
        await log("design revision: LLM judged the request non-design");
        return null;
      }
      if (dr.error) {
        await log(`design revision attempt ${attempt} rejected (${dr.error})`);
        feedback = dr.error;
        continue;
      }
      writeTree(work, dr.files);
      const built = tryBuild(work);
      if (!built.ok) {
        await log(`design revision attempt ${attempt}: astro build FAILED — retrying`);
        feedback = `astro build hatası:\n${built.output.slice(-1200)}`;
        writeTree(work, currentFiles);
        continue;
      }
      const missing = missingProbes(readBuiltHtml(work), probes);
      if (missing.length) {
        await log(`design revision attempt ${attempt}: content gate FAILED (${missing.join(" | ").slice(0, 120)})`);
        feedback = `Şu içerikler kayboldu: ${missing.join(", ")}`;
        writeTree(work, currentFiles);
        continue;
      }

      // Gates passed — publish dist/ and refresh sources/ + manifest.
      const rewrittenPages = relativizeAssetPaths(join(work, "dist"));
      await log(`design revision applied: ${dr.rewritten.map((f) => f.replace("src/components/", "").replace(".astro", "")).join(", ")} (build OK, ${rewrittenPages} page)`);
      const keys = await uploadDirToR2(join(work, "dist"), prefix, r2Creds(), () => {});
      await log(`published ${keys.length} files → r2://${r2Creds().bucket}/${prefix}`);

      const newOverrides = { ...pinned, ...dr.files };
      const finalFiles = { ...kitFiles, ...newOverrides };
      const srcPrefix = sourcePrefixFor(prefix);
      await uploadFilesToR2({ ...finalFiles, ...imageFiles }, srcPrefix, r2Creds());
      await uploadFilesToR2(
        {
          "kareya-manifest.json": JSON.stringify(
            {
              designPass: true,
              rewritten: Object.keys(newOverrides),
              files: Object.keys(finalFiles),
              images: Object.keys(imageFiles),
              generatedAt: new Date().toISOString(),
            },
            null,
            2,
          ),
        },
        srcPrefix,
        r2Creds(),
      );
      await log("source + manifest refreshed");

      const advanced = await advancePhase(token, "PREVIEW_READY");
      await log(advanced ? "phase → PREVIEW_READY" : "phase NOT advanced");
      return { token, changed: true, instruction, r2Prefix: prefix, uploaded: keys.length };
    }
    await log("design revision fell back (all attempts failed) — site unchanged");
    await advancePhase(token, "PREVIEW_READY");
    return { token, changed: false, instruction };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

export async function reviseSiteJob(job: ClaimedJob): Promise<ReviseSiteResult> {
  const token = String(job.payload.token ?? "");
  const instruction = String((job.payload as { instruction?: string }).instruction ?? "").trim();
  if (!token) throw new Error("revise_site payload missing token");
  if (!instruction) throw new Error("revise_site payload missing instruction");
  const log = (line: string) => appendJobLog(job.id, line);

  // 1) Load the current site state + brief context.
  const siteRaw = await getCurrentSite(token);
  if (!siteRaw) throw new Error("No built site to revise — run build_site first");
  const siteParsed = safeParseSite(siteRaw);
  if (!siteParsed.success) throw new Error("Stored site failed schema validation");
  const briefRaw = await loadBrief(token);
  const briefParsed = briefRaw ? safeParseBrief(briefRaw) : null;
  if (!briefParsed?.success) throw new Error("No valid brief for context");
  await log(`revision requested: "${instruction.slice(0, 140)}"`);

  // 2) Apply the revision with the dev LLM (Claude preferred).
  const llm = revisionLlm();
  if (!llm) throw new Error("No LLM key for revision (ANTHROPIC_API_KEY / GEMINI_API_KEY)");
  const result = await reviseSite(siteParsed.data, briefParsed.data, instruction, llm.llm);
  if (result.error) throw new Error(`revision failed: ${result.error}`);
  if (!result.changed) {
    // Content revision produced nothing — maybe it's a DESIGN request
    // ("menüyü sağa al"): patch the component code instead (KAR-63).
    const designResult = await tryDesignRevision(job, token, siteParsed.data, briefParsed.data, instruction);
    if (designResult) return designResult;
    await log(`no change applied (${llm.name} judged it out of scope or already satisfied)`);
    await advancePhase(token, "PREVIEW_READY"); // BUILDING → back to preview
    return { token, changed: false, instruction };
  }
  await log(`revision applied (${llm.name})`);

  // 3) Persist the new state, restore existing images from R2, rebuild+publish.
  await saveCurrentSite(token, result.site);
  const prefix = await getPublishPrefix(token);
  const imageFiles: Record<string, Buffer> = {};
  for (const section of result.site.pages[0]?.sections ?? []) {
    const imageUrl =
      (section.type === "hero" || section.type === "about") && section.imageUrl
        ? section.imageUrl
        : "";
    if (imageUrl && !imageUrl.startsWith("http")) {
      const buf = await fetchFromR2(`${prefix}/${imageUrl}`, r2Creds());
      if (buf) imageFiles[`public/${imageUrl}`] = buf;
    }
  }
  if (Object.keys(imageFiles).length) {
    await log(`restored ${Object.keys(imageFiles).length} image(s) from R2`);
  }

  // Keep the pinned Design Pass layout (KAR-62): a content revision changes
  // site.json, not the custom-written components.
  const files = generateAstroProject(result.site);
  const overrides = await restoreDesignOverrides(prefix);
  if (overrides) {
    Object.assign(files, overrides);
    await log(`design pass preserved (${Object.keys(overrides).length} components)`);
  }
  const { r2Prefix, uploaded } = await materializeBuildPublish(job.id, prefix, files, imageFiles);

  // Refresh the published source tree (content changed; sources/<slug>/ is
  // the customer's canonical code — KAR-63).
  try {
    await uploadFilesToR2({ ...files, ...imageFiles }, sourcePrefixFor(prefix), r2Creds());
    await log("source refreshed");
  } catch (err) {
    await log(`source refresh skipped (${err instanceof Error ? err.message : err})`);
  }

  const advanced = await advancePhase(token, "PREVIEW_READY");
  await log(advanced ? "phase → PREVIEW_READY" : "phase NOT advanced");

  return { token, changed: true, instruction, r2Prefix, uploaded };
}
