import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

import { AwsClient } from "aws4fetch";

// R2 publish (KAR-38/46): upload a built static site directory to R2 via the
// S3 API. Pure — credentials come in as arguments; callers own env reading.

export type R2Credentials = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

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
  ".woff2": "font/woff2",
  ".woff": "font/woff",
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

/** Fetch a single object from R2 (e.g. restoring site images on revision). */
export async function fetchFromR2(
  key: string,
  creds: R2Credentials,
): Promise<Buffer | null> {
  const aws = new AwsClient({
    accessKeyId: creds.accessKeyId,
    secretAccessKey: creds.secretAccessKey,
    service: "s3",
    region: "auto",
  });
  const endpoint = `https://${creds.accountId}.r2.cloudflarestorage.com`;
  const res = await aws.fetch(`${endpoint}/${creds.bucket}/${key}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`R2 GET ${key} failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Upload an in-memory file map to `r2://bucket/prefix/` (source trees, manifests). */
export async function uploadFilesToR2(
  files: Record<string, string | Buffer>,
  prefix: string,
  creds: R2Credentials,
): Promise<string[]> {
  const aws = new AwsClient({
    accessKeyId: creds.accessKeyId,
    secretAccessKey: creds.secretAccessKey,
    service: "s3",
    region: "auto",
  });
  const endpoint = `https://${creds.accountId}.r2.cloudflarestorage.com`;
  const cleanPrefix = prefix.replace(/^\/+|\/+$/g, "");
  const keys: string[] = [];
  for (const [rel, content] of Object.entries(files)) {
    const key = cleanPrefix ? `${cleanPrefix}/${rel}` : rel;
    const ct = CONTENT_TYPES[extname(rel).toLowerCase()] ?? "text/plain; charset=utf-8";
    const res = await aws.fetch(`${endpoint}/${creds.bucket}/${key}`, {
      method: "PUT",
      body: typeof content === "string" ? content : new Uint8Array(content),
      headers: { "content-type": ct },
    });
    if (!res.ok) {
      throw new Error(`R2 PUT ${key} failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
    }
    keys.push(key);
  }
  return keys;
}

/** Upload every file under `localDir` to `r2://bucket/prefix/`. Returns keys. */
export async function uploadDirToR2(
  localDir: string,
  prefix: string,
  creds: R2Credentials,
  log: (line: string) => void = () => {},
): Promise<string[]> {
  const aws = new AwsClient({
    accessKeyId: creds.accessKeyId,
    secretAccessKey: creds.secretAccessKey,
    service: "s3",
    region: "auto",
  });
  const endpoint = `https://${creds.accountId}.r2.cloudflarestorage.com`;
  const cleanPrefix = prefix.replace(/^\/+|\/+$/g, "");

  const keys: string[] = [];
  for (const file of walk(localDir)) {
    const rel = relative(localDir, file).split("\\").join("/");
    const key = cleanPrefix ? `${cleanPrefix}/${rel}` : rel;
    const body = readFileSync(file);
    const ct = CONTENT_TYPES[extname(file).toLowerCase()] ?? "application/octet-stream";
    const res = await aws.fetch(`${endpoint}/${creds.bucket}/${key}`, {
      method: "PUT",
      body,
      headers: { "content-type": ct },
    });
    if (!res.ok) {
      throw new Error(`R2 PUT ${key} failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
    }
    keys.push(key);
    log(`uploaded ${key}`);
  }
  return keys;
}
