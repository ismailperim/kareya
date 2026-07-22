import { safeParseBrief, safeParseSite } from "@kareya/schemas";
import {
  anthropicLlm,
  fetchFromR2,
  generateAstroProject,
  geminiLlm,
  reviseSite,
} from "@kareya/site-gen";

import { materializeBuildPublish, r2Creds } from "./build-site";
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

  const files = generateAstroProject(result.site);
  const { r2Prefix, uploaded } = await materializeBuildPublish(job.id, prefix, files, imageFiles);

  const advanced = await advancePhase(token, "PREVIEW_READY");
  await log(advanced ? "phase → PREVIEW_READY" : "phase NOT advanced");

  return { token, changed: true, instruction, r2Prefix, uploaded };
}
