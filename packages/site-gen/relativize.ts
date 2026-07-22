import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

// Post-build asset-path relativization (KAR-38). Astro emits root-relative
// asset URLs (/_astro/…), which only work when the site is served from the
// domain root. Our sites must work BOTH under a subdirectory
// (preview.kareya.app/sites/<token>/) AND at a customer's own domain root
// (musterisite.com/) — so we rewrite them to depth-aware relative paths
// (_astro/… or ../_astro/…), which resolve correctly anywhere.

function walkHtml(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walkHtml(p));
    else if (p.endsWith(".html")) out.push(p);
  }
  return out;
}

/** Rewrite root-relative /_astro/ URLs in every dist HTML to relative paths. */
export function relativizeAssetPaths(distDir: string): number {
  let rewritten = 0;
  for (const file of walkHtml(distDir)) {
    // Depth of the HTML file below dist root decides the ../ prefix.
    const rel = relative(distDir, file);
    const depth = rel.split(sep).length - 1;
    const prefix = "../".repeat(depth);
    const html = readFileSync(file, "utf8");
    const updated = html.replaceAll('="/_astro/', `="${prefix}_astro/`);
    if (updated !== html) {
      writeFileSync(file, updated);
      rewritten++;
    }
  }
  return rewritten;
}
