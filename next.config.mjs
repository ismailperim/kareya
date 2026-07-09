import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Portal + görüşme odası dinamik (Cloudflare Workers, OpenNext ile).
  // Üretilen müşteri siteleri ayrı statik-export hattıyla render edilir
  // (component-kit — sonraki ticket'lar).

  // Workspace kökünü repoya sabitle (home dizinindeki başıboş lockfile'ı yok say).
  outputFileTracingRoot: import.meta.dirname,

  // Workspace paketlerini Next transpile etsin (monorepo).
  transpilePackages: ["@kareya/schemas"],
};

export default nextConfig;

// `next dev` sırasında Cloudflare binding'lerine erişim için (OpenNext).
initOpenNextCloudflareForDev();
