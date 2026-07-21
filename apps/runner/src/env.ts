import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Runner config: process env first, then apps/runner/.env (gitignored), then —
// dev convenience only — apps/portal/.env.local so a local checkout just works.

const runnerRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const CANDIDATE_FILES = [
  join(runnerRoot, ".env"),
  join(runnerRoot, "..", "portal", ".env.local"),
];

function fromFiles(name: string): string | undefined {
  for (const file of CANDIDATE_FILES) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const t = line.trim();
      if (t.startsWith(`${name}=`)) return t.slice(name.length + 1);
    }
  }
  return undefined;
}

export function env(name: string): string | undefined {
  return process.env[name] ?? fromFiles(name);
}

export function requireEnv(name: string): string {
  const v = env(name);
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}
