import path from "node:path";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Portal + görüşme odası dinamik (Cloudflare Workers, OpenNext ile).
  // Üretilen müşteri siteleri ayrı statik-export hattıyla render edilir
  // (component-kit — sonraki ticket'lar).

  // Tracing kökü = monorepo kökü (apps/portal'dan iki üst), packages/* dahil.
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),

  // Workspace paketlerini Next transpile etsin (monorepo).
  transpilePackages: ["@kareya/schemas"],
};

export default nextConfig;

// `next dev` sırasında Cloudflare binding'lerine erişim için (OpenNext).
initOpenNextCloudflareForDev();
