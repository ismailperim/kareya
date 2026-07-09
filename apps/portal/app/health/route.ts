import { NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/db";
import { SCHEMAS_VERSION } from "@kareya/schemas";

export async function GET() {
  if (!isDbConfigured) {
    return NextResponse.json({
      ok: false,
      db: "unconfigured",
      hint: "Set DATABASE_URL in .env.local (see .env.example)",
    });
  }

  try {
    const sql = getDb();
    // Connectivity proof: run a real query.
    const rows = await sql`select now() as now`;
    return NextResponse.json({
      ok: true,
      db: "connected",
      now: rows[0]?.now,
      schemas: SCHEMAS_VERSION,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        db: "error",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
