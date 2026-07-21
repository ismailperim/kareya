// KAR-38 (first stage): upload a built static site to Cloudflare R2 so the
// output is visible/servable from R2. Usage:
//   npm run upload:r2 -w @kareya/portal -- <localDir> <keyPrefix>
// Reads R2 S3 credentials from env or apps/portal/.env.local:
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { AwsClient } from "aws4fetch";

const portalRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function envVal(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  try {
    const env = readFileSync(join(portalRoot, ".env.local"), "utf8");
    for (const line of env.split("\n")) {
      const t = line.trim();
      if (t.startsWith(`${name}=`)) return t.slice(name.length + 1);
    }
  } catch {
    /* no .env.local */
  }
  return undefined;
}

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

async function main() {
  const localDir = process.argv[2];
  const prefix = (process.argv[3] || "").replace(/^\/+|\/+$/g, "");
  if (!localDir) {
    console.error("Usage: upload:r2 -- <localDir> <keyPrefix>");
    process.exit(1);
  }

  const accountId = envVal("R2_ACCOUNT_ID");
  const accessKeyId = envVal("R2_ACCESS_KEY_ID");
  const secretAccessKey = envVal("R2_SECRET_ACCESS_KEY");
  const bucket = envVal("R2_BUCKET");
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    console.error(
      "Missing R2 creds. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET (env or .env.local).",
    );
    process.exit(1);
  }

  const aws = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

  const files = walk(localDir);
  let ok = 0;
  for (const file of files) {
    const rel = relative(localDir, file).split("\\").join("/");
    const key = prefix ? `${prefix}/${rel}` : rel;
    const body = readFileSync(file);
    const ct = CONTENT_TYPES[extname(file).toLowerCase()] ?? "application/octet-stream";
    const res = await aws.fetch(`${endpoint}/${bucket}/${key}`, {
      method: "PUT",
      body,
      headers: { "content-type": ct },
    });
    if (!res.ok) {
      console.error(`✗ ${key} → ${res.status} ${(await res.text()).slice(0, 200)}`);
      process.exit(1);
    }
    ok++;
    console.log(`✓ ${key} (${ct})`);
  }
  console.log(`\nuploaded ${ok} files to r2://${bucket}/${prefix || ""}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
