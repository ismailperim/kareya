import { designSchema, type Brief, type Site, type SiteDesign } from "@kareya/schemas";

import type { LlmFn } from "./llm";

// Art Direction (KAR-60): the LLM gives each project its own layout identity.
// Variants are SELECTED from the deterministic kit catalog (the kit renders,
// so a build can never break); customCss is the one place the LLM writes real
// code — sanitized and appended to global.css. Runs once per project: the
// chosen design is persisted in the Site JSON and pinned across rebuilds,
// changeable afterwards through revisions ("hero'yu sade yap").

const CATALOG = `KATALOG (her alan için seçenekler + ne zaman uygun):
- heroVariant:
  * "statement" — dev tipografi, ortalanmış, fotoğrafsız. Güçlü slogan/iddia olan, kurumsal/premium işler.
  * "photoSplit" — sol metin + sağ fotoğraf. Fotoğrafın işletmeyi iyi anlattığı, samimi/hizmet işleri.
  * "minimal" — sola hizalı, süssüz, kompakt. Teknik/mühendislik/danışmanlık; az laf çok iş tonu.
  * "auto" — fotoğraf varsa photoSplit, yoksa statement.
- servicesVariant:
  * "cards" — 3 kolonlu kartlar. 3-6 eşit ağırlıklı hizmet.
  * "list" — numaralı satır listesi. Az sayıda (2-4) veya sıralı/uzman hizmetler; sade profesyonel görünüm.
- aboutVariant:
  * "split" — fotoğraf + metin yan yana. Fotoğrafı olan, hikâyesi görsel işler.
  * "centered" — dar ortalanmış metin. Metin odaklı, kurumsal ciddiyet.
  * "auto" — fotoğraf varsa split.
- density: "airy" (ferah, premium boşluk) | "compact" (yoğun, işine bakan KOBİ).
- radius: "sharp" (keskin köşe — mühendislik/hukuk/ciddi) | "soft" (dengeli varsayılan) | "round" (yumuşak — samimi/yerel esnaf/sağlık).`;

function buildPrompt(site: Site, brief: Brief): string {
  return `Sen Kareya web ajansının art director'üsün. Aşağıdaki müşteri için sitenin görsel kimlik paketini seçeceksin ve İSTERSEN kısa bir proje-özel CSS yazacaksın.

MÜŞTERİ:
- İşletme: ${brief.business.name ?? "-"} (${brief.business.sector ?? "-"})
- Ton: ${brief.brand.tone ?? "kurumsal"} · Renk tercihi: ${brief.brand.colors ?? "-"}
- Hedef kitle/bölge: ${brief.business.region ?? "-"}
- Görüşme notları: ${brief.notes ? brief.notes.slice(0, 800) : "-"}
- Fotoğraf var mı: hero=${site.pages.some((p) => p.sections.some((s) => s.type === "hero" && s.imageUrl)) ? "evet" : "hayır"}, about=${site.pages.some((p) => p.sections.some((s) => s.type === "about" && s.imageUrl)) ? "evet" : "hayır"}

${CATALOG}

customCss KURALLARI (opsiyonel — boş string de geçerli):
- Mevcut section id'lerini hedefleyebilirsin: #hero, #hizmetler, #hakkimizda, #neden-biz, #yorumlar, #sss, #surec, #iletisim. Markup div tabanlıdır — ol/li/ul YOKTUR; section, div, h1-h3, p, a elemanlarını stille. Marka değişkenleri hazır: var(--brand), var(--brand-ink), var(--on-brand), var(--ink), var(--ink-soft), var(--surface).
- SADECE ek stil: arka plan dokusu/degradesi, kenarlık, hover, başlık harf aralığı gibi karaktere katkı. Layout'u bozacak position/display değişikliği YAZMA. @import ve dış URL YASAK. En fazla ~40 satır.
- Emin değilsen boş bırak — az ve isabetli, çoktan iyidir.

SEÇİM İLKESİ: Sektör + ton + notlardan işletmenin KARAKTERİNİ çıkar; her seçimin o karaktere hizmet etsin. rationale alanına 1-2 cümleyle NEDEN'ini yaz (Türkçe).

ÇIKTI — SADECE şu JSON (markdown yok):
{"heroVariant":"...","servicesVariant":"...","aboutVariant":"...","density":"...","radius":"...","customCss":"...","rationale":"..."}`;
}

function extractJson(text: string): string {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("no JSON object in response");
  return trimmed.slice(start, end + 1);
}

export type ArtDirectionResult = {
  design: SiteDesign;
  applied: boolean;
  error?: string;
};

export async function artDirection(
  site: Site,
  brief: Brief,
  llm: LlmFn,
): Promise<ArtDirectionResult> {
  try {
    const raw = await llm(buildPrompt(site, brief));
    const parsed = designSchema.safeParse(JSON.parse(extractJson(raw)));
    if (!parsed.success) {
      return { design: site.design, applied: false, error: "schema validation failed" };
    }
    // A choice without a rationale is indistinguishable from the default —
    // stamp one so the pin logic can tell "chosen" from "never ran".
    const design = parsed.data.rationale
      ? parsed.data
      : { ...parsed.data, rationale: "seçildi (gerekçe verilmedi)" };
    return { design, applied: true };
  } catch (err) {
    return {
      design: site.design,
      applied: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
