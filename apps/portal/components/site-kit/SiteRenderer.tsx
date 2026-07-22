import "@fontsource-variable/inter";
import "@fontsource-variable/sora";

import type { CSSProperties } from "react";

import type { Site } from "@kareya/schemas";

import {
  displayFont,
  KitIcon,
  Monogram,
  renderSection,
  type SectionCtx,
} from "./sections";

// Deterministic renderer (KAR-32; design system v3 KAR-52): Site JSON → page.
// Sets the design tokens (--brand + ink/surface neutrals) and mirrors the
// Astro generator's markup: monogram header, anchor nav, two-tier footer.

const NAV_ITEMS: { id: string; label: string; types: string[] }[] = [
  { id: "hizmetler", label: "Hizmetler", types: ["services"] },
  { id: "hakkimizda", label: "Hakkımızda", types: ["about"] },
  { id: "sss", label: "SSS", types: ["faq"] },
];

export function SiteRenderer({ site }: { site: Site }) {
  const page = site.pages[0];
  const name = site.meta.businessName || "Site";
  const sectionTypes = new Set((page?.sections ?? []).map((s) => s.type));
  const ctx: SectionCtx = { hasServices: sectionTypes.has("services") };
  const nav = NAV_ITEMS.filter((n) => n.types.some((t) => sectionTypes.has(t as never)));
  const contact = (page?.sections ?? []).find((x) => x.type === "contact");
  const footerBits =
    contact && contact.type === "contact"
      ? [contact.phone, contact.email, contact.whatsapp && `WhatsApp: ${contact.whatsapp}`].filter(
          Boolean,
        )
      : [];

  return (
    <div
      style={
        {
          "--brand": site.brand.primary,
          "--ink": "#1c1d21",
          "--ink-soft": "#4b4e57",
          "--ink-mut": "#8a8d96",
          "--surface": "#fafafb",
          fontFamily: '"Inter Variable", ui-sans-serif, system-ui, sans-serif',
          scrollBehavior: "smooth",
          background: "var(--surface)",
          color: "var(--ink-soft)",
        } as CSSProperties
      }
      className="min-h-screen antialiased"
    >
      <header className="sticky top-0 z-10 border-b border-gray-900/5 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="flex items-center gap-2.5">
            <Monogram name={name} />
            <span
              className="text-lg font-semibold tracking-tight"
              style={{ color: "var(--ink)", ...displayFont }}
            >
              {name}
            </span>
          </span>
          <nav className="hidden items-center gap-7 sm:flex">
            {nav.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                className="text-sm font-medium transition hover:opacity-70"
                style={{ color: "var(--ink-soft)" }}
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

      <footer className="border-t border-gray-900/5 px-6 pt-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 pb-8 sm:flex-row">
          <span className="flex items-center gap-2.5">
            <Monogram name={name} />
            <span className="font-semibold" style={{ color: "var(--ink)" }}>
              {name}
            </span>
          </span>
          {footerBits.length > 0 && (
            <div
              className="flex flex-wrap items-center justify-center gap-3 text-sm"
              style={{ color: "var(--ink-soft)" }}
            >
              {footerBits.map((b, i) => (
                <span key={i}>{b}</span>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-gray-900/5 py-6 text-center text-sm text-gray-500">
          © {name} ·{" "}
          <a
            href="https://kareya.app"
            className="font-medium transition hover:opacity-80"
            style={{ color: "var(--brand)" }}
          >
            kareya
          </a>{" "}
          ile hazırlandı
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
          className="fixed bottom-5 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105"
        >
          <span className="[&_svg]:stroke-white">
            <KitIcon name="chat" className="h-7 w-7" />
          </span>
        </a>
      )}
    </div>
  );
}
