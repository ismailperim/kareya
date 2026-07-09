import { NextResponse } from "next/server";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({
      ok: false,
      supabase: "unconfigured",
      hint: ".env.local dosyasını doldurun (bkz. .env.example)",
    });
  }

  try {
    const supabase = getSupabase();
    // Bağlantı kanıtı: client kuruluyor + Supabase Auth uç noktasına erişiliyor.
    // Gerçek tablo okuması şema ticket'larıyla gelecek.
    const { error } = await supabase.auth.getSession();
    if (error) throw error;
    return NextResponse.json({ ok: true, supabase: "connected" });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        supabase: "error",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
