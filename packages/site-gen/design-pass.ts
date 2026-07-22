import type { Brief, Site } from "@kareya/schemas";

import type { LlmFn } from "./llm";

// Design Pass (KAR-62): Claude rewrites the kit's component .astro files into
// a layout composed FOR THIS BUSINESS — the "every project gets custom-written
// code" feature. The kit output (KAR-61) is the input and the fallback: the
// runner build-gates the rewritten files (astro build MUST pass + content
// probes MUST survive) and falls back to the kit on any failure, so a broken
// LLM output can never reach a customer. Content stays in src/data/site.json;
// hardcoding customer text into components is rejected by the content check
// only implicitly — the prompt forbids it and probes catch dropped content.

/** Files the Design Pass may rewrite. Everything else is infrastructure. */
export const DESIGN_PASS_REWRITABLE = [
  "src/components/Hero.astro",
  "src/components/StatsBar.astro",
  "src/components/Services.astro",
  "src/components/Process.astro",
  "src/components/About.astro",
  "src/components/WhyUs.astro",
  "src/components/Testimonials.astro",
  "src/components/CtaBanner.astro",
  "src/components/Faq.astro",
  "src/components/Contact.astro",
  "src/components/Header.astro",
  "src/components/Footer.astro",
  "src/components/SectionHeading.astro",
] as const;

