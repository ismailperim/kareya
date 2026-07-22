import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { fetchFromR2, relativizeAssetPaths, uploadDirToR2 } from "@kareya/site-gen";

import { r2Creds, run, sourcePrefixFor, tryBuild, writeTree } from "./build-site";
import { advancePhase, appendJobLog, getPublishPrefix, type ClaimedJob } from "./db";

// build_publish (KAR-63): the builder half of the split. Fetches the project's
// canonical source tree from sources/<slug>/ (written by write_code /
// revise_site), builds it in an isolated worktree and publishes dist/ to
// sites/<slug>/. No LLM calls here — a pure, retryable build stage that can
// run in a least-privilege container (RUNNER_ROLE=builder).

export type BuildPublishResult = {
  token: string;
  r2Prefix: string;
  uploaded: number;
};

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|ico|woff2?)$/i;

export async function buildPublish(job: ClaimedJob): Promise<BuildPublishResult> {
  const token = String(job.payload.token ?? "");
  if (!token) throw new Error("build_publish payload missing token");
  const log = (line: string) => appendJobLog(job.id, line);

  const slug = (job.payload as { slug?: string }).slug;
  const prefix = slug ? `sites/${slug}` : await getPublishPrefix(token);
  const srcPrefix = sourcePrefixFor(prefix);

  // 1) Fetch the source tree by its manifest.
  const manifestBuf = await fetchFromR2(`${srcPrefix}/kareya-manifest.json`, r2Creds());
  if (!manifestBuf) throw new Error(`No source manifest at ${srcPrefix}/kareya-manifest.json`);
  const manifest = JSON.parse(manifestBuf.toString("utf8")) as {
    files?: string[];
    images?: string[];
    designPass?: boolean;
  };
  const paths = [...(manifest.files ?? []), ...(manifest.images ?? [])];
  if (!paths.length) throw new Error("Source manifest lists no files");

  const tree: Record<string, string | Buffer> = {};
  for (const rel of paths) {
    const buf = await fetchFromR2(`${srcPrefix}/${rel}`, r2Creds());
    if (!buf) throw new Error(`Source file missing in R2: ${srcPrefix}/${rel}`);
    tree[rel] = IMAGE_EXT.test(rel) ? buf : buf.toString("utf8");
  }
  await log(`source fetched (${paths.length} files, designPass=${manifest.designPass === true})`);

  // 2) Build in an isolated worktree, publish dist/.
  const work = mkdtempSync(join(tmpdir(), `kareya-publish-${job.id.slice(0, 8)}-`));
  try {
    writeTree(work, tree);
    await log("npm install…");
    run("npm install --no-audit --no-fund --silent", work);
    await log("astro build…");
    const built = tryBuild(work);
    if (!built.ok) throw new Error(`astro build failed: ${built.output.slice(-800)}`);

    const rewritten = relativizeAssetPaths(join(work, "dist"));
    await log(`static build complete (assets relativized in ${rewritten} page)`);
    const keys = await uploadDirToR2(join(work, "dist"), prefix, r2Creds(), () => {});
    await log(`published ${keys.length} files → r2://${r2Creds().bucket}/${prefix}`);

    const advanced = await advancePhase(token, "PREVIEW_READY");
    await log(advanced ? "phase → PREVIEW_READY" : "phase NOT advanced (unexpected current phase)");
    return { token, r2Prefix: prefix, uploaded: keys.length };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
