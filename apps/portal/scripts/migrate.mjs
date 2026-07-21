// KAR-20: minimal SQL migration runner for Neon.
// Applies db/migrations/*.sql in order, tracked in a schema_migrations ledger.
// Usage: `npm run db:migrate -w @kareya/portal` (loads DATABASE_URL from
// .env.local when not already in the environment).

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const here = dirname(fileURLToPath(import.meta.url));
const portalRoot = join(here, "..");
const migrationsDir = join(portalRoot, "db", "migrations");

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const env = readFileSync(join(portalRoot, ".env.local"), "utf8");
    for (const line of env.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("DATABASE_URL=")) {
        return trimmed.slice("DATABASE_URL=".length);
      }
    }
  } catch {
    // no .env.local
  }
  return undefined;
}

// Split a .sql file into individual statements. Strip line comments FIRST so a
// ';' inside a comment doesn't break the split (no ';' inside our DDL bodies).
function statements(sqlText) {
  return sqlText
    .replace(/--.*$/gm, "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  const url = loadDatabaseUrl();
  if (!url) {
    console.error("Missing DATABASE_URL (env or apps/portal/.env.local).");
    process.exit(1);
  }
  const sql = neon(url);

  await sql.query(
    "create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now())",
  );
  const applied = new Set(
    (await sql.query("select version from schema_migrations")).map((r) => r.version),
  );

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip   ${file} (already applied)`);
      continue;
    }
    const stmts = statements(readFileSync(join(migrationsDir, file), "utf8"));
    for (const stmt of stmts) await sql.query(stmt);
    await sql.query("insert into schema_migrations (version) values ($1)", [file]);
    console.log(`applied ${file} (${stmts.length} statements)`);
  }

  const tables = await sql.query(
    "select table_name from information_schema.tables where table_schema='public' order by table_name",
  );
  console.log("public tables:", tables.map((t) => t.table_name).join(", "));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
