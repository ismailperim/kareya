import { parseSite, safeParseBrief, type Site } from "@kareya/schemas";

import { DEMO_SITE } from "@/components/site-kit/demo-site";
import { SiteRenderer } from "@/components/site-kit/SiteRenderer";
import { isDbConfigured } from "@/lib/db";
import { getDraft } from "@/lib/meeting-repo";
import { briefToSite } from "@kareya/site-gen";

// Per-site preview (KAR-32/33). If `id` is a meeting token with a saved brief,
// assemble a Site JSON from that brief and render it (the meeting → live site
// loop). Otherwise fall back to the demo fixture.
export default async function SitePreview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let site: Site | null = null;
  if (isDbConfigured && id && id.length >= 8) {
    try {
      const draft = await getDraft(id);
      const parsed = draft ? safeParseBrief(draft) : null;
      if (parsed?.success) site = briefToSite(parsed.data);
    } catch {
      /* fall back to the demo fixture */
    }
  }

  return <SiteRenderer site={site ?? parseSite(DEMO_SITE)} />;
}
