import type { Site, SiteSection } from "@kareya/schemas";

// Site JSON → a real, self-contained Astro project (KAR-37; design system v3
// KAR-52). Design tokens: --brand (customer color) + --ink/--ink-soft/--ink-mut
// (gray-black neutrals, never pure black — per the brief language) + --surface.
// Typography: Inter (body) + Sora (display, medium weight) self-hosted via
// @fontsource. Icons are inline SVG (no emoji). Deterministic output; builds to
// a static site with `astro build` — no per-site DB.

function esc(v: unknown): string {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const tint = (pct: number) =>
  `background: color-mix(in srgb, var(--brand) ${pct}%, var(--surface));`;

// Inline SVG icon set (lucide-style outlines) — brand-tinted, platform-stable.
const ICON_PATHS: Record<string, string> = {
  phone:
    '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
};

function icon(name: keyof typeof ICON_PATHS, cls = "h-5 w-5"): string {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name]}</svg>`;
}

/** Initials monogram — the brand anchor when the customer has no logo. */
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

function monogram(name: string): string {
  return `<span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white" style="background: var(--brand);">${esc(monogramInitials(name))}</span>`;
}

type Ctx = { hasServices: boolean };

function sectionHeading(kicker: string, title: string): string {
  return `
      <div class="text-center">
        <div class="text-xs font-semibold uppercase tracking-[0.2em]" style="color: var(--brand);">${esc(kicker)}</div>
        <h2 class="mt-2 text-3xl font-semibold leading-[1.15] tracking-tight sm:text-4xl" style="color: var(--ink);">${esc(title)}</h2>
      </div>`;
}

