import {
  ARCHETYPES,
  ARCHETYPE_SECTIONS,
  CONTENT_SOURCES,
  CTA_GOALS,
  FEATURES,
  TONES,
} from "@kareya/schemas";

// Single source of truth for the ElevenLabs agent's tools + system prompt v2
// (KAR-22). Consumed by the client adapter (tool names) and the setup script
// (scripts/setup-agent.mts, which pushes this config to the ElevenLabs agent).

export const MEETING_TOOL_NAMES = [
  "set_archetype",
  "update_field",
  "set_flag",
  "update_section",
  "set_feature",
  "append_note",
  "check_completeness",
] as const;

const SECTION_KEYS = Object.fromEntries(
  ARCHETYPES.map((a) => [a, ARCHETYPE_SECTIONS[a].map((s) => s.key)]),
) as Record<(typeof ARCHETYPES)[number], string[]>;

const UPDATE_FIELD_PATHS = [
  "business.name",
  "business.sector",
  "business.tagline",
  "business.region",
  "contact.phone",
  "contact.email",
  "contact.address",
  "contact.hours",
  "social.instagram",
  "brand.tone",
  "brand.colors",
  "cta.primaryGoal",
  "deadline",
  "multilang.langs",
];

// ElevenLabs client-tool definitions (JSON schema params).
export const MEETING_TOOLS = [
  {
    type: "client",
    name: "set_archetype",
    description:
      "Sektörden site arketibini belirle ve müşteriye doğrulattıktan sonra çağır. Sayfa + bölüm iskeletini kurar.",
    expects_response: false,
    parameters: {
      type: "object",
      required: ["archetype"],
      properties: {
        archetype: { type: "string", enum: [...ARCHETYPES], description: "hizmet | kurumsal" },
      },
    },
  },
  {
    type: "client",
    name: "update_field",
    description: `Metin bir brief alanını kaydet. Geçerli path'ler: ${UPDATE_FIELD_PATHS.join(", ")}. brand.tone = ${TONES.join("|")}. cta.primaryGoal = ${CTA_GOALS.join("|")}. multilang.langs virgülle ayır (ör. "tr,en").`,
    expects_response: false,
    parameters: {
      type: "object",
      required: ["path", "value"],
      properties: {
        path: { type: "string", description: "Örn: business.tagline, contact.phone" },
        value: { type: "string", description: "Alanın değeri (metin)" },
      },
    },
  },
  {
    type: "client",
    name: "set_flag",
    description:
      "Evet/hayır bilgisini kaydet: hasText (metinler müşteride mi), hasPhotos (görseller müşteride mi), hasLogo (logo var mı).",
    expects_response: false,
    parameters: {
      type: "object",
      required: ["name", "value"],
      properties: {
        name: { type: "string", enum: ["hasText", "hasPhotos", "hasLogo"], description: "Hangi bilgi: hasText | hasPhotos | hasLogo" },
        value: { type: "boolean", description: "true = müşteride var / evet, false = yok / hayır" },
      },
    },
  },
  {
    type: "client",
    name: "update_section",
    description: `Bir sayfa bölümünü kaydet. Her bölüm için: olacak mı (willInclude), içeriği nereden gelecek (contentSource), ana mesajı (keyMessage). hizmet bölümleri: ${SECTION_KEYS.hizmet.join(", ")}. kurumsal bölümleri: ${SECTION_KEYS.kurumsal.join(", ")}.`,
    expects_response: false,
    parameters: {
      type: "object",
      required: ["section"],
      properties: {
        section: { type: "string", description: "Bölüm anahtarı (ör. services, about, contact)" },
        willInclude: { type: "boolean", description: "Bu bölüm sitede olacak mı" },
        contentSource: { type: "string", enum: [...CONTENT_SOURCES], description: "İçerik nereden gelecek" },
        keyMessage: { type: "string", description: "Ham ana mesaj (cilalı metin değil)" },
      },
    },
  },
  {
    type: "client",
    name: "set_feature",
    description: `Bir özelliği evet/hayır'a bağla. Özellikler: ${FEATURES.join(", ")}. Her birini açıkça sor.`,
    expects_response: false,
    parameters: {
      type: "object",
      required: ["feature", "enabled"],
      properties: {
        feature: { type: "string", enum: [...FEATURES], description: "Özellik anahtarı" },
        enabled: { type: "boolean", description: "true = evet, false = hayır" },
      },
    },
  },
  {
    type: "client",
    name: "append_note",
    description:
      "Konuşmada yakaladığın her nüansı, hikâyeyi, tercihi, bağlamı serbest nota ekle. Sık kullan — teklifi/siteyi zenginleştiren ham malzeme budur.",
    expects_response: false,
    parameters: {
      type: "object",
      required: ["text"],
      properties: { text: { type: "string", description: "Serbest not metni (nüans/hikâye/bağlam)" } },
    },
  },
  {
    type: "client",
    name: "check_completeness",
    description:
      "Brief'te teklif + site için hâlâ eksik olan bilgileri döndürür. Görüşmeyi toparlamadan önce çağır ve eksikleri sor.",
    expects_response: true,
    parameters: { type: "object", required: [], properties: {} },
  },
];

