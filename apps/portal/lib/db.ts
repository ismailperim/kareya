import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;

/**
 * Neon serverless Postgres client (HTTP). Node ve Cloudflare Workers/edge
 * runtime'ında çalışır (TCP gerektirmez). `DATABASE_URL` server-only bir
 * secret'tır — asla client'a sızdırma, asla commit etme.
 *
 * Not: Neon saf Postgres. Auth ve Storage için ayrı çözüm ileride kararlaştırılır.
 */
export function getDb() {
  if (!connectionString) {
    throw new Error("DATABASE_URL env değişkeni eksik (bkz. .env.example).");
  }
  return neon(connectionString);
}

export const isDbConfigured = Boolean(connectionString);
