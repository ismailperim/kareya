import type { Site, SiteDesign, SitePage } from "@kareya/schemas";

// Site JSON → a real, self-contained Astro project (KAR-37/52/55; v2 KAR-61).
// v2 architecture: CONTENT and PRESENTATION are separated in the emitted
// project — content lives in src/data/site.json, presentation in props-driven
// src/components/*.astro, pages are a thin data→component mapping. This makes
// the components rewritable by the Design Pass (KAR-62) while content stays
// the single source of truth: a content revision only touches site.json.
// Variant choices (KAR-60) are resolved at generation time and baked into the
// component source, so each component file is one coherent rewrite target.
// Multi-page sites use Astro's `build.format: "file"` so links are plain
// sibling files (hakkimizda.html) — works on R2 AND at a customer's own
// domain with no server rewrites. Deterministic.

// ---- Contrast guard (deterministic) ----
// Pastel palettes (customer-chosen) must never produce white-on-light buttons
// or light-on-white text. Two derived tokens: --on-brand (text ON a brand
// background) and --brand-ink (brand-hued text on light surfaces, darkened
// until readable). Dark palettes pass through unchanged.

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Text color for use on top of the brand color. */
export function onBrand(brandHex: string): string {
  const rgb = hexToRgb(brandHex);
  return rgb && luminance(rgb) > 0.45 ? "#1c1d21" : "#ffffff";
}

