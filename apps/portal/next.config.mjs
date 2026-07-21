import path from "node:path";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Portal + meeting room are dynamic (Cloudflare Workers via OpenNext).
  // Generated client sites are rendered by a separate static-export
  // pipeline (component-kit — later tickets).

  // Pin the tracing root to the monorepo root (two levels up from
  // apps/portal) so packages/* are traced.
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),

  // Let Next transpile workspace packages (monorepo).
  transpilePackages: ["@kareya/schemas", "@kareya/site-gen"],
};

export default nextConfig;

// Access Cloudflare bindings during `next dev` (OpenNext).
initOpenNextCloudflareForDev();