function renderSection(s: SiteSection, ctx: Ctx): string {
  switch (s.type) {
    case "hero": {
      const ctas = (aligned: boolean) => `
        <div class="mt-10 flex flex-wrap items-center ${aligned ? "justify-center lg:justify-start" : "justify-center"} gap-3">
          ${s.ctaLabel ? `<a href="${esc(s.ctaHref)}" class="rounded-xl px-8 py-4 font-semibold text-white shadow-lg transition hover:opacity-90 hover:shadow-xl" style="background-color: var(--brand); box-shadow: 0 10px 25px -5px color-mix(in srgb, var(--brand) 40%, transparent);">${esc(s.ctaLabel)}</a>` : ""}
          ${ctx.hasServices ? `<a href="#hizmetler" class="rounded-xl border border-gray-200 bg-white/80 px-8 py-4 font-semibold backdrop-blur transition hover:bg-white" style="color: var(--ink-soft);">Hizmetlerimiz</a>` : ""}
        </div>`;
      const bg = `
      <div class="absolute inset-0" style="${tint(7)}"></div>
      <div class="absolute inset-0 hidden opacity-40 sm:block" style="background-image: radial-gradient(color-mix(in srgb, var(--brand) 22%, white) 1px, transparent 1px); background-size: 22px 22px;"></div>
      <div class="absolute -right-32 -top-32 h-96 w-96 rounded-full blur-3xl" style="background: color-mix(in srgb, var(--brand) 16%, white);"></div>`;
      if (s.imageUrl) {
        // Split hero: copy left, editorial photo right (mobile: centered stack).
        return `
    <section class="relative overflow-hidden">
      ${bg}
      <div class="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 text-center sm:py-28 lg:grid-cols-2 lg:text-left">
        <div>
          <h1 class="text-4xl font-medium leading-[1.1] tracking-tight sm:text-5xl" style="color: var(--ink);">${esc(s.headline)}</h1>
          ${s.subheadline ? `<p class="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed sm:text-xl lg:mx-0" style="color: var(--ink-soft);">${esc(s.subheadline)}</p>` : ""}
          ${ctas(true)}
        </div>
        <div class="relative">
          <div class="absolute -inset-4 rounded-3xl opacity-60 blur-2xl" style="background: color-mix(in srgb, var(--brand) 18%, white);"></div>
          <img src="${esc(s.imageUrl)}" alt="" class="relative aspect-[4/3] w-full rounded-3xl object-cover shadow-2xl ring-1 ring-gray-900/10" loading="eager" />
        </div>
      </div>
    </section>`;
      }
      // Statement hero: typography is the composition; a thin brand line signs it.
      return `
    <section class="relative overflow-hidden">
      ${bg}
      <div class="relative mx-auto max-w-5xl px-6 py-28 text-center sm:py-36">
        <h1 class="text-4xl font-medium leading-[1.08] tracking-tight sm:text-7xl" style="color: var(--ink);">${esc(s.headline)}</h1>
        <div class="mx-auto mt-8 h-px w-24" style="background: var(--brand);"></div>
        ${s.subheadline ? `<p class="mx-auto mt-8 max-w-2xl text-[17px] leading-relaxed sm:text-xl" style="color: var(--ink-soft);">${esc(s.subheadline)}</p>` : ""}
        ${ctas(false)}
      </div>
    </section>`;
    }
    case "services":
      return `
    <section id="hizmetler" class="mx-auto max-w-6xl px-6 py-20 sm:py-24">
      ${sectionHeading("Neler yapıyoruz", s.title)}
      <div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        ${s.items
          .map(
            (it) => `<div class="group rounded-2xl bg-white p-7 shadow-sm ring-1 ring-gray-900/5 transition hover:-translate-y-1 hover:shadow-xl hover:ring-[color-mix(in_srgb,var(--brand)_25%,transparent)]">
          <div class="h-px w-8 transition-all group-hover:w-12" style="background: var(--brand);"></div>
          <h3 class="mt-5 text-lg font-semibold" style="color: var(--ink);">${esc(it.name)}</h3>
          ${it.description ? `<p class="mt-2 text-[15px] leading-relaxed" style="color: var(--ink-soft);">${esc(it.description)}</p>` : ""}
        </div>`,
          )
          .join("\n        ")}
      </div>
    </section>`;
    case "about": {
      if (s.imageUrl) {
        return `
    <section id="hakkimizda" class="px-6 py-24 sm:py-32" style="${tint(5)}">
      <div class="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <img src="${esc(s.imageUrl)}" alt="" class="aspect-[4/3] w-full rounded-3xl object-cover shadow-xl ring-1 ring-gray-900/10" loading="lazy" />
        <div>
          <div class="text-xs font-semibold uppercase tracking-[0.2em]" style="color: var(--brand);">Bizi tanıyın</div>
          <h2 class="mt-2 text-3xl font-semibold leading-[1.15] tracking-tight sm:text-4xl" style="color: var(--ink);">${esc(s.title)}</h2>
          ${s.body ? `<p class="mt-6 whitespace-pre-line text-[17px] leading-8" style="color: var(--ink-soft);">${esc(s.body)}</p>` : ""}
        </div>
      </div>
    </section>`;
      }
      return `
    <section id="hakkimizda" class="px-6 py-24 sm:py-32" style="${tint(5)}">
      <div class="mx-auto max-w-3xl text-center">
        ${sectionHeading("Bizi tanıyın", s.title)}
        ${s.body ? `<p class="mt-8 whitespace-pre-line text-[17px] leading-8" style="color: var(--ink-soft);">${esc(s.body)}</p>` : ""}
      </div>
    </section>`;
    }
    case "whyUs":
      return `
    <section id="neden-biz" class="mx-auto max-w-6xl px-6 py-20 sm:py-24">
      ${sectionHeading("Farkımız", s.title)}
      <div class="mt-12 grid gap-10 sm:grid-cols-3">
        ${s.points
          .map(
            (p, i) => `<div class="text-center sm:text-left">
          <div class="text-4xl font-light" style="color: var(--brand);">${String(i + 1).padStart(2, "0")}</div>
          <h3 class="mt-3 text-lg font-semibold" style="color: var(--ink);">${esc(p.title)}</h3>
          ${p.description ? `<p class="mt-2 text-[15px] leading-relaxed" style="color: var(--ink-soft);">${esc(p.description)}</p>` : ""}
        </div>`,
          )
          .join("\n        ")}
      </div>
    </section>`;
    case "testimonials":
      return `
    <section id="yorumlar" class="px-6 py-24 sm:py-32" style="${tint(5)}">
      <div class="mx-auto max-w-6xl">
        ${sectionHeading("Referanslar", s.title)}
        <div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          ${s.items
            .map(
              (t) => `<figure class="flex flex-col rounded-2xl bg-white p-7 shadow-sm ring-1 ring-gray-900/5">
            <div class="text-5xl leading-none" style="color: var(--brand);">&ldquo;</div>
            <blockquote class="mt-2 flex-1 leading-relaxed" style="color: var(--ink-soft);">${esc(t.quote)}</blockquote>
            ${
              t.author
                ? `<figcaption class="mt-5 flex items-center gap-3"><span class="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white" style="background-color: var(--brand);">${esc(t.author.trim().charAt(0).toUpperCase())}</span><span class="text-sm font-medium" style="color: var(--ink-soft);">${esc(t.author)}</span></figcaption>`
                : ""
            }
          </figure>`,
            )
            .join("\n          ")}
        </div>
      </div>
    </section>`;
    case "faq":
      return `
    <section id="sss" class="mx-auto max-w-3xl px-6 py-20 sm:py-24">
      ${sectionHeading("Merak edilenler", s.title)}
      <div class="mt-10 space-y-3">
        ${s.items
          .map(
            (it) => `<details class="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-900/5 transition open:shadow-md">
          <summary class="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold" style="color: var(--ink);">${esc(it.question)}<span class="text-xl transition group-open:rotate-45" style="color: var(--brand);">+</span></summary>
          ${it.answer ? `<p class="mt-3 text-[15px] leading-relaxed" style="color: var(--ink-soft);">${esc(it.answer)}</p>` : ""}
        </details>`,
          )
          .join("\n        ")}
      </div>
    </section>`;
    case "contact": {
      const row = (name: keyof typeof ICON_PATHS, label: string) =>
        `<div class="flex items-center gap-4"><span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style="${tint(12)}">${icon(name)}</span><span style="color: var(--ink-soft);">${esc(label)}</span></div>`;
      const rows = [
        s.phone && row("phone", s.phone),
        s.whatsapp && row("chat", `WhatsApp: ${s.whatsapp}`),
        s.email && row("mail", s.email),
        s.address && row("pin", s.address),
        s.hours && row("clock", s.hours),
      ]
        .filter(Boolean)
        .join("\n          ");
      const form = s.showForm
        ? `<form class="space-y-4 rounded-2xl bg-white p-7 shadow-sm ring-1 ring-gray-900/5">
          <input placeholder="Adınız" class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2" style="--tw-ring-color: var(--brand);" />
          <input placeholder="E-posta / Telefon" class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2" style="--tw-ring-color: var(--brand);" />
          <textarea placeholder="Mesajınız" rows="4" class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2" style="--tw-ring-color: var(--brand);"></textarea>
          <button type="button" class="w-full rounded-xl px-5 py-3.5 font-semibold text-white transition hover:opacity-90" style="background-color: var(--brand);">Gönder</button>
        </form>`
        : "";
      return `
    <section id="iletisim" class="mx-auto max-w-6xl px-6 py-20 sm:py-24">
      ${sectionHeading("Bize ulaşın", s.title)}
      <div class="mt-12 grid items-start gap-10 md:grid-cols-2">
        <div class="space-y-5">
          ${rows || `<p style="color: var(--ink-mut);">İletişim bilgilerimiz çok yakında burada olacak — şimdilik formdan yazabilirsiniz.</p>`}
        </div>
        ${form}
      </div>
    </section>`;
    }
    default:
      return "";
  }
}