/** Hosts a component may legitimately link to (everything else is rejected). */
const ALLOWED_URL_HOSTS =
  /^https?:\/\/((www\.)?(instagram|facebook|google)\.com|wa\.me|kareya\.app|schema\.org)([/?#]|$)/i;

function buildPrompt(
  site: Site,
  brief: Brief,
  files: Record<string, string>,
  feedback?: string,
): string {
  const componentSources = DESIGN_PASS_REWRITABLE.filter((p) => files[p])
    .map((p) => `--- ${p} ---\n${files[p]}`)
    .join("\n\n");
  return `Sen Kareya web ajansının kıdemli design engineer'ısın. Aşağıda bir müşteri sitesinin Astro component kaynak kodları var. Görevin: bu işletmenin KARAKTERİNE özel, kit'ten belirgin şekilde farklılaşan bir layout kompozisyonu için component'lerden EN ETKİLİ 3-6 tanesini YENİDEN YAZMAK.

MÜŞTERİ KARAKTERİ:
- İşletme: ${brief.business.name ?? "-"} (${brief.business.sector ?? "-"})
- Ton: ${brief.brand.tone ?? "kurumsal"} · Bölge: ${brief.business.region ?? "-"}
- Tasarım yönü (art direction): ${site.design.rationale || "-"}
- Görüşme notları: ${brief.notes ? brief.notes.slice(0, 600) : "-"}

TASARIM HEDEFİ:
- Kit'in simetrik/dengeli dilinin ÖTESİNE geç: asimetri, kesişen bloklar, cesur tipografi ölçekleri, kenarlık/numara ritimleri, farklı grid akışları — işletmenin karakterini KOMPOZİSYONLA anlat.
- Profesyonel kal: hizalama disiplini, tutarlı spacing ölçeği, mobile-first (sm:/lg: breakpoint'leri), erişilebilir kontrast.
- Az component'i derin değiştir; her sayfayı değil, karakteri en çok taşıyan yerleri (genelde Hero + 2-4 section) yeniden kompoze et.

SÖZLEŞME (İHLAL = REDDEDİLİR):
1. Section component'leri \`const { section } = Astro.props;\` sözleşmesini KORUR; içerik SADECE props/site.json'dan gelir. Müşteri metnini koda GÖMME (data tek doğruluk kaynağı).
2. Mevcut section id'leri korunur (#hero, #hizmetler, #hakkimizda, #neden-biz, #yorumlar, #sss, #surec, #iletisim).
3. Import'lar yalnızca mevcut dosyalardan: ../data/site.json, ./Icon.astro, ./Monogram.astro, ./SectionHeading.astro.
4. Stil: Tailwind utility'leri + inline style. Marka değişkenleri: var(--brand), var(--brand-ink), var(--on-brand), var(--ink), var(--ink-soft), var(--ink-mut), var(--surface). Beyaz metni yalnız var(--brand) zemin üzerinde ve var(--on-brand) ile kullan.
5. YASAK: <script> etiketi, dış URL/CDN/font (yalnız mevcut instagram/facebook/wa.me/google maps/kareya.app linkleri kalabilir), yeni dosya, mevcut olmayan görsel yolu, position:fixed (WhatsApp butonu hariç — o Base'de).
6. Astro sözdizimi: frontmatter '---' bloğu, JSX-benzeri template, {expr}, {cond && (...)}, {arr.map(...)}. class= kullan (className değil).

ÇIKTI PROTOKOLÜ — SADECE değiştirdiğin dosyalar, başka hiçbir metin yazma:
===FILE: src/components/X.astro===
<dosyanın TAM yeni içeriği>
===END===
${feedback ? `\nÖNCEKİ DENEMENİN HATASI (düzelt ve tekrar dene):\n${feedback.slice(0, 1500)}` : ""}

MEVCUT COMPONENT KAYNAKLARI:
${componentSources}`;
}

export type DesignPassResult = {
  /** Rewritten files (subset of DESIGN_PASS_REWRITABLE), validated. */
  files: Record<string, string>;
  rewritten: string[];
  error?: string;
  outputChars: number;
};

function validateFile(path: string, content: string): string | null {
  if (!(DESIGN_PASS_REWRITABLE as readonly string[]).includes(path)) {
    return `path not rewritable: ${path}`;
  }
  if (content.length > 20_000) return `${path}: file too large`;
  if (/<script/i.test(content)) return `${path}: <script> is forbidden`;
  for (const m of content.matchAll(/https?:\/\/[^\s"'<>)]+/gi)) {
    if (!ALLOWED_URL_HOSTS.test(m[0])) return `${path}: external URL not allowed (${m[0].slice(0, 60)})`;
  }
  if (!content.includes("Astro.props") && !content.includes("site.json") && path !== "src/components/SectionHeading.astro") {
    return `${path}: lost its data wiring (no Astro.props / site.json)`;
  }
  return null;
}

export function parseDesignPassOutput(raw: string): DesignPassResult {
  const files: Record<string, string> = {};
  const re = /===FILE:\s*(.+?)\s*===\n([\s\S]*?)\n===END===/g;
  for (const m of raw.matchAll(re)) {
    const path = m[1].trim();
    const content = m[2].replace(/^```(?:astro)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    const err = validateFile(path, content);
    if (err) return { files: {}, rewritten: [], error: err, outputChars: raw.length };
    files[path] = content.endsWith("\n") ? content : content + "\n";
  }
  const rewritten = Object.keys(files);
  if (!rewritten.length) {
    return { files: {}, rewritten: [], error: "no files in output", outputChars: raw.length };
  }
  if (rewritten.length > 8) {
    return { files: {}, rewritten: [], error: `too many files (${rewritten.length})`, outputChars: raw.length };
  }
  return { files, rewritten, outputChars: raw.length };
}

export async function designPass(
  site: Site,
  brief: Brief,
  kitFiles: Record<string, string>,
  llm: LlmFn,
  feedback?: string,
): Promise<DesignPassResult> {
  try {
    const raw = await llm(buildPrompt(site, brief, kitFiles, feedback));
    return parseDesignPassOutput(raw);
  } catch (err) {
    return {
      files: {},
      rewritten: [],
      error: err instanceof Error ? err.message : String(err),
      outputChars: 0,
    };
  }
}

// ---- Content gate ----
// Key customer facts must survive a rewrite. Probes are plain substrings
// (entity-safe: anything needing HTML escaping is skipped) checked against the
// built HTML of ALL pages concatenated.

export function contentProbes(site: Site): string[] {
  const probes: string[] = [];
  const push = (v: string | undefined | null) => {
    const s = (v ?? "").trim();
    if (s.length >= 4 && !/[&<>"']/.test(s) && probes.length < 8) probes.push(s);
  };
  push(site.meta.businessName);
  for (const page of site.pages) {
    for (const s of page.sections) {
      if (s.type === "hero") push(s.headline);
      if (s.type === "services") s.items.slice(0, 2).forEach((it) => push(it.name));
      if (s.type === "contact") {
        push(s.phone);
        push(s.email);
      }
    }
  }
  return probes;
}

export function missingProbes(builtHtml: string, probes: string[]): string[] {
  return probes.filter((p) => !builtHtml.includes(p));
}
