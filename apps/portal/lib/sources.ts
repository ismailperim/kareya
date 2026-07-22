// Source-tree helpers (KAR-64): the customer's real code lives under
// sources/<slug>/ on R2 (KAR-63), publicly readable through the preview host.
// The build manifest tells us whether Claude wrote custom component code for
// this project ("custom-coded") or it fell back to the deterministic kit.

const PREVIEW_BASE = process.env.PREVIEW_BASE_URL ?? "https://preview.kareya.app";

/** sites/<slug> → sources/<slug>. Null when the project hasn't published yet. */
export function sourcePrefix(r2Prefix: string | null): string | null {
  if (!r2Prefix) return null;
  return r2Prefix.replace(/^sites\//, "sources/");
}

/** Public URL of the source manifest (also the entry point to browse sources). */
export function manifestUrl(r2Prefix: string | null): string | null {
  const src = sourcePrefix(r2Prefix);
  return src ? `${PREVIEW_BASE}/${src}/kareya-manifest.json` : null;
}

export type SourceManifest = {
  designPass: boolean;
  rewritten: string[];
  files?: string[];
  images?: string[];
  generatedAt?: string;
};

/**
 * Fetch the build manifest for a project. Best-effort: a missing/unreadable
 * manifest (older build, network blip) returns null so the dashboard degrades
 * gracefully rather than erroring.
 */
export async function fetchManifest(r2Prefix: string | null): Promise<SourceManifest | null> {
  const url = manifestUrl(r2Prefix);
  if (!url) return null;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    return (await res.json()) as SourceManifest;
  } catch {
    return null;
  }
}
