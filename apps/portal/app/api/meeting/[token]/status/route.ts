import { NextResponse } from "next/server";

import { isDbConfigured } from "@/lib/db";
import { getProjectForToken } from "@/lib/meeting-repo";

// Room status (KAR-57): the meeting room reads its project's phase to switch
// between brief-collection mode and "your site is ready" mode.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length < 8) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }
  if (!isDbConfigured) return NextResponse.json({ phase: null, siteReady: false });
  try {
    const project = await getProjectForToken(token);
    const phase = project?.phase ?? null;
    const siteReady = !!project?.r2_prefix;
    return NextResponse.json({
      phase,
      siteReady,
      building: phase === "BUILDING",
      projectName: project?.name ?? null,
      previewUrl: `/s/${token}`,
    });
  } catch (err) {
    console.error("[meeting/status] failed", err);
    return NextResponse.json({ phase: null, siteReady: false });
  }
}