const NAV_ITEMS: { id: string; label: string; types: SiteSection["type"][] }[] = [
  { id: "hizmetler", label: "Hizmetler", types: ["services"] },
  { id: "hakkimizda", label: "Hakkımızda", types: ["about"] },
  { id: "sss", label: "SSS", types: ["faq"] },
];

/** Generate the full Astro project as a { path: content } file map. */
export function generateAstroProject(site: Site): Record<string, string> {
  const page = site.pages[0];
  const name = site.meta.businessName || "Site";
  const sectionTypes = new Set((page?.sections ?? []).map((s) => s.type));
  const ctx: Ctx = { hasServices: sectionTypes.has("services") };
  const sections = (page?.sections ?? []).map((s) => renderSection(s, ctx)).join("\n");

  const nav = NAV_ITEMS.filter((n) => n.types.some((t) => sectionTypes.has(t)))
    .map(
      (n) =>
        `<a href="#${n.id}" class="text-sm font-medium transition hover:opacity-70" style="color: var(--ink-soft);">${n.label}</a>`,
    )
    .join("\n          ");

  const header = `
    <header class="sticky top-0 z-10 border-b border-gray-900/5 bg-white/80 backdrop-blur-md">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span class="flex items-center gap-2.5">
          ${monogram(name)}
          <span class="text-lg font-semibold tracking-tight" style="color: var(--ink);">${esc(name)}</span>
        </span>
        <nav class="hidden items-center gap-7 sm:flex">
          ${nav}
        </nav>
        <a href="#iletisim" class="rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90" style="background-color: var(--brand);">İletişim</a>
      </div>
    </header>`;

  // Two-tier footer: a trust/contact layer + the credit bar (AA contrast).
  const contact = (page?.sections ?? []).find((x) => x.type === "contact");
  const footerContact =
    contact && contact.type === "contact"
      ? [
          contact.phone && `<span>${esc(contact.phone)}</span>`,
          contact.email && `<span>${esc(contact.email)}</span>`,
          contact.whatsapp && `<span>WhatsApp: ${esc(contact.whatsapp)}</span>`,
        ]
          .filter(Boolean)
          .join('<span aria-hidden="true">·</span>')
      : "";
  const footer = `
    <footer class="border-t border-gray-900/5 px-6 pt-10">
      <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 pb-8 sm:flex-row">
        <span class="flex items-center gap-2.5">
          ${monogram(name)}
          <span class="font-semibold" style="color: var(--ink);">${esc(name)}</span>
        </span>
        ${footerContact ? `<div class="flex flex-wrap items-center justify-center gap-3 text-sm" style="color: var(--ink-soft);">${footerContact}</div>` : ""}
      </div>
      <div class="border-t border-gray-900/5 py-6 text-center text-sm text-gray-500">
        © ${esc(name)} · <a href="https://kareya.app" class="font-medium transition hover:opacity-80" style="color: var(--brand);">kareya</a> ile hazırlandı
      </div>
    </footer>`;

  const whatsappFloat = site.whatsapp.enabled
    ? `
    <a href="${site.whatsapp.number ? `https://wa.me/${site.whatsapp.number.replace(/\D/g, "")}` : "#iletisim"}" aria-label="WhatsApp ile yazın" class="fixed bottom-5 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105"><svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS.chat}</svg></a>`
    : "";

  // Per-site favicon: the monogram initial on a brand-colored rounded square.
  const initial = monogramInitials(name).charAt(0);
  const faviconSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='${site.brand.primary}'/><text x='16' y='22' font-size='16' font-weight='700' fill='white' text-anchor='middle' font-family='sans-serif'>${initial}</text></svg>`;
  const faviconHref = `data:image/svg+xml,${encodeURIComponent(faviconSvg)}`;

  const indexAstro = `---
import "../styles/global.css";
---
<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(site.meta.title || name)}</title>
    <meta name="description" content="${esc(site.meta.description)}" />
    <meta name="theme-color" content="${esc(site.brand.primary)}" />
    <link rel="icon" href="${faviconHref}" />
  </head>
  <body class="antialiased" style="--brand: ${esc(site.brand.primary)}; background: var(--surface); color: var(--ink-soft);">
${header}
    <main>
${sections}
    </main>
${footer}${whatsappFloat}
  </body>
</html>
`;

  return {
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
  vite: { plugins: [tailwindcss()] },
});
`,
    "src/styles/global.css": `@import "tailwindcss";
@import "@fontsource-variable/inter";
@import "@fontsource-variable/sora";

/* Design tokens (KAR-52 v3): gray-black neutrals — never pure black — plus a
   near-white surface, both slightly cool so the whole page reads as designed
   rather than as Tailwind defaults. */
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
`,
    "src/pages/index.astro": indexAstro,
    "README.md": `# ${name}\n\nBu site **kareya** ile üretildi (Site JSON → Astro). Statik site.\n\n\`\`\`bash\nnpm install\nnpm run build   # dist/ altında statik çıktı\nnpm run dev     # yerel önizleme\n\`\`\`\n`,
    ".gitignore": `node_modules/\ndist/\n.astro/\n`,
  };
}
