import type { CSSProperties } from "react";

import type { Site } from "@kareya/schemas";

import { renderSection } from "./sections";

// Deterministic renderer (KAR-32): Site JSON → page. Same JSON → same output.
// The brand color flows down via the `--brand` CSS var; sections read it.
export function SiteRenderer({ site }: { site: Site }) {
  const page = site.pages[0];
  return (
    <div
      style={{ "--brand": site.brand.primary } as CSSProperties}
      className="min-h-screen bg-white text-gray-900"
    >
      <header className="sticky top-0 z-10 border-b border-black/5 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <span className="font-semibold" style={{ color: "var(--brand)" }}>
            {site.meta.businessName || "Site"}
          </span>
          <a
            href="#iletisim"
            className="rounded-lg px-3.5 py-1.5 text-sm font-medium text-white"
            style={{ backgroundColor: "var(--brand)" }}
          >
            İletişim
          </a>
        </div>
      </header>

      <main>{page?.sections.map((section, i) => renderSection(section, i))}</main>

      <footer className="border-t border-black/5 py-8 text-center text-sm text-gray-400">
        © {site.meta.businessName || "İşletme"} · kareya ile hazırlandı
      </footer>
    </div>
  );
}
