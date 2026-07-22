import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { safeParseBrief, safeParseSite, type Site } from "@kareya/schemas";
import {
  briefToSite,
  fetchFromR2,
  generateAstroProject,
  pickImageProvider,
  pickLlm,
  pickLlms,
  polishSite,
  relativizeAssetPaths,
  uploadDirToR2,
} from "@kareya/site-gen";

import {
  advancePhase,
  appendJobLog,
  getCurrentSite,
  getPublishPrefix,
  loadBrief,
  saveCurrentSite,
  saveR2Prefix,
  type ClaimedJob,
} from "./db";
import { env, requireEnv } from "./env";

// build_site job (KAR-46): brief → Site JSON → polish → images → Astro project
// → static build → R2 publish → phase PREVIEW_READY. Runs in an isolated temp
// worktree per job (ADR-0005); the worktree is removed afterwards.

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

export function r2Creds() {
  return {
    accountId: requireEnv("R2_ACCOUNT_ID"),
    accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    bucket: requireEnv("R2_BUCKET"),
  };
}

/** Text LLM choice for content work (Gemini first; CLAUDE_API_KEY aliased). */
export function contentLlm() {
  return pickLlm({
    GEMINI_API_KEY: env("GEMINI_API_KEY"),
    ANTHROPIC_API_KEY: env("ANTHROPIC_API_KEY") ?? env("CLAUDE_API_KEY"),
    LLM_MODEL: env("LLM_MODEL"),
  });
}

/** All content LLMs in preference order — runtime fallback chain. */
export function contentLlmChain() {
  return pickLlms({
    GEMINI_API_KEY: env("GEMINI_API_KEY"),
    ANTHROPIC_API_KEY: env("ANTHROPIC_API_KEY") ?? env("CLAUDE_API_KEY"),
    LLM_MODEL: env("LLM_MODEL"),
  });
}

/**
 * Shared publish pipeline (build_site + revise_site): materialize the project
 * into an isolated temp worktree, npm install + astro build, relativize asset
 * paths, upload dist/ to R2. Worktree is removed afterwards.
 */
