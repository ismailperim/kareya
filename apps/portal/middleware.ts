import { NextResponse, type NextRequest } from "next/server";

// Ops guard (KAR-42 groundwork): HTTP Basic Auth in front of the admin panel
// and its APIs. This is the application-level floor — Cloudflare Access can
// (and should) sit in front of it as a second layer, but the panel must never
// depend on edge config alone. Fail-closed: in production with no
// OPS_PASSWORD configured, /ops is locked, not open.
//
// Customer-facing routes (meeting rooms, previews) are NOT behind this —
// they are token-gated per session.

export const config = {
  matcher: ["/ops/:path*", "/ops", "/api/ops/:path*"],
};

export function middleware(req: NextRequest) {
  const password = process.env.OPS_PASSWORD;

  // Local dev without a password stays open; production without one locks.
  if (!password) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return new NextResponse("ops panel locked: OPS_PASSWORD is not configured", {
      status: 401,
    });
  }

  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const supplied = decoded.slice(decoded.indexOf(":") + 1);
      if (supplied === password) return NextResponse.next();
    } catch {
      /* fall through to 401 */
    }
  }

  return new NextResponse("authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="kareya ops"' },
  });
}
