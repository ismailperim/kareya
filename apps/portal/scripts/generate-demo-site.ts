// KAR-37: generate a real Astro project from the demo Site JSON, to verify the
// generator end-to-end (generate → astro build). Usage:
//   npm run generate:demo -w @kareya/portal -- <outDir>

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { parseSite } from "@kareya/schemas";
import { generateAstroProject } from "@kareya/site-gen";

import { DEMO_SITE } from "../components/site-kit/demo-site";

const outDir = process.argv[2] || "./_generated-site";
const site = parseSite(DEMO_SITE);
const files = generateAstroProject(site);

for (const [rel, content] of Object.entries(files)) {
  const path = join(outDir, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

console.log(`generated ${Object.keys(files).length} files → ${outDir}`);
console.log(Object.keys(files).join("\n"));
