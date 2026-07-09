import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;

/**
 * Neon serverless Postgres client (HTTP). Works in Node and on the
 * Cloudflare Workers/edge runtime (no TCP required). `DATABASE_URL` is a
 * server-only secret — never expose it to the client, never commit it.
 *
 * Note: Neon is plain Postgres. Auth and Storage are decided separately later.
 */
export function getDb() {
  if (!connectionString) {
    throw new Error(
      "Missing DATABASE_URL environment variable (see .env.example).",
    );
  }
  return neon(connectionString);
}

export const isDbConfigured = Boolean(connectionString);
