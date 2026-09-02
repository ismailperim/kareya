import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { safeParseBrief, safeParseSite, type Site } from "@kareya/schemas";
import {
  anthropicLlm,
  artDirection,
  briefToSite,
  contentProbes,
  designPass,
  fetchFromR2,
  generateAstroProject,
  missingProbes,
  pickImageProvider,
  pickLlm,
  pickLlms,
  polishSite,
  relativizeAssetPaths,
  uploadDirToR2,
  uploadFilesToR2,
} from "@kareya/site-gen";

import {
  advancePhase,
  appendJobLog,
  enqueueJob,
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

export function run(cmd: string, cwd: string): string {
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
    OPENAI_BASE_URL: env("OPENAI_BASE_URL"),
    OPENAI_API_KEY: env("OPENAI_API_KEY"),
    OPENAI_MODEL: env("OPENAI_MODEL"),
  });
}

/** All content LLMs in preference order — runtime fallback chain. */
export function contentLlmChain() {
  return pickLlms({
    GEMINI_API_KEY: env("GEMINI_API_KEY"),
    ANTHROPIC_API_KEY: env("ANTHROPIC_API_KEY") ?? env("CLAUDE_API_KEY"),
    LLM_MODEL: env("LLM_MODEL"),
    OPENAI_BASE_URL: env("OPENAI_BASE_URL"),
    OPENAI_API_KEY: env("OPENAI_API_KEY"),
    OPENAI_MODEL: env("OPENAI_MODEL"),
  });
}

