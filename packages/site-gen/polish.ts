import { safeParseSite, type Brief, type Site } from "@kareya/schemas";

import type { LlmFn } from "./llm";

// Content polish (KAR-50): rewrite the assembled site's raw copy into polished,
// on-brief Turkish marketing copy. Structure is never LLM-decided — the LLM
// only rewrites text inside the already-assembled Site JSON. Any parse/shape
// failure falls back to the unpolished site (deterministic baseline).

function buildPrompt(site: Site, brief: Brief): string {
  return `Sen Kareya web ajansının kıdemli Türkçe içerik yazarısın. Aşağıda bir müşterinin görüşme brief'i ve bu brief'ten üretilmiş taslak Site JSON var. Görevin: SADECE metin alanlarını cilalamak — profesyonel, akıcı, müşterinin tonuna uygun Türkçe pazarlama metni yazmak.

KURALLAR:
- JSON yapısını AYNEN koru: aynı anahtarlar, aynı section sırası, aynı section type'ları, aynı eleman sayıları. Yapı ekleme/çıkarma YASAK.
- Sadece şu metin alanlarını iyileştir: hero headline/subheadline/ctaLabel, services items name/description (boş description'ları doldur), process steps title/description (işletmeye göre uyarla), about title/body (2-3 kısa paragraf, \\n ile ayır), whyUs points title/description, ctaBanner headline/ctaLabel (kısa, dönüşüm odaklı), testimonials başlığı (alıntıların METNİNİ DEĞİŞTİRME, yenisini UYDURMA), faq items (soruları doğal soru cümlesine çevir + brief/notlara dayanarak kısa net cevaplar yaz; kesin bilgi yoksa "netleştirelim" tonunda genel cevap), contact title.
- statsBar items: SADECE brief/notlarda GEÇEN gerçek rakamlarla doldur (ör. "15 yıl" → {"value":"15+","label":"Yıl Deneyim"}); 2-4 öğe; gerçek rakam yoksa BOŞ bırak ([]) — rakam UYDURMA.
- MARKA RENGİ: brand.primary ve brand.accent hex değerlerini müşterinin renk tercihine göre ayarla. Müşteri tercihi: "${brief.brand.colors ?? "belirtilmedi"}". Tercih belirtilmişse ona uygun, uyumlu ve erişilebilir (beyaz metinle yeterli kontrast) bir palet seç; belirtilmemişse mevcut değerleri koru.
- Bilgi UYDURMA: yalnızca brief'te/notlarda olan gerçekleri kullan. Emin olmadığın rakam/iddia yazma. Telefon/e-posta/adres UYDURMA.
- Ton: ${brief.brand.tone ?? "kurumsal"}. Dil: Türkçe.

YAZIM KALİTESİ (kıdemli metin yazarı standardı):
- Hero headline: FAYDA/SONUÇ odaklı, en fazla 9 kelime, işletmeye özgü. Genel klişe YASAK ("Kaliteli Hizmet", "Çözüm Ortağınız", "Dijital Dünyada Yanınızdayız" gibi her siteye uyan cümleler kullanma).
- Subheadline: somut — KİM için, NE yapıyor, NEREDE. Notlardaki gerçek detayları kullan (uzmanlık alanı, bölge, deneyim).
- "En iyi", "lider", "1 numara" gibi kanıtsız üstünlük iddiaları yazma; onun yerine notlardaki somut gerçekleri öne çıkar.
- Kısa cümleler, aktif çatı, "siz" hitabı. Her description 1-2 cümle — duvar metni yazma.
- Services description'ları: hizmetin müşteriye FAYDASINI söyle, tanımını tekrar etme ("Web tasarım hizmeti veriyoruz" ❌ → "Sizi arayan müşterinin ilk 5 saniyede güven duyduğu bir site" ✓).
- CTA label'ları fiille başlar, 2-4 kelime ("Randevu alın", "Teklif isteyin").
- FAQ cevapları 2-3 cümle, net ve dürüst; bilinmeyen konuda taahhüt verme.
- ÇIKTI: SADECE geçerli JSON döndür. Markdown, açıklama, kod bloğu YOK.

MÜŞTERİ BRIEF ÖZETİ:
- İşletme: ${brief.business.name ?? "-"} (${brief.business.sector ?? "-"})
- Slogan: ${brief.business.tagline ?? "-"} · Bölge: ${brief.business.region ?? "-"}
- Renk tercihi: ${brief.brand.colors ?? "-"}
- Görüşme notları: ${brief.notes ? brief.notes.slice(0, 1200) : "-"}

TASLAK SITE JSON:
${JSON.stringify(site)}`;
}

/** Strip an accidental markdown fence and extract the JSON object. */
function extractJson(text: string): string {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("no JSON object in response");
  return trimmed.slice(start, end + 1);
}

/** Structure must survive the polish: same pages, same section types in order. */
function sameStructure(a: Site, b: Site): boolean {
  if (a.pages.length !== b.pages.length) return false;
  return a.pages.every((page, i) => {
    const other = b.pages[i];
    return (
      other &&
      page.sections.length === other.sections.length &&
      page.sections.every((s, j) => s.type === other.sections[j].type)
    );
  });
}

export type PolishResult = { site: Site; polished: boolean; error?: string };

export async function polishSite(
  site: Site,
  brief: Brief,
  llm: LlmFn,
): Promise<PolishResult> {
  try {
    const raw = await llm(buildPrompt(site, brief));
    const parsed = safeParseSite(JSON.parse(extractJson(raw)));
    if (!parsed.success) return { site, polished: false, error: "schema validation failed" };
    if (!sameStructure(site, parsed.data)) {
      return { site, polished: false, error: "structure changed by LLM" };
    }
    return { site: parsed.data, polished: true };
  } catch (err) {
    return {
      site,
      polished: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
