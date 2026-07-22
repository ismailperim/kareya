import type { Site, SiteSection } from "@kareya/schemas";

// Site JSON → a real, self-contained Astro project (KAR-37; premium design pass
// KAR-52). Content is baked into readable markup, styling is Tailwind, brand
// color flows via the --brand CSS var. Typography: Inter (body) + Sora
// (display) self-hosted via @fontsource — bundled at build time, no CDN.
// Output builds to a static site with `astro build` — no per-site DB.

function esc(v: unknown): string {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const tint = (pct: number) =>
  `background: color-mix(in srgb, var(--brand) ${pct}%, white);`;

type Ctx = { hasServices: boolean };

function sectionHeading(kicker: string, title: string): string {
  return `
      <div class="text-center">
        <div class="text-xs font-semibold uppercase tracking-[0.2em]" style="color: var(--brand);">${esc(kicker)}</div>
        <h2 class="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">${esc(title)}</h2>
      </div>`;
}

function renderSection(s: SiteSection, ctx: Ctx): string {
  switch (s.type) {
    case "hero":
      return `
    <section class="relative overflow-hidden">
      <div class="absolute inset-0" style="${tint(7)}"></div>
      <div class="absolute inset-0 opacity-40" style="background-image: radial-gradient(color-mix(in srgb, var(--brand) 22%, white) 1px, transparent 1px); background-size: 22px 22px;"></div>
      <div class="absolute -right-32 -top-32 h-96 w-96 rounded-full blur-3xl" style="background: color-mix(in srgb, var(--brand) 16%, white);"></div>
      <div class="relative mx-auto max-w-4xl px-6 py-28 text-center sm:py-36">
        <h1 class="text-4xl font-bold leading-tight tracking-tight text-gray-900 sm:text-6xl">${esc(s.headline)}</h1>
        ${s.subheadline ? `<p class="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600 sm:text-xl">${esc(s.subheadline)}</p>` : ""}
        <div class="mt-10 flex flex-wrap items-center justify-center gap-3">
          ${s.ctaLabel ? `<a href="${esc(s.ctaHref)}" class="rounded-xl px-8 py-4 font-semibold text-white shadow-lg transition hover:opacity-90 hover:shadow-xl" style="background-color: var(--brand); box-shadow: 0 10px 25px -5px color-mix(in srgb, var(--brand) 40%, transparent);">${esc(s.ctaLabel)}</a>` : ""}
          ${ctx.hasServices ? `<a href="#hizmetler" class="rounded-xl border border-gray-200 bg-white/80 px-8 py-4 font-semibold text-gray-700 backdrop-blur transition hover:bg-white">Hizmetlerimiz</a>` : ""}
        </div>
      </div>
    </section>`;
    case "services":
      return `
    <section id="hizmetler" class="mx-auto max-w-6xl px-6 py-20 sm:py-24">
      ${sectionHeading("Neler yapıyoruz", s.title)}
      <div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        ${s.items
          .map(
            (it, i) => `<div class="group rounded-2xl bg-white p-7 shadow-sm ring-1 ring-gray-900/5 transition hover:-translate-y-1 hover:shadow-xl">
          <div class="flex h-11 w-11 items-center justify-center rounded-xl font-bold text-white transition group-hover:scale-105" style="background-color: var(--brand);">${String(i + 1).padStart(2, "0")}</div>
          <h3 class="mt-5 text-lg font-semibold text-gray-900">${esc(it.name)}</h3>
          ${it.description ? `<p class="mt-2 text-[15px] leading-relaxed text-gray-600">${esc(it.description)}</p>` : ""}
        </div>`,
          )
          .join("\n        ")}
      </div>
    </section>`;
    case "about":
      return `
    <section id="hakkimizda" class="px-6 py-20 sm:py-24" style="${tint(5)}">
      <div class="mx-auto max-w-3xl text-center">
        ${sectionHeading("Bizi tanıyın", s.title)}
        ${s.body ? `<p class="mt-8 whitespace-pre-line text-lg leading-8 text-gray-700">${esc(s.body)}</p>` : ""}
      </div>
    </section>`;
    case "whyUs":
      return `
    <section id="neden-biz" class="mx-auto max-w-6xl px-6 py-20 sm:py-24">
      ${sectionHeading("Farkımız", s.title)}
      <div class="mt-12 grid gap-10 sm:grid-cols-3">
        ${s.points
          .map(
            (p) => `<div class="text-center sm:text-left">
          <div class="mx-auto flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold text-white sm:mx-0" style="background-color: var(--brand);">✓</div>
          <h3 class="mt-4 text-lg font-semibold text-gray-900">${esc(p.title)}</h3>
          ${p.description ? `<p class="mt-2 text-[15px] leading-relaxed text-gray-600">${esc(p.description)}</p>` : ""}
        </div>`,
          )
          .join("\n        ")}
      </div>
    </section>`;
    case "testimonials":
      return `
    <section id="yorumlar" class="px-6 py-20 sm:py-24" style="${tint(5)}">
      <div class="mx-auto max-w-6xl">
        ${sectionHeading("Referanslar", s.title)}
        <div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          ${s.items
            .map(
              (t) => `<figure class="flex flex-col rounded-2xl bg-white p-7 shadow-sm ring-1 ring-gray-900/5">
            <div class="text-5xl leading-none" style="color: var(--brand);">&ldquo;</div>
            <blockquote class="mt-2 flex-1 leading-relaxed text-gray-700">${esc(t.quote)}</blockquote>
            ${
              t.author
                ? `<figcaption class="mt-5 flex items-center gap-3"><span class="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white" style="background-color: var(--brand);">${esc(t.author.trim().charAt(0).toUpperCase())}</span><span class="text-sm font-medium text-gray-600">${esc(t.author)}</span></figcaption>`
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
          <summary class="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-gray-900">${esc(it.question)}<span class="text-xl transition group-open:rotate-45" style="color: var(--brand);">+</span></summary>
          ${it.answer ? `<p class="mt-3 text-[15px] leading-relaxed text-gray-600">${esc(it.answer)}</p>` : ""}
        </details>`,
          )
          .join("\n        ")}
      </div>
    </section>`;
    case "contact": {
      const row = (icon: string, label: string) =>
        `<div class="flex items-center gap-4"><span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg" style="${tint(12)}">${icon}</span><span class="text-gray-700">${esc(label)}</span></div>`;
      const rows = [
        s.phone && row("📞", s.phone),
        s.whatsapp && row("💬", `WhatsApp: ${s.whatsapp}`),
        s.email && row("✉️", s.email),
        s.address && row("📍", s.address),
        s.hours && row("🕐", s.hours),
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
          ${rows || `<p class="text-gray-500">İletişim bilgilerimiz çok yakında burada olacak — şimdilik formdan yazabilirsiniz.</p>`}
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
        `<a href="#${n.id}" class="text-sm font-medium text-gray-600 transition hover:text-gray-900">${n.label}</a>`,
    )
    .join("\n          ");

  const header = `
    <header class="sticky top-0 z-10 border-b border-gray-900/5 bg-white/80 backdrop-blur-md">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span class="text-lg font-bold tracking-tight text-gray-900">${esc(name)}</span>
        <nav class="hidden items-center gap-7 sm:flex">
          ${nav}
        </nav>
        <a href="#iletisim" class="rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90" style="background-color: var(--brand);">İletişim</a>
      </div>
    </header>`;

  const footer = `
    <footer class="border-t border-gray-900/5 px-6 py-10">
      <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-sm text-gray-400 sm:flex-row">
        <span class="font-medium text-gray-500">${esc(name)}</span>
        <span>© ${esc(name)} · <span class="font-medium" style="color: var(--brand);">kareya</span> ile hazırlandı</span>
      </div>
    </footer>`;

  const whatsappFloat = site.whatsapp.enabled
    ? `
    <a href="${site.whatsapp.number ? `https://wa.me/${site.whatsapp.number.replace(/\D/g, "")}` : "#iletisim"}" aria-label="WhatsApp ile yazın" class="fixed bottom-5 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-2xl text-white shadow-lg transition hover:scale-105">💬</a>`
    : "";

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
  </head>
  <body class="bg-white text-gray-700 antialiased" style="--brand: ${esc(site.brand.primary)};">
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
`,
    "src/pages/index.astro": indexAstro,
    "README.md": `# ${name}\n\nBu site **kareya** ile üretildi (Site JSON → Astro). Statik site.\n\n\`\`\`bash\nnpm install\nnpm run build   # dist/ altında statik çıktı\nnpm run dev     # yerel önizleme\n\`\`\`\n`,
    ".gitignore": `node_modules/\ndist/\n.astro/\n`,
  };
}