/** Write a { rel → content } map into the worktree. */
export function writeTree(work: string, files: Record<string, string | Buffer>): void {
  for (const [rel, content] of Object.entries(files)) {
    const path = join(work, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
}

/** astro build that reports failure instead of throwing (design-pass gate). */
export function tryBuild(work: string): { ok: boolean; output: string } {
  try {
    rmSync(join(work, "dist"), { recursive: true, force: true });
    const out = run("npm run build", work);
    return { ok: true, output: out };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    return {
      ok: false,
      output: [e.stderr, e.stdout, e.message].filter(Boolean).join("\n"),
    };
  }
}

/** Concatenated HTML of every built page (content gate input). */
export function readBuiltHtml(work: string): string {
  const dist = join(work, "dist");
  let html = "";
  for (const entry of readdirSync(dist)) {
    if (entry.endsWith(".html")) html += readFileSync(join(dist, entry), "utf8");
  }
  return html;
}

/** Source prefix for a publish prefix: sites/<slug> → sources/<slug>. */
export function sourcePrefixFor(publishPrefix: string): string {
  return publishPrefix.replace(/^sites\//, "sources/");
}

/**
 * Restore pinned Design Pass component files (KAR-62) from sources/ so
 * rebuilds and content revisions keep the custom-written layout.
 */
export async function restoreDesignOverrides(
  publishPrefix: string,
): Promise<Record<string, string> | null> {
  const srcPrefix = sourcePrefixFor(publishPrefix);
  const manifestBuf = await fetchFromR2(`${srcPrefix}/kareya-manifest.json`, r2Creds());
  if (!manifestBuf) return null;
  try {
    const manifest = JSON.parse(manifestBuf.toString("utf8")) as { rewritten?: string[] };
    if (!manifest.rewritten?.length) return null;
    const files: Record<string, string> = {};
    for (const rel of manifest.rewritten) {
      const buf = await fetchFromR2(`${srcPrefix}/${rel}`, r2Creds());
      if (buf) files[rel] = buf.toString("utf8");
    }
    return Object.keys(files).length ? files : null;
  } catch {
    return null;
  }
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
    writeTree(work, files);
    writeTree(work, imageFiles);

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

/**
 * mode "full": legacy all-in-one (build_site) — publishes sites/ and advances
 * the phase. mode "write": the writer half of the KAR-63 split — produces and
 * validates sources/ only, then chains a build_publish job.
 */
export async function buildSite(
  job: ClaimedJob,
  mode: "full" | "write" = "full",
): Promise<BuildSiteResult> {
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
    await log(
      "no content LLM — deterministic copy (set Gemini, Anthropic, or OpenAI-compatible config)",
    );
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

  // Art Direction (KAR-60): pick the project's layout identity once, then pin
  // it (a non-empty rationale marks "chosen"). Claude first — this is design/
  // code work; revisions can change the design later.
  if (!republish) {
    if (prev?.design.rationale) {
      site = { ...site, design: prev.design };
      await log(`design pinned from previous build (hero=${prev.design.heroVariant})`);
    } else {
      const adChain = [...contentLlmChain()].sort((a) => (a.name === "anthropic" ? -1 : 1));
      for (const choice of adChain) {
        const ad = await artDirection(site, brief, choice.llm);
        if (ad.applied) {
          site = { ...site, design: ad.design };
          await log(
            `art direction (${choice.name}): hero=${ad.design.heroVariant} services=${ad.design.servicesVariant} about=${ad.design.aboutVariant} density=${ad.design.density} radius=${ad.design.radius}${ad.design.customCss ? ` +css(${ad.design.customCss.length}ch)` : ""} — ${ad.design.rationale}`,
          );
          break;
        }
        await log(`art direction failed (${choice.name}: ${String(ad.error).slice(0, 120)})`);
      }
    }
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

  // 2d) Generate the deterministic kit project (the fallback that always builds).
  const kitFiles = generateAstroProject(site);
  await log(`astro project generated → ${Object.keys(kitFiles).length} files`);
  const slug = (job.payload as { slug?: string }).slug;
  const prefix = slug ? `sites/${slug}` : await getPublishPrefix(token);

  // 2e) Design Pass (KAR-62): Claude rewrites component code for THIS business.
  // Pinned across rebuilds via sources/<slug>/kareya-manifest.json; fresh runs
  // are build-gated + content-gated and fall back to the kit on any failure.
  let overrides: Record<string, string> | null = await restoreDesignOverrides(prefix);
  let overridesPinned = false;
  if (overrides) {
    overridesPinned = true;
    await log(`design pass pinned from sources/ (${Object.keys(overrides).length} components)`);
  }

  const anthropicKey = env("ANTHROPIC_API_KEY") ?? env("CLAUDE_API_KEY");
  const designPassEnabled =
    env("DESIGN_PASS") !== "0" && !!anthropicKey && !overrides && !republish;
  const designModel = env("DESIGN_PASS_MODEL") ?? "claude-sonnet-4-5";

  // One worktree for the whole build: install once, build up to 3 times
  // (design attempt, design retry, kit fallback).
  const work = mkdtempSync(join(tmpdir(), `kareya-build-${job.id.slice(0, 8)}-`));
  let uploaded: number;
  let designApplied = !!overrides;
  let designRewritten: string[] = overrides ? Object.keys(overrides) : [];
  try {
    writeTree(work, kitFiles);
    writeTree(work, imageFiles);
    await log("npm install…");
    run("npm install --no-audit --no-fund --silent", work);

    if (designPassEnabled) {
      const llm = anthropicLlm(anthropicKey!, designModel, 16000);
      const probes = contentProbes(site);
      let feedback: string | undefined;
      for (let attempt = 1; attempt <= 2; attempt++) {
        const dp = await designPass(site, brief, kitFiles, llm, feedback);
        if (dp.error) {
          await log(`design pass attempt ${attempt} rejected (${dp.error})`);
          feedback = dp.error;
          continue;
        }
        writeTree(work, dp.files);
        const built = tryBuild(work);
        if (!built.ok) {
          await log(`design pass attempt ${attempt}: astro build FAILED — retrying with error feedback`);
          feedback = `astro build hatası:\n${built.output.slice(-1200)}`;
          writeTree(work, kitFiles); // reset before next attempt
          continue;
        }
        const missing = missingProbes(readBuiltHtml(work), probes);
        if (missing.length) {
          await log(`design pass attempt ${attempt}: content gate FAILED (missing: ${missing.join(" | ").slice(0, 160)})`);
          feedback = `Şu içerikler üretilen sitede KAYBOLDU (props'tan render etmeyi unutma): ${missing.join(", ")}`;
          writeTree(work, kitFiles);
          continue;
        }
        overrides = dp.files;
        designApplied = true;
        designRewritten = dp.rewritten;
        await log(
          `design pass OK (${designModel}, attempt ${attempt}): rewrote ${dp.rewritten.map((f) => f.replace("src/components/", "").replace(".astro", "")).join(", ")} (${dp.outputChars}ch)`,
        );
        break;
      }
      if (!designApplied) await log("design pass fell back to the kit (all attempts failed)");
    }

    // Final build: pinned overrides need a build here; a fresh design pass
    // already left a passing build in dist/; otherwise build the kit.
    if (overridesPinned) writeTree(work, overrides!);
    if (overridesPinned || !designApplied) {
      const built = tryBuild(work);
      if (!built.ok && overridesPinned) {
        // Pinned design no longer builds (e.g. schema drift) — kit fallback.
        await log("pinned design pass no longer builds — falling back to kit");
        writeTree(work, kitFiles);
        overrides = null;
        designApplied = false;
        designRewritten = [];
        run("npm run build", work);
      } else if (!built.ok) {
        throw new Error(`astro build failed: ${built.output.slice(-800)}`);
      }
    }

    if (mode === "full") {
      const rewrittenPages = relativizeAssetPaths(join(work, "dist"));
      await log(`static build complete (assets relativized in ${rewrittenPages} page)`);
      const keys = await uploadDirToR2(join(work, "dist"), prefix, r2Creds(), () => {});
      await log(`published ${keys.length} files → r2://${r2Creds().bucket}/${prefix}`);
      uploaded = keys.length;
    } else {
      await log("write mode — build validated, publish left to build_publish");
      uploaded = 0;
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
  const r2Prefix = prefix;

  // 2f) Publish the SOURCE tree (KAR-63 decision: sources/<slug>/ — the
  // customer's real code) + manifest recording the pinned design files.
  // In write mode this IS the deliverable — a failure here fails the job.
  const finalFiles = { ...kitFiles, ...(overrides ?? {}) };
  try {
    const srcPrefix = sourcePrefixFor(prefix);
    await uploadFilesToR2({ ...finalFiles, ...imageFiles }, srcPrefix, r2Creds());
    await uploadFilesToR2(
      {
        "kareya-manifest.json": JSON.stringify(
          {
            designPass: designApplied,
            rewritten: designRewritten,
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
    await log(`source published → r2://${r2Creds().bucket}/${srcPrefix} (designPass=${designApplied})`);
  } catch (err) {
    if (mode === "write") throw err;
    await log(`source publish skipped (${err instanceof Error ? err.message : err})`);
  }

  // 3) Persist the generated state (revisions patch this), then either advance
  // the phase (full) or chain the build_publish job (write).
  await saveCurrentSite(token, site);
  await saveR2Prefix(token, r2Prefix);
  if (mode === "write") {
    const chained = await enqueueJob("build_publish", {
      token,
      projectId: (job.payload as { projectId?: string }).projectId,
      slug,
    });
    await log(`build_publish chained (job ${chained})`);
  } else {
    const advanced = await advancePhase(token, "PREVIEW_READY");
    await log(advanced ? "phase → PREVIEW_READY" : "phase NOT advanced (unexpected current phase)");
  }

  return { token, briefVersion, r2Prefix, uploaded, businessName: brief.business.name ?? "" };
}