/** Brand-hued TEXT color, darkened until readable on light surfaces. */
export function brandInk(brandHex: string): string {
  let rgb = hexToRgb(brandHex);
  if (!rgb) return brandHex;
  // L <= 0.18 => >= 4.5:1 against white — AA for small text (kickers, links).
  let guard = 0;
  while (luminance(rgb) > 0.18 && guard++ < 20) {
    rgb = rgb.map((v) => Math.max(0, Math.round(v * 0.85))) as [number, number, number];
  }
  return `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * The one place the LLM writes free-form CSS (KAR-60): project-specific CSS
 * appended to global.css. Sanitized — no imports, no external fetches — and
 * size-capped; worst case is ugly styling, never a broken build.
 */
export function sanitizeCustomCss(css: string): string {
  return css
    .replace(/@import[^;]*;?/gi, "")
    .replace(/url\(\s*(['"]?)(?!data:)[^)]*\1\)/gi, "none")
    .replace(/<\/?style[^>]*>/gi, "")
    .slice(0, 6000);
}

function customCssBlock(design: SiteDesign): string {
  const css = sanitizeCustomCss(design.customCss ?? "");
  return css ? `\n/* Art Direction custom CSS */\n${css}\n` : "";
}

function monogramInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] ?? "")
      .join("")
      .toUpperCase() || "K"
  );
}

function pageFileName(path: string): string {
  return path === "/" ? "index" : path.replace(/^\/+/, "").replace(/\/+$/, "");
}

// ---- Static component sources ----
// These strings are the DETERMINISTIC KIT: props-driven .astro components with
// zero generation-time content baked in (the Design Pass may replace them; the
// kit is the fallback that always builds). Only variant choice picks between
// alternative bodies below.

const ICON_ASTRO = `---
// Inline SVG icon set (no emoji, no external requests).
const { name, cls = "h-5 w-5", stroke = "var(--brand)" } = Astro.props;
const PATHS = {
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  instagram: '<rect width="20" height="20" x="2" y="2" rx="5"/><circle cx="12" cy="12" r="4"/><line x1="17.5" y1="6.5" x2="17.5" y2="6.5"/>',
  facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
};
---
<svg class={cls} viewBox="0 0 24 24" fill="none" stroke={stroke} stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" set:html={PATHS[name] ?? ""} />
`;

const MONOGRAM_ASTRO = `---
import site from "../data/site.json";
---
<span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold" style="background: var(--brand); color: var(--on-brand);">{site._ctx.initials}</span>
`;

const SECTION_HEADING_ASTRO = `---
const { kicker, title } = Astro.props;
---
<div class="text-center">
  <div class="text-xs font-semibold uppercase tracking-[0.2em]" style="color: var(--brand-ink);">{kicker}</div>
  <h2 class="mt-2 text-3xl font-semibold leading-[1.15] tracking-tight sm:text-4xl" style="color: var(--ink);">{title}</h2>
</div>
`;

// Hero CTA row, shared by the hero variants (aligned = left on desktop).
const heroCtas = (aligned: boolean) => `
    <div class="mt-10 flex flex-wrap items-center ${aligned ? "justify-center lg:justify-start" : "justify-center"} gap-3">
      {section.ctaLabel && <a href={section.ctaHref} class="rounded-xl px-8 py-4 font-semibold shadow-lg transition hover:opacity-90 hover:shadow-xl" style="background-color: var(--brand); color: var(--on-brand); box-shadow: 0 10px 25px -5px color-mix(in srgb, var(--brand) 40%, transparent);">{section.ctaLabel}</a>}
      {ctx.hasServices && <a href={ctx.servicesHref} class="rounded-xl border border-gray-200 bg-white/80 px-8 py-4 font-semibold backdrop-blur transition hover:bg-white" style="color: var(--ink-soft);">Hizmetlerimiz</a>}
    </div>`;

const HERO_BG = `
  <div class="absolute inset-0" style="background: color-mix(in srgb, var(--brand) 7%, var(--surface));"></div>
  <div class="absolute inset-0 hidden opacity-40 sm:block" style="background-image: radial-gradient(color-mix(in srgb, var(--brand) 22%, white) 1px, transparent 1px); background-size: 22px 22px;"></div>
  <div class="absolute -right-32 -top-32 h-96 w-96 rounded-full blur-3xl" style="background: color-mix(in srgb, var(--brand) 16%, white);"></div>`;

const HERO_FRONT = `---
import site from "../data/site.json";
const { section } = Astro.props;
const ctx = site._ctx;
---`;

function heroAstro(variant: "statement" | "photoSplit" | "minimal"): string {
  if (variant === "minimal") {
    return `${HERO_FRONT}
<section id="hero" class="relative border-b border-gray-900/5">
  <div class="mx-auto max-w-6xl px-6 py-16 sm:py-24">
    <h1 class="max-w-3xl text-4xl font-medium leading-[1.1] tracking-tight sm:text-5xl" style="color: var(--ink);">{section.headline}</h1>
    {section.subheadline && <p class="mt-6 max-w-2xl text-[17px] leading-relaxed sm:text-xl" style="color: var(--ink-soft);">{section.subheadline}</p>}
    <div class="mt-10 flex flex-wrap items-center gap-3">
      {section.ctaLabel && <a href={section.ctaHref} class="rounded-xl px-8 py-4 font-semibold shadow-lg transition hover:opacity-90 hover:shadow-xl" style="background-color: var(--brand); color: var(--on-brand);">{section.ctaLabel}</a>}
      {ctx.hasServices && <a href={ctx.servicesHref} class="rounded-xl border border-gray-200 bg-white/80 px-8 py-4 font-semibold backdrop-blur transition hover:bg-white" style="color: var(--ink-soft);">Hizmetlerimiz</a>}
    </div>
  </div>
</section>
`;
  }
  if (variant === "photoSplit") {
    return `${HERO_FRONT}
<section id="hero" class="relative overflow-hidden">${HERO_BG}
  <div class="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 text-center sm:py-28 lg:grid-cols-2 lg:text-left">
    <div>
      <h1 class="text-4xl font-medium leading-[1.1] tracking-tight sm:text-5xl" style="color: var(--ink);">{section.headline}</h1>
      {section.subheadline && <p class="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed sm:text-xl lg:mx-0" style="color: var(--ink-soft);">{section.subheadline}</p>}${heroCtas(true)}
    </div>
    <div class="relative">
      <div class="absolute -inset-4 rounded-3xl opacity-60 blur-2xl" style="background: color-mix(in srgb, var(--brand) 18%, white);"></div>
      {section.imageUrl && <img src={section.imageUrl} alt="" class="relative aspect-[4/3] w-full rounded-3xl object-cover shadow-2xl ring-1 ring-gray-900/10" loading="eager" />}
    </div>
  </div>
</section>
`;
  }
  return `${HERO_FRONT}
<section id="hero" class="relative overflow-hidden">${HERO_BG}
  <div class="relative mx-auto max-w-5xl px-6 py-28 text-center sm:py-36">
    <h1 class="text-4xl font-medium leading-[1.08] tracking-tight sm:text-7xl" style="color: var(--ink);">{section.headline}</h1>
    <div class="mx-auto mt-8 h-px w-24" style="background: var(--brand);"></div>
    {section.subheadline && <p class="mx-auto mt-8 max-w-2xl text-[17px] leading-relaxed sm:text-xl" style="color: var(--ink-soft);">{section.subheadline}</p>}${heroCtas(false)}
  </div>
</section>
`;
}

const STATS_BAR_ASTRO = `---
const { section } = Astro.props;
const cols = ["", "sm:grid-cols-1", "sm:grid-cols-2", "sm:grid-cols-3", "sm:grid-cols-4"][Math.min(section.items.length, 4)];
---
{section.items.length > 0 && (
  <section class="mx-auto max-w-5xl px-6 py-12">
    <div class={"grid grid-cols-2 gap-6 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-900/5 " + cols}>
      {section.items.map((it) => (
        <div class="text-center">
          <div class="text-3xl font-semibold sm:text-4xl" style="color: var(--brand-ink);">{it.value}</div>
          <div class="mt-1 text-sm" style="color: var(--ink-soft);">{it.label}</div>
        </div>
      ))}
    </div>
  </section>
)}
`;

function servicesAstro(variant: "cards" | "list"): string {
  if (variant === "list") {
    return `---
import SectionHeading from "./SectionHeading.astro";
const { section } = Astro.props;
---
<section id="hizmetler" class="mx-auto max-w-4xl px-6 py-20 sm:py-24">
  <SectionHeading kicker="Neler yapıyoruz" title={section.title} />
  <div class="mt-12 divide-y divide-gray-900/5 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-900/5">
    {section.items.map((it, i) => (
      <div class="flex items-start gap-6 p-7 transition hover:bg-gray-50/70">
        <div class="text-2xl font-light tabular-nums" style="color: var(--brand-ink);">{String(i + 1).padStart(2, "0")}</div>
        <div>
          <h3 class="text-lg font-semibold" style="color: var(--ink);">{it.name}</h3>
          {it.description && <p class="mt-1.5 text-[15px] leading-relaxed" style="color: var(--ink-soft);">{it.description}</p>}
        </div>
      </div>
    ))}
  </div>
</section>
`;
  }
  return `---
import SectionHeading from "./SectionHeading.astro";
const { section } = Astro.props;
---
<section id="hizmetler" class="mx-auto max-w-6xl px-6 py-20 sm:py-24">
  <SectionHeading kicker="Neler yapıyoruz" title={section.title} />
  <div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {section.items.map((it) => (
      <div class="group rounded-2xl bg-white p-7 shadow-sm ring-1 ring-gray-900/5 transition hover:-translate-y-1 hover:shadow-xl">
        <div class="h-px w-8 transition-all group-hover:w-12" style="background: var(--brand);"></div>
        <h3 class="mt-5 text-lg font-semibold" style="color: var(--ink);">{it.name}</h3>
        {it.description && <p class="mt-2 text-[15px] leading-relaxed" style="color: var(--ink-soft);">{it.description}</p>}
      </div>
    ))}
  </div>
</section>
`;
}

const PROCESS_ASTRO = `---
import SectionHeading from "./SectionHeading.astro";
const { section } = Astro.props;
const cols = ["", "sm:grid-cols-1", "sm:grid-cols-2", "sm:grid-cols-3", "sm:grid-cols-4"][Math.min(section.steps.length, 4)];
---
{section.steps.length > 0 && (
  <section id="surec" class="px-6 py-20 sm:py-24" style="background: color-mix(in srgb, var(--brand) 5%, var(--surface));">
    <div class="mx-auto max-w-5xl">
      <SectionHeading kicker="Süreç" title={section.title} />
      <div class={"mt-12 grid gap-8 " + cols}>
        {section.steps.map((p, i) => (
          <div class="relative">
            <div class="text-4xl font-light" style="color: var(--brand-ink);">{String(i + 1).padStart(2, "0")}</div>
            <h3 class="mt-3 text-lg font-semibold" style="color: var(--ink);">{p.title}</h3>
            {p.description && <p class="mt-2 text-[15px] leading-relaxed" style="color: var(--ink-soft);">{p.description}</p>}
          </div>
        ))}
      </div>
    </div>
  </section>
)}
`;

function aboutAstro(variant: "split" | "centered"): string {
  if (variant === "split") {
    return `---
const { section } = Astro.props;
---
<section id="hakkimizda" class="px-6 py-24 sm:py-32" style="background: color-mix(in srgb, var(--brand) 5%, var(--surface));">
  <div class="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
    {section.imageUrl && <img src={section.imageUrl} alt="" class="aspect-[4/3] w-full rounded-3xl object-cover shadow-xl ring-1 ring-gray-900/10" loading="lazy" />}
    <div>
      <div class="text-xs font-semibold uppercase tracking-[0.2em]" style="color: var(--brand-ink);">Bizi tanıyın</div>
      <h2 class="mt-2 text-3xl font-semibold leading-[1.15] tracking-tight sm:text-4xl" style="color: var(--ink);">{section.title}</h2>
      {section.body && <p class="mt-6 whitespace-pre-line text-[17px] leading-8" style="color: var(--ink-soft);">{section.body}</p>}
    </div>
  </div>
</section>
`;
  }
  return `---
import SectionHeading from "./SectionHeading.astro";
const { section } = Astro.props;
---
<section id="hakkimizda" class="px-6 py-24 sm:py-32" style="background: color-mix(in srgb, var(--brand) 5%, var(--surface));">
  <div class="mx-auto max-w-3xl text-center">
    <SectionHeading kicker="Bizi tanıyın" title={section.title} />
    {section.body && <p class="mt-8 whitespace-pre-line text-[17px] leading-8" style="color: var(--ink-soft);">{section.body}</p>}
  </div>
</section>
`;
}

const WHY_US_ASTRO = `---
import SectionHeading from "./SectionHeading.astro";
const { section } = Astro.props;
---
<section id="neden-biz" class="mx-auto max-w-6xl px-6 py-20 sm:py-24">
  <SectionHeading kicker="Farkımız" title={section.title} />
  <div class="mt-12 grid gap-10 sm:grid-cols-3">
    {section.points.map((p, i) => (
      <div class="text-center sm:text-left">
        <div class="text-4xl font-light" style="color: var(--brand-ink);">{String(i + 1).padStart(2, "0")}</div>
        <h3 class="mt-3 text-lg font-semibold" style="color: var(--ink);">{p.title}</h3>
        {p.description && <p class="mt-2 text-[15px] leading-relaxed" style="color: var(--ink-soft);">{p.description}</p>}
      </div>
    ))}
  </div>
</section>
`;

const TESTIMONIALS_ASTRO = `---
import SectionHeading from "./SectionHeading.astro";
const { section } = Astro.props;
---
<section id="yorumlar" class="px-6 py-24 sm:py-32" style="background: color-mix(in srgb, var(--brand) 5%, var(--surface));">
  <div class="mx-auto max-w-6xl">
    <SectionHeading kicker="Referanslar" title={section.title} />
    <div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {section.items.map((t) => (
        <figure class="flex flex-col rounded-2xl bg-white p-7 shadow-sm ring-1 ring-gray-900/5">
          <div class="text-5xl leading-none" style="color: var(--brand);">“</div>
          <blockquote class="mt-2 flex-1 leading-relaxed" style="color: var(--ink-soft);">{t.quote}</blockquote>
          {t.author && (
            <figcaption class="mt-5 flex items-center gap-3">
              <span class="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold" style="background-color: var(--brand); color: var(--on-brand);">{t.author.trim().charAt(0).toUpperCase()}</span>
              <span class="text-sm font-medium" style="color: var(--ink-soft);">{t.author}</span>
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  </div>
</section>
`;

const CTA_BANNER_ASTRO = `---
const { section } = Astro.props;
---
<section class="mx-auto max-w-6xl px-6 py-12">
  <div class="relative overflow-hidden rounded-3xl px-8 py-14 text-center" style="background: var(--brand);">
    <div class="absolute inset-0 opacity-20" style="background-image: radial-gradient(white 1px, transparent 1px); background-size: 20px 20px;"></div>
    <h2 class="relative text-2xl font-semibold tracking-tight sm:text-3xl" style="color: var(--on-brand);">{section.headline}</h2>
    <a href={section.ctaHref} class="relative mt-6 inline-block rounded-xl bg-white px-8 py-3.5 font-semibold transition hover:opacity-90" style="color: var(--brand-ink);">{section.ctaLabel}</a>
  </div>
</section>
`;

const FAQ_ASTRO = `---
import SectionHeading from "./SectionHeading.astro";
const { section } = Astro.props;
---
<section id="sss" class="mx-auto max-w-3xl px-6 py-20 sm:py-24">
  <SectionHeading kicker="Merak edilenler" title={section.title} />
  <div class="mt-10 space-y-3">
    {section.items.map((it) => (
      <details class="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-900/5 transition open:shadow-md">
        <summary class="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold" style="color: var(--ink);">{it.question}<span class="text-xl transition group-open:rotate-45" style="color: var(--brand-ink);">+</span></summary>
        {it.answer && <p class="mt-3 text-[15px] leading-relaxed" style="color: var(--ink-soft);">{it.answer}</p>}
      </details>
    ))}
  </div>
</section>
`;

const CONTACT_ASTRO = `---
import Icon from "./Icon.astro";
import SectionHeading from "./SectionHeading.astro";
const { section } = Astro.props;
const rows = [
  section.phone && { icon: "phone", label: section.phone },
  section.whatsapp && { icon: "chat", label: "WhatsApp: " + section.whatsapp },
  section.email && { icon: "mail", label: section.email },
  section.address && { icon: "pin", label: section.address },
  section.hours && { icon: "clock", label: section.hours },
].filter(Boolean);
const mapSrc = section.showMap && section.address
  ? "https://www.google.com/maps?q=" + encodeURIComponent(section.address) + "&output=embed"
  : "";
---
<section id="iletisim" class="mx-auto max-w-6xl px-6 py-20 sm:py-24">
  <SectionHeading kicker="Bize ulaşın" title={section.title} />
  <div class="mt-12 grid items-start gap-10 md:grid-cols-2">
    <div>
      <div class="space-y-5">
        {rows.length === 0 && <p style="color: var(--ink-mut);">İletişim bilgilerimiz çok yakında burada olacak — şimdilik formdan yazabilirsiniz.</p>}
        {rows.map((r) => (
          <div class="flex items-center gap-4">
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style="background: color-mix(in srgb, var(--brand) 12%, var(--surface));"><Icon name={r.icon} /></span>
            <span style="color: var(--ink-soft);">{r.label}</span>
          </div>
        ))}
      </div>
      {mapSrc && <iframe title="Harita" src={mapSrc} class="mt-6 h-64 w-full rounded-2xl ring-1 ring-gray-900/10" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>}
    </div>
    {section.showForm && (
      <form class="space-y-4 rounded-2xl bg-white p-7 shadow-sm ring-1 ring-gray-900/5">
        <input placeholder="Adınız" class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2" style="--tw-ring-color: var(--brand);" />
        <input placeholder="E-posta / Telefon" class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2" style="--tw-ring-color: var(--brand);" />
        <textarea placeholder="Mesajınız" rows="4" class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2" style="--tw-ring-color: var(--brand);"></textarea>
        <button type="button" class="w-full rounded-xl px-5 py-3.5 font-semibold transition hover:opacity-90" style="background-color: var(--brand); color: var(--on-brand);">Gönder</button>
      </form>
    )}
  </div>
</section>
`;

const HEADER_ASTRO = `---
import site from "../data/site.json";
import Monogram from "./Monogram.astro";
const { activeFile } = Astro.props;
const ctx = site._ctx;
const name = site.meta.businessName || "Site";
---
<header class="sticky top-0 z-10 border-b border-gray-900/5 bg-white/80 backdrop-blur-md">
  <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
    <a href={ctx.multiPage ? "index.html" : "#"} class="flex items-center gap-2.5">
      <Monogram />
      <span class="text-lg font-semibold tracking-tight" style="color: var(--ink);">{name}</span>
    </a>
    <nav class="hidden items-center gap-7 sm:flex">
      {ctx.navItems.map((n) => (
        <a href={n.href} class="text-sm font-medium transition hover:opacity-70" style={"color: " + (ctx.multiPage && n.href === activeFile + ".html" ? "var(--brand-ink)" : "var(--ink-soft)")}>{n.label}</a>
      ))}
    </nav>
    <a href={ctx.contactHref} class="rounded-xl px-4 py-2 text-sm font-semibold transition hover:opacity-90" style="background-color: var(--brand); color: var(--on-brand);">İletişim</a>
  </div>
</header>
`;

const FOOTER_ASTRO = `---
import site from "../data/site.json";
import Icon from "./Icon.astro";
import Monogram from "./Monogram.astro";
const name = site.meta.businessName || "Site";
const contact = site.pages.flatMap((p) => p.sections).find((s) => s.type === "contact");
const socials = [
  site.social.instagram && { icon: "instagram", href: "https://instagram.com/" + site.social.instagram.replace(/^@/, ""), label: "Instagram" },
  site.social.facebook && { icon: "facebook", href: "https://facebook.com/" + site.social.facebook.replace(/^@/, ""), label: "Facebook" },
].filter(Boolean);
---
<footer class="border-t border-gray-900/5 px-6 pt-10">
  <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 pb-8 sm:flex-row">
    <span class="flex items-center gap-2.5">
      <Monogram />
      <span class="font-semibold" style="color: var(--ink);">{name}</span>
    </span>
    <div class="flex flex-wrap items-center justify-center gap-4 text-sm" style="color: var(--ink-soft);">
      {contact && contact.phone && <span>{contact.phone}</span>}
      {contact && contact.phone && contact.email && <span aria-hidden="true">·</span>}
      {contact && contact.email && <span>{contact.email}</span>}
      {socials.map((s) => (
        <a href={s.href} aria-label={s.label} class="transition hover:opacity-70"><Icon name={s.icon} stroke="var(--ink-soft)" /></a>
      ))}
    </div>
  </div>
  <div class="border-t border-gray-900/5 py-6 text-center text-sm text-gray-500">
    © {name} · <a href="kvkk.html" class="underline-offset-2 hover:underline">KVKK Aydınlatma Metni</a> · <a href="https://kareya.app" class="font-medium transition hover:opacity-80" style="color: var(--brand-ink);">kareya</a> ile hazırlandı
  </div>
</footer>
`;

const BASE_LAYOUT_ASTRO = `---
import "../styles/global.css";
import site from "../data/site.json";
import Footer from "../components/Footer.astro";
import Header from "../components/Header.astro";
import Icon from "../components/Icon.astro";
const { title, activeFile, page } = Astro.props;
const ctx = site._ctx;
const faq = page ? page.sections.find((s) => s.type === "faq") : null;
const faqData = faq && faq.items.length
  ? {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.items.map((it) => ({ "@type": "Question", name: it.question, acceptedAnswer: { "@type": "Answer", text: it.answer } })),
    }
  : null;
const waHref = site.whatsapp.number ? "https://wa.me/" + site.whatsapp.number.replace(/\\D/g, "") : ctx.contactHref;
---
<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={site.meta.description} />
    <meta name="theme-color" content={site.brand.primary} />
    <link rel="icon" href={ctx.faviconHref} />
    {faqData && <script type="application/ld+json" set:html={JSON.stringify(faqData)} />}
  </head>
  <body class="antialiased" data-density={site.design.density} data-radius={site.design.radius} style={"--brand: " + site.brand.primary + "; --on-brand: " + ctx.onBrand + "; --brand-ink: " + ctx.brandInk + "; background: var(--surface); color: var(--ink-soft);"}>
    <Header activeFile={activeFile} />
    <main><slot /></main>
    <Footer />
    {site.whatsapp.enabled && (
      <a href={waHref} aria-label="WhatsApp ile yazın" class="fixed bottom-5 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105"><Icon name="chat" cls="h-7 w-7" stroke="currentColor" /></a>
    )}
  </body>
</html>
`;

function pageAstro(page: SitePage, file: string): string {
  return `---
import Base from "../layouts/Base.astro";
import site from "../data/site.json";
import About from "../components/About.astro";
import Contact from "../components/Contact.astro";
import CtaBanner from "../components/CtaBanner.astro";
import Faq from "../components/Faq.astro";
import Hero from "../components/Hero.astro";
import Process from "../components/Process.astro";
import Services from "../components/Services.astro";
import StatsBar from "../components/StatsBar.astro";
import Testimonials from "../components/Testimonials.astro";
import WhyUs from "../components/WhyUs.astro";
const page = site.pages.find((p) => p.path === ${JSON.stringify(page.path)}) ?? site.pages[0];
const name = site.meta.businessName || "Site";
const title = ${file === "index" ? "site.meta.title || name" : 'page.title + " — " + name'};
const MAP = { hero: Hero, statsBar: StatsBar, services: Services, process: Process, about: About, whyUs: WhyUs, testimonials: Testimonials, ctaBanner: CtaBanner, faq: Faq, contact: Contact };
---
<Base title={title} activeFile=${JSON.stringify(file)} page={page}>
  {page.sections.map((s) => {
    const C = MAP[s.type];
    return C ? <C section={s} /> : null;
  })}
</Base>
`;
}

const KVKK_ASTRO = `---
import Base from "../layouts/Base.astro";
import site from "../data/site.json";
const name = site.meta.businessName || "Site";
---
<Base title={"KVKK Aydınlatma Metni — " + name} activeFile="kvkk">
  <div class="mx-auto max-w-3xl px-6 py-16">
    <h1 class="text-3xl font-semibold tracking-tight" style="color: var(--ink);">KVKK Aydınlatma Metni</h1>
    <div class="mt-6 space-y-4 text-[15px] leading-relaxed">
      <p><strong>{name}</strong> ("Veri Sorumlusu") olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca kişisel verilerinizin güvenliğine önem veriyoruz.</p>
      <p>Bu web sitesi üzerinden iletişim formu aracılığıyla paylaştığınız ad, e-posta ve telefon bilgileri; yalnızca talebinize dönüş yapmak amacıyla işlenir, üçüncü kişilerle paylaşılmaz ve talebiniz sonuçlandıktan sonra makul süre içinde silinir.</p>
      <p>KVKK'nın 11. maddesi kapsamında; kişisel verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini veya silinmesini talep etme haklarına sahipsiniz. Talepleriniz için sitedeki iletişim kanallarından bize ulaşabilirsiniz.</p>
      <p>Bu metin bilgilendirme amaçlıdır ve işletmenin faaliyetlerine göre güncellenebilir.</p>
    </div>
  </div>
</Base>
`;

// ---- Variant resolution (KAR-60) ----
// "auto" resolves against the data at generation time; the resolved variant is
// baked into the component source so each file is one coherent rewrite target
// for the Design Pass.

function resolveHeroVariant(site: Site): "statement" | "photoSplit" | "minimal" {
  const v = site.design.heroVariant;
  const hasImage = site.pages.some((p) =>
    p.sections.some((s) => s.type === "hero" && s.imageUrl),
  );
  if (v === "minimal") return "minimal";
  if (v === "photoSplit" && hasImage) return "photoSplit";
  if (v === "statement") return "statement";
  return hasImage ? "photoSplit" : "statement"; // auto (or photoSplit without a photo)
}

function resolveAboutVariant(site: Site): "split" | "centered" {
  const v = site.design.aboutVariant;
  const hasImage = site.pages.some((p) =>
    p.sections.some((s) => s.type === "about" && s.imageUrl),
  );
  if (v === "centered") return "centered";
  if (v === "split" && hasImage) return "split";
  return hasImage ? "split" : "centered"; // auto (or split without a photo)
}

/** Generate the full Astro project as a { path: content } file map. */
export function generateAstroProject(site: Site): Record<string, string> {
  const name = site.meta.businessName || "Site";
  const pages = site.pages.length ? site.pages : [];
  const multiPage = pages.length > 1;
  const pageFiles = pages.map((p) => ({ page: p, file: pageFileName(p.path) }));
  const hasServicesAnywhere = pages.some((p) => p.sections.some((s) => s.type === "services"));
  const servicesPage = pageFiles.find((p) => p.page.sections.some((s) => s.type === "services"));
  const contactPage = pageFiles.find((p) => p.page.sections.some((s) => s.type === "contact"));

  // Nav: page links in multi-page mode, section anchors in one-page mode.
  const navItems = multiPage
    ? pageFiles
        .filter((p) => p.file !== "index" && p.file !== contactPage?.file)
        .map((p) => ({ href: `${p.file}.html`, label: p.page.title }))
    : [
        { href: "#hizmetler", label: "Hizmetler", when: "services" },
        { href: "#hakkimizda", label: "Hakkımızda", when: "about" },
        { href: "#sss", label: "SSS", when: "faq" },
      ]
        .filter((n) => pages[0]?.sections.some((s) => s.type === n.when))
        .map(({ href, label }) => ({ href, label }));

  const initial = monogramInitials(name).charAt(0);
  const faviconSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='${site.brand.primary}'/><text x='16' y='22' font-size='16' font-weight='700' fill='white' text-anchor='middle' font-family='sans-serif'>${initial}</text></svg>`;

  // Derived context: everything presentation needs that isn't raw content.
  // Computed HERE (deterministically) so components stay plain readers.
  const ctx = {
    multiPage,
    hasServices: hasServicesAnywhere,
    servicesHref: multiPage ? `${servicesPage?.file ?? "index"}.html` : "#hizmetler",
    contactHref: multiPage ? `${contactPage?.file ?? "index"}.html` : "#iletisim",
    navItems,
    initials: monogramInitials(name),
    onBrand: onBrand(site.brand.primary),
    brandInk: brandInk(site.brand.primary),
    faviconHref: `data:image/svg+xml,${encodeURIComponent(faviconSvg)}`,
  };

  const files: Record<string, string> = {
    "package.json": JSON.stringify(
      {
        name: "kareya-site",
        private: true,
        type: "module",
        scripts: { dev: "astro dev", build: "astro build", preview: "astro preview" },
        dependencies: {
          astro: "^5.6.0",
          "@tailwindcss/vite": "^4.1.0",
          tailwindcss: "^4.1.0",
          "@fontsource-variable/inter": "^5.2.0",
          "@fontsource-variable/sora": "^5.2.0",
        },
      },
      null,
      2,
    ),
    "astro.config.mjs": `import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Sibling .html files (hakkimizda.html): works on R2 (no index-document
  // resolution) and at a customer's own domain with zero server config.
  build: { format: "file" },
  vite: { plugins: [tailwindcss()] },
});
`,
    "src/styles/global.css": `@import "tailwindcss";
@import "@fontsource-variable/inter";
@import "@fontsource-variable/sora";

:root {
  --ink: #1c1d21;
  --ink-soft: #4b4e57;
  --ink-mut: #8a8d96;
  --surface: #fafafb;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: "Inter Variable", ui-sans-serif, system-ui, sans-serif;
}

h1,
h2,
h3 {
  font-family: "Sora Variable", "Inter Variable", ui-sans-serif, system-ui, sans-serif;
}

::selection {
  background: color-mix(in srgb, var(--brand) 30%, white);
  color: var(--ink);
}

/* Art Direction tokens (KAR-60): density + radius, driven by body attributes. */
[data-density="compact"] .py-20 { padding-block: 3.5rem; }
[data-density="compact"] .py-24 { padding-block: 4rem; }
[data-density="compact"] .py-28 { padding-block: 4.5rem; }
[data-density="compact"] .sm\\:py-24 { padding-block: 4rem; }
[data-density="compact"] .sm\\:py-28 { padding-block: 4.5rem; }
[data-density="compact"] .sm\\:py-32 { padding-block: 5rem; }
[data-density="compact"] .sm\\:py-36 { padding-block: 5.5rem; }
[data-radius="sharp"] .rounded-xl { border-radius: 0.375rem; }
[data-radius="sharp"] .rounded-2xl { border-radius: 0.5rem; }
[data-radius="sharp"] .rounded-3xl { border-radius: 0.625rem; }
[data-radius="round"] .rounded-xl { border-radius: 1rem; }
[data-radius="round"] .rounded-2xl { border-radius: 1.5rem; }
[data-radius="round"] .rounded-3xl { border-radius: 2rem; }
${customCssBlock(site.design)}`,
    "src/data/site.json": JSON.stringify({ ...site, _ctx: ctx }, null, 2),
    "src/layouts/Base.astro": BASE_LAYOUT_ASTRO,
    "src/components/Icon.astro": ICON_ASTRO,
    "src/components/Monogram.astro": MONOGRAM_ASTRO,
    "src/components/SectionHeading.astro": SECTION_HEADING_ASTRO,
    "src/components/Header.astro": HEADER_ASTRO,
    "src/components/Footer.astro": FOOTER_ASTRO,
    "src/components/Hero.astro": heroAstro(resolveHeroVariant(site)),
    "src/components/StatsBar.astro": STATS_BAR_ASTRO,
    "src/components/Services.astro": servicesAstro(site.design.servicesVariant),
    "src/components/Process.astro": PROCESS_ASTRO,
    "src/components/About.astro": aboutAstro(resolveAboutVariant(site)),
    "src/components/WhyUs.astro": WHY_US_ASTRO,
    "src/components/Testimonials.astro": TESTIMONIALS_ASTRO,
    "src/components/CtaBanner.astro": CTA_BANNER_ASTRO,
    "src/components/Faq.astro": FAQ_ASTRO,
    "src/components/Contact.astro": CONTACT_ASTRO,
    "src/pages/kvkk.astro": KVKK_ASTRO,
    "README.md": `# ${name}\n\nBu site **kareya** ile üretildi. Gerçek bir Astro projesidir — kaynak kod sizindir.\n\n- İçerik: \`src/data/site.json\`\n- Sunum: \`src/components/*.astro\`\n\n\`\`\`bash\nnpm install\nnpm run build   # dist/ altında statik çıktı\nnpm run dev     # yerel önizleme\n\`\`\`\n`,
    ".gitignore": `node_modules/\ndist/\n.astro/\n`,
  };
  for (const { page, file } of pageFiles) {
    files[`src/pages/${file}.astro`] = pageAstro(page, file);
  }
  return files;
}
