import { redirect } from "next/navigation";

import { parseSite, safeParseBrief, type Site } from "@kareya/schemas";

import { DEMO_SITE } from "@/components/site-kit/demo-site";
import { SiteRenderer } from "@/components/site-kit/SiteRenderer";
import { isDbConfigured } from "@/lib/db";
import { getCurrentSite, getDraft, getProjectForToken } from "@/lib/meeting-repo";
import { briefToSite } from "@kareya/site-gen";

// Per-site preview (KAR-32/33/56). One link, always the right page:
// - a BUILT site exists (current_site) → redirect to the published static site
//   on R2 (the real thing);
// - otherwise, if the token has a saved brief → assemble + render dynamically
//   (pre-build preview);
// - otherwise the demo fixture.
const PREVIEW_BASE = process.env.PREVIEW_BASE_URL ?? "https://preview.kareya.app";

export default async function SitePreview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let site: Site | null = null;
  if (isDbConfigured && id && id.length >= 8) {
    try {
      const built = await getCurrentSite(id);
      if (built) {
        // Project publish path (sites/<slug>) when attached; token path legacy.
        const project = await getProjectForToken(id);
        const prefix = project?.r2_prefix ?? `sites/${id}`;
        redirect(`${PREVIEW_BASE}/${prefix}/index.html`);
      }
      const draft = await getDraft(id);
      const parsed = draft ? safeParseBrief(draft) : null;
      if (parsed?.success) site = briefToSite(parsed.data);
    } catch (err) {
      // next/navigation redirect works by throwing — let it through.
      if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw err;
      /* fall back to the demo fixture */
    }
  }

  return <SiteRenderer site={site ?? parseSite(DEMO_SITE)} />;
}
