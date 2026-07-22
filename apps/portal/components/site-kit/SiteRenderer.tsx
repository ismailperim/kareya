import "@fontsource-variable/inter";
import "@fontsource-variable/sora";

import type { CSSProperties } from "react";

import type { Site } from "@kareya/schemas";

import { displayFont, renderSection, type SectionCtx } from "./sections";

// Deterministic renderer (KAR-32; premium pass KAR-52): Site JSON → page.
// Same JSON → same output. Mirrors the Astro generator's markup.

const NAV_ITEMS: { id: string; label: string; types: string[] }[] = [
  { id: "hizmetler", label: "Hizmetler", types: ["services"] },
  { id: "hakkimizda", label: "Hakkımızda", types: ["about"] },
  { id: "sss", label: "SSS", types: ["faq"] },
];

export function SiteRenderer({ site }: { site: Site }) {
  const page = site.pages[0];
  const sectionTypes = new Set((page?.sections ?? []).map((s) => s.type));
  const ctx: SectionCtx = { hasServices: sectionTypes.has("services") };
  const nav = NAV_ITEMS.filter((n) => n.types.some((t) => sectionTypes.has(t as never)));

  return (
    <div
      style={
        {
          "--brand": site.brand.primary,
          fontFamily: '"Inter Variable", ui-sans-serif, system-ui, sans-serif',
          scrollBehavior: "smooth",
        } as CSSProperties
      }
      className="min-h-screen bg-white text-gray-700 antialiased"
    >
      <header className="sticky top-0 z-10 border-b border-gray-900/5 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold tracking-tight text-gray-900" style={displayFont}>
            {site.meta.businessName || "Site"}
          </span>
          <nav className="hidden items-center gap-7 sm:flex">
            {nav.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
              >
                {n.label}
              </a>
            ))}
          </nav>
          <a
            href="#iletisim"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: "var(--brand)" }}
          >
            İletişim
          </a>
        </div>
      </header>

      <main>{page?.sections.map((section, i) => renderSection(section, i, ctx))}</main>

      <footer className="border-t border-gray-900/5 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-sm text-gray-400 sm:flex-row">
          <span className="font-medium text-gray-500">{site.meta.businessName || "İşletme"}</span>
          <span>
            © {site.meta.businessName || "İşletme"} ·{" "}
            <span className="font-medium" style={{ color: "var(--brand)" }}>
              kareya
            </span>{" "}
            ile hazırlandı
          </span>
        </div>
      </footer>

      {site.whatsapp.enabled && (
        <a
          href={
            site.whatsapp.number
              ? `https://wa.me/${site.whatsapp.number.replace(/\D/g, "")}`
              : "#iletisim"
          }
          aria-label="WhatsApp ile yazın"
          className="fixed bottom-5 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-2xl text-white shadow-lg transition hover:scale-105"
        >
          💬
        </a>
      )}
    </div>
  );
}
