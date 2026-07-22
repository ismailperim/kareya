import type { Site, SiteSection } from "@kareya/schemas";

// Site JSON → a real, self-contained Astro project (KAR-37, ADR-0004). Content
// is baked into the markup (a developer can open index.astro and edit real
// code), styling is Tailwind, brand color flows via the --brand CSS var. The
// output builds to a static site with `astro build` — no per-site DB.

function esc(v: unknown): string {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const tint = (pct: number) =>
  `background: color-mix(in srgb, var(--brand) ${pct}%, white);`;

function sectionTitle(title: string): string {
  return `
      <div class="text-center">
        <div class="mx-auto mb-3 h-1 w-10 rounded-full" style="background-color: var(--brand);"></div>
        <h2 class="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">${esc(title)}</h2>
      </div>`;
}

function renderSection(s: SiteSection): string {
  switch (s.type) {
    case "hero":
      return `
    <section class="relative overflow-hidden" style="${tint(8)}">
      <div class="mx-auto max-w-4xl px-6 py-24 text-center sm:py-32">
        <h1 class="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">${esc(s.headline)}</h1>
        ${s.subheadline ? `<p class="mx-auto mt-5 max-w-2xl text-lg text-gray-600">${esc(s.subheadline)}</p>` : ""}
        ${s.ctaLabel ? `<a href="${esc(s.ctaHref)}" class="mt-8 inline-block rounded-xl px-7 py-3.5 font-medium text-white shadow-lg transition hover:opacity-90" style="background-color: var(--brand);">${esc(s.ctaLabel)}</a>` : ""}
      </div>
    </section>`;
    case "services":
      return `
    <section class="mx-auto max-w-5xl px-6 py-16">
      ${sectionTitle(s.title)}
      <div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        ${s.items
          .map(
            (it, i) => `<div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 transition hover:shadow-md">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl font-semibold text-white" style="background-color: var(--brand);">${i + 1}</div>
          <h3 class="mt-4 font-semibold text-gray-900">${esc(it.name)}</h3>
          ${it.description ? `<p class="mt-1.5 text-sm text-gray-600">${esc(it.description)}</p>` : ""}
        </div>`,
          )
          .join("\n        ")}
      </div>
    </section>`;
    case "about":
      return `
    <section class="px-6 py-16" style="${tint(5)}">
      <div class="mx-auto max-w-3xl text-center">
        ${sectionTitle(s.title)}
        ${s.body ? `<p class="mt-6 whitespace-pre-line text-lg leading-relaxed text-gray-700">${esc(s.body)}</p>` : ""}
      </div>
    </section>`;
    case "whyUs":
      return `
    <section class="mx-auto max-w-5xl px-6 py-16">
      ${sectionTitle(s.title)}
      <div class="mt-10 grid gap-8 sm:grid-cols-3">
        ${s.points
          .map(
            (p) => `<div>
          <div class="flex h-10 w-10 items-center justify-center rounded-full font-semibold text-white" style="background-color: var(--brand);">✓</div>
          <h3 class="mt-3 font-semibold text-gray-900">${esc(p.title)}</h3>
          ${p.description ? `<p class="mt-1 text-sm text-gray-600">${esc(p.description)}</p>` : ""}
        </div>`,
          )
          .join("\n        ")}
      </div>
    </section>`;
    case "testimonials":
      return `
    <section class="px-6 py-16" style="${tint(5)}">
      <div class="mx-auto max-w-5xl">
        ${sectionTitle(s.title)}
        <div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          ${s.items
            .map(
              (t) => `<figure class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <div class="text-4xl leading-none" style="color: var(--brand);">&ldquo;</div>
            <blockquote class="mt-1 text-gray-700">${esc(t.quote)}</blockquote>
            ${t.author ? `<figcaption class="mt-3 text-sm font-medium text-gray-500">— ${esc(t.author)}</figcaption>` : ""}
          </figure>`,
            )
            .join("\n          ")}
        </div>
      </div>
    </section>`;
    case "contact": {
      const row = (icon: string, label: string) =>
        `<div class="flex items-center gap-3"><span class="flex h-9 w-9 items-center justify-center rounded-lg" style="${tint(12)}">${icon}</span><span class="text-gray-700">${esc(label)}</span></div>`;
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
        ? `<form class="space-y-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <input placeholder="Adınız" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <input placeholder="E-posta / Telefon" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <textarea placeholder="Mesajınız" rows="3" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"></textarea>
          <button type="button" class="w-full rounded-lg px-4 py-2.5 font-medium text-white transition hover:opacity-90" style="background-color: var(--brand);">Gönder</button>
        </form>`
        : "";
      return `
    <section id="iletisim" class="mx-auto max-w-5xl px-6 py-16">
      ${sectionTitle(s.title)}
      <div class="mt-10 grid gap-8 md:grid-cols-2">
        <div class="space-y-3">
          ${rows}
        </div>
        ${form}
      </div>
    </section>`;
    }
    default:
      return "";
  }
}

/** Generate the full Astro project as a { path: content } file map. */
export type GenerateOptions = {
  /**
   * Public base path the site is served under (e.g. "/sites/<token>/").
   * Without it Astro emits root-relative asset URLs (/_astro/…), which break
   * when the site lives in a subdirectory (preview.kareya.app/sites/<token>/).
   */
  basePath?: string;
};

export function generateAstroProject(
  site: Site,
  options: GenerateOptions = {},
): Record<string, string> {
  const page = site.pages[0];
  const name = site.meta.businessName || "Site";
  const sections = (page?.sections ?? []).map(renderSection).join("\n");

  const header = `
    <header class="sticky top-0 z-10 border-b border-black/5 bg-white/85 backdrop-blur">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <span class="font-semibold" style="color: var(--brand);">${esc(name)}</span>
        <a href="#iletisim" class="rounded-lg px-3.5 py-1.5 text-sm font-medium text-white" style="background-color: var(--brand);">İletişim</a>
      </div>
    </header>`;
  const footer = `
    <footer class="border-t border-black/5 py-8 text-center text-sm text-gray-400">
      © ${esc(name)} · kareya ile hazırlandı
    </footer>`;

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
  <body class="bg-white text-gray-900" style="--brand: ${esc(site.brand.primary)};">
${header}
    <main>
${sections}
    </main>
${footer}
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
        },
      },
      null,
      2,
    ),
    "astro.config.mjs": `import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
${options.basePath ? `  base: ${JSON.stringify(options.basePath)},\n` : ""}  vite: { plugins: [tailwindcss()] },
});
`,
    "src/styles/global.css": `@import "tailwindcss";\n`,
    "src/pages/index.astro": indexAstro,
    "README.md": `# ${name}\n\nBu site **kareya** ile üretildi (Site JSON → Astro). Statik site.\n\n\`\`\`bash\nnpm install\nnpm run build   # dist/ altında statik çıktı\nnpm run dev     # yerel önizleme\n\`\`\`\n`,
    ".gitignore": `node_modules/\ndist/\n.astro/\n`,
  };
}