export const FIRST_MESSAGE =
  "Merhaba, ben Kareya'nın proje danışmanıyım. Size gerçekten yakışan bir web sitesi çıkarabilmemiz için biraz sohbet edip işinizi tanımak istiyorum — acele etmeyelim. Öncelikle, ne iş yaptığınızı biraz anlatır mısınız?";

export const SYSTEM_PROMPT_V2 = `Sen Kareya adlı "done-for-you" web ajansının SESLİ PROJE DANIŞMANISIN. Türkçe konuşursun. Amacın: işletme sahibiyle 15-30 dakikalık, insan gibi, sıcak ve meraklı bir keşif (discovery) görüşmesi yaparak, hem TEKLİF hazırlanabilecek hem de HANGİ SİTENİN yapılacağını tanımlayacak eksiksiz bir brief toplamak.

## Önceki oturum (resume)
Aşağıda bu görüşmede şimdiye kadar toplanmış bilgiler var. DOLUYSA: bunları TEKRAR SORMA; kısaca "kaldığımız yerden devam edelim" de, gerekiyorsa bir-iki teyit yap ve EKSİK kalanlara odaklan. BOŞSA: sıfırdan, normal akışla başla.
--- Toplanan bilgiler ---
{{collected_summary}}
--- son ---

## Tarz
- Form dolduran bir bot gibi DEĞİL; kıdemli, meraklı bir danışman gibi konuş. Tek seferde tek soru sor, cevabı gerçekten dinle, takip soruları sor, merakını takip et.
- İşin hikâyesini, ne zamandır yaptıklarını, hedef kitlelerini, rakiplerinden farklarını, marka hissini derinlemesine kazı. Acele etme; müşteriyi rahatlat.
- Kısa, doğal cümleler. Arada özetleyip doğrula ("Doğru anladıysam...").

## Araçları KULLAN (her bilgiyi anında kaydet)
- Öğrendiğin her metin bilgisini ilgili araca işle: set_archetype, update_field, set_flag, update_section, set_feature.
- Yakaladığın her nüansı/hikâyeyi/tercihi append_note ile serbest nota ekle. SIK kullan — teklifi ve siteyi zenginleştiren ham malzeme budur. Cilalı metin yazma; ham gerçekleri + ana mesajları topla.

## Akış (esnek — sohbetin gidişine uy)
1. Ne iş yaptığını anla → arketibi belirle (hizmet veya kurumsal), müşteriye doğrulat, set_archetype çağır.
2. İşi derinlemesine tanı: adı, ne yaptığı, hikâyesi, hedef kitlesi, farkı, tonu. update_field ile business.name/sector/tagline/region ve brand.tone doldur; hikâyeleri append_note'a yaz.
3. Sitenin ana amacı + ziyaretçiyi yönlendireceğin ana eylem → update_field cta.primaryGoal.
4. Bölüm bölüm gez: arketibin bölümlerini öner ve onaylat. Her bölüm için update_section ile olacak mı + içeriği nereden gelecek (çok önemli: müşteride mi, biz mi üretelim) + ana mesaj. İçerik kaynağını ASLA atlama.
5. İçerik kaynağı (genel): metinler müşteride mi (set_flag hasText) ve görseller/fotoğraflar müşteride mi (set_flag hasPhotos) — ayrı ayrı sor. En büyük belirsizlik budur.
6. Marka: logo var mı (set_flag hasLogo), renk/ton tercihi (update_field brand.tone/brand.colors).
7. İletişim: telefon, e-posta, adres, çalışma saatleri, Instagram → update_field.
8. Özellik taraması: her birini açık evet/hayır'a bağla (set_feature): iletişim formu, harita, WhatsApp butonu, online randevu, rezervasyon, çok dillilik, sosyal medya akışı. "Belki" ise netleştir. Çok dillilik evetse dilleri sor (update_field multilang.langs).
9. Termin beklentisi → update_field deadline.
10. Ara ara ve **bitirmeden hemen önce** check_completeness çağır; dönen eksikleri tek tek hedefli sor. AMA bir bilgi gerçekten YOKSA (müşteride yok / henüz belli değil, ör. yeni işletme telefonu), ISRAR ETME — append_note ile "X henüz yok, sonra eklenecek" diye not düş ve geç. GATE bir ZEMİN'dir, tavan değil: hikâye/detay için konuşmaya devam et, erken bitirme; ama mevcut olmayan bilgi için görüşmeyi tıkama.
11. Bitirirken topladıklarını kısaca özetle ve teşekkür et.

## Yetki sınırı (KATII)
Fiyat, indirim veya teslim süresi SÖYLEME/TAAHHÜT ETME. Sorulursa: "Fiyat ve teslim süresini ekibimiz topladığımız detaylara göre teklifte netleştirip size iletecek." de ve kapsam toplamaya dön.

Unutma: eksiksiz, zengin bir brief = harika bir teklif + doğru bir site. Ne kadar çok gerçek detay ve ham not toplarsan o kadar iyi.`;
