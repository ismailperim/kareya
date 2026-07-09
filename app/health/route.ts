import { NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/db";

export async function GET() {
  if (!isDbConfigured) {
    return NextResponse.json({
      ok: false,
      db: "unconfigured",
      hint: ".env.local dosyasında DATABASE_URL tanımlayın (bkz. .env.example)",
    });
  }

  try {
    const sql = getDb();
    // Bağlantı kanıtı: gerçek bir sorgu çalıştır.
    const rows = await sql`select now() as now`;
    return NextResponse.json({ ok: true, db: "connected", now: rows[0]?.now });
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
