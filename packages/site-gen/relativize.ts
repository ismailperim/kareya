import { createHash } from "node:crypto";
import { readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative, sep } from "node:path";

// Post-build asset-path relativization (KAR-38). Astro emits root-relative
// asset URLs (/_astro/…), which only work when the site is served from the
// domain root. Our sites must work BOTH under a subdirectory
// (preview.kareya.app/sites/<token>/) AND at a customer's own domain root
// (musterisite.com/) — so we rewrite them to depth-aware relative paths
// (_astro/… or ../_astro/…), which resolve correctly anywhere.

function walkByExt(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walkByExt(p, exts));
    else if (exts.some((e) => p.endsWith(e))) out.push(p);
  }
  return out;
}

/**
 * Rewrite root-relative /_astro/ URLs to relative paths:
 * - HTML: href/src attributes get a depth-aware ../ prefix.
 * - CSS: url(/_astro/…) refs (e.g. self-hosted fonts) become relative to the
 *   CSS file's own directory (same-dir for Astro's flat _astro output).
 */
export function relativizeAssetPaths(distDir: string): number {
  let rewritten = 0;

  for (const file of walkByExt(distDir, [".html"])) {
    const depth = relative(distDir, file).split(sep).length - 1;
    const prefix = "../".repeat(depth);
    const html = readFileSync(file, "utf8");
    const updated = html.replaceAll('="/_astro/', `="${prefix}_astro/`);
    if (updated !== html) {
      writeFileSync(file, updated);
      rewritten++;
    }
  }

  const astroDir = join(distDir, "_astro");
  for (const file of walkByExt(distDir, [".css"])) {
    const relToAstro = relative(join(file, ".."), astroDir).split(sep).join("/");
    const prefix = relToAstro === "" ? "./" : `${relToAstro}/`;
    const css = readFileSync(file, "utf8");
    const updated = css
      .replaceAll("url(/_astro/", `url(${prefix}`)
      .replaceAll('url("/_astro/', `url("${prefix}`)
      .replaceAll("url('/_astro/", `url('${prefix}`);
    if (updated !== css) {
      writeFileSync(file, updated);
      rewritten++;
    }

    // Cache-safe republish: our rewrite changes the CSS content AFTER Astro
    // hashed the filename, so the same URL would carry new content — and edge
    // caches (R2 custom domain) would keep serving the stale copy. Rename the
    // file with a hash of the FINAL content and update every HTML reference.
    const finalHash = createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 8);
    const oldName = basename(file);
    const newName = oldName.replace(/\.css$/, `.${finalHash}.css`);
    if (newName !== oldName) {
      renameSync(file, join(file, "..", newName));
      for (const htmlFile of walkByExt(distDir, [".html"])) {
        const html = readFileSync(htmlFile, "utf8");
        const replaced = html.replaceAll(oldName, newName);
        if (replaced !== html) writeFileSync(htmlFile, replaced);
      }
    }
  }

  return rewritten;
}
