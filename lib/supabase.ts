import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Anon (public) Supabase client. Sunucu/edge tarafında da fetch-tabanlı
 * çalışır. Service-role gerektiren işler ayrı bir server-only client'ta
 * ele alınır (sonraki ticket'lar) — anon key'i asla service-role ile karıştırma.
 */
export function getSupabase() {
  if (!url || !anonKey) {
    throw new Error(
      "Supabase env değişkenleri eksik: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return createClient(url, anonKey);
}

export const isSupabaseConfigured = Boolean(url && anonKey);