export async function materializeBuildPublish(
  jobId: string,
  r2Prefix: string,
  files: Record<string, string>,
  imageFiles: Record<string, Buffer>,
): Promise<{ r2Prefix: string; uploaded: number }> {
  const log = (line: string) => appendJobLog(jobId, line);
  const work = mkdtempSync(join(tmpdir(), `kareya-build-${jobId.slice(0, 8)}-`));
  try {
    for (const [rel, content] of Object.entries(files)) {
      const path = join(work, rel);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content);
    }
    for (const [rel, buffer] of Object.entries(imageFiles)) {
      const path = join(work, rel);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, buffer);
    }

    await log("npm install…");
    run("npm install --no-audit --no-fund --silent", work);
    await log("astro build…");
    run("npm run build", work);
    const rewritten = relativizeAssetPaths(join(work, "dist"));
    await log(`static build complete (assets relativized in ${rewritten} page)`);

    const keys = await uploadDirToR2(join(work, "dist"), r2Prefix, r2Creds(), () => {});
    await log(`published ${keys.length} files → r2://${r2Creds().bucket}/${r2Prefix}`);
    return { r2Prefix, uploaded: keys.length };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
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

  // Previous build state (brand/image stability across rebuilds — İsmail's
  // finding: polish re-picked a different palette and Pexels re-picked
  // different photos on every rebuild).
  const prevRaw = await getCurrentSite(token);
  const prevParsed = prevRaw ? safeParseSite(prevRaw) : null;
  const prev = prevParsed?.success ? prevParsed.data : null;

  // Republish mode: regenerate + publish from the CURRENT Site JSON verbatim
  // (pipeline/kit updates). No assemble, no polish, no new images — nothing
  // about the customer's site changes except the rendered output.
  const republish = (job.payload as { republish?: boolean }).republish === true && !!prev;

  // 2) Assemble Site JSON (structure is deterministic).
  let site: Site = republish ? prev! : briefToSite(brief);
  await log(
    republish
      ? "republish mode — regenerating from current site (no polish/image changes)"
      : `site assembled (${site.pages[0]?.sections.length ?? 0} sections)`,
  );

  // 2b) Content polish (KAR-50): LLM rewrites the copy only. Providers form a
  // fallback CHAIN — a Gemini 429 mid-build must not ship unpolished copy when
  // a Claude key is on hand (İsmail's "renkler değişti/metinler azaldı" root
  // cause was exactly this silent degradation).
  const llmChain = republish ? [] : contentLlmChain();
  let llmChoice: ReturnType<typeof contentLlm> = null;
  if (!llmChain.length && !republish) {
    await log("no LLM key — deterministic copy (set GEMINI_API_KEY or ANTHROPIC_API_KEY)");
  }
  for (const choice of llmChain) {
    const polished = await polishSite(site, brief, choice.llm);
    if (polished.polished) {
      site = polished.site;
      llmChoice = choice; // reuse the working provider for image queries below
      await log(`content polished (${choice.name})`);
      break;
    }
    await log(`content polish failed (${choice.name}: ${String(polished.error).slice(0, 160)})`);
  }
  if (llmChain.length && !llmChoice) await log("all polish providers failed — deterministic copy");

  // Brand pin: once CHOSEN, the palette is part of the brand — rebuilds keep it
  // (revisions can still change it explicitly). Tone defaults don't count as
  // chosen: they mean polish never applied the customer's color preference, so
  // give this build's polish another chance instead of pinning the placeholder.
  const TONE_DEFAULT_PRIMARIES = new Set(["#4F46E5", "#0EA5E9", "#7C3AED"]);
  if (prev && !TONE_DEFAULT_PRIMARIES.has(prev.brand.primary.toUpperCase())) {
    site = { ...site, brand: prev.brand };
    await log(`brand pinned from previous build (${prev.brand.primary})`);
  }

  // 2c) Images (KAR-53). Pin first: photos already chosen in a previous build
  // are restored from R2 — rebuilds must not swap the site's imagery. Only
  // still-missing slots get sourced fresh.
  const imageFiles: Record<string, Buffer> = {};
  const setImage = (type: "hero" | "about", url: string) => {
    for (const page of site.pages) {
      for (const s of page.sections) {
        if (s.type === type) s.imageUrl = url; // about/hero may appear on multiple pages
      }
    }
  };
  const pinned: { hero?: string; about?: string } = {};
  if (prev) {
    const prevPrefix = await getPublishPrefix(token);
    for (const page of prev.pages) {
      for (const s of page.sections) {
        if (
          (s.type === "hero" || s.type === "about") &&
          s.imageUrl &&
          !s.imageUrl.startsWith("http") &&
          !pinned[s.type]
        ) {
          const buf = await fetchFromR2(`${prevPrefix}/${s.imageUrl}`, r2Creds());
          if (buf) {
            imageFiles[`public/${s.imageUrl}`] = buf;
            pinned[s.type] = s.imageUrl;
            setImage(s.type, s.imageUrl);
          }
        }
      }
    }
    if (pinned.hero || pinned.about) {
      await log(`images pinned from previous build (${Object.keys(pinned).join(", ")})`);
    }
  }

  const needHero = !pinned.hero;
  const needAbout = !pinned.about && site.pages.some((p) => p.sections.some((s) => s.type === "about"));
  const imgChoice = pickImageProvider({
    PEXELS_API_KEY: env("PEXELS_API_KEY"),
    GEMINI_API_KEY: env("GEMINI_API_KEY"),
    GEMINI_IMAGE_MODEL: env("GEMINI_IMAGE_MODEL"),
    GEMINI_IMAGE_ENABLED: env("GEMINI_IMAGE_ENABLED"),
  });
  if (imgChoice && brief.contentSources.hasPhotos !== true && (needHero || needAbout)) {
    try {
      let queries = {
        hero: "modern professional business technology",
        about: "professional team office working",
      };
      if (llmChoice) {
        try {
          const raw2 = await llmChoice.llm(
            `Bir web sitesi için stok fotoğraf arama sorguları üret. İşletme: "${brief.business.name ?? ""}" — sektör: "${brief.business.sector ?? ""}". Notlar: ${brief.notes.slice(0, 300)}. SADECE şu JSON'u döndür (İngilizce, 3-5 kelimelik sorgular): {"hero":"...","about":"..."}`,
          );
          const parsedQ = JSON.parse(raw2.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
          if (parsedQ.hero) queries.hero = String(parsedQ.hero);
          if (parsedQ.about) queries.about = String(parsedQ.about);
        } catch {
          /* keep fallback queries */
        }
      }
      if (needHero) {
        const hero = await imgChoice.getImage(queries.hero, "landscape");
        imageFiles[`public/images/hero.${hero.ext}`] = hero.buffer;
        setImage("hero", `images/hero.${hero.ext}`);
      }
      if (needAbout) {
        const about = await imgChoice.getImage(queries.about, "landscape");
        imageFiles[`public/images/about.${about.ext}`] = about.buffer;
        setImage("about", `images/about.${about.ext}`);
      }
      await log(`images sourced (${imgChoice.name}: hero="${queries.hero}")`);
    } catch (err) {
      await log(`image step skipped (${err instanceof Error ? err.message : err})`);
    }
  } else if (!imgChoice && (needHero || needAbout)) {
    await log("no image provider — set PEXELS_API_KEY (free) for photos");
  }

  // 2d) Generate + build + publish (project slug path when available — KAR-39).
  const files = generateAstroProject(site);
  await log(`astro project generated → ${Object.keys(files).length} files`);
  const slug = (job.payload as { slug?: string }).slug;
  const prefix = slug ? `sites/${slug}` : await getPublishPrefix(token);
  const { r2Prefix, uploaded } = await materializeBuildPublish(job.id, prefix, files, imageFiles);

  // 3) Persist the generated state (revisions patch this) + advance the phase.
  await saveCurrentSite(token, site);
  await saveR2Prefix(token, r2Prefix);
  const advanced = await advancePhase(token, "PREVIEW_READY");
  await log(advanced ? "phase → PREVIEW_READY" : "phase NOT advanced (unexpected current phase)");

  return { token, briefVersion, r2Prefix, uploaded, businessName: brief.business.name ?? "" };
}
