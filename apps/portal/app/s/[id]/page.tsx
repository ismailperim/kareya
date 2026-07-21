import { parseSite } from "@kareya/schemas";

import { DEMO_SITE } from "@/components/site-kit/demo-site";
import { SiteRenderer } from "@/components/site-kit/SiteRenderer";

// Per-site preview (KAR-32). v1 renders the demo fixture; loading a real Site
// JSON from Neon (produced by the KAR-33 assembler) comes next.
export default async function SitePreview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;
  const site = parseSite(DEMO_SITE);
  return <SiteRenderer site={site} />;
}
