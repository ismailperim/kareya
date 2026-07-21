# Brief v1 — şema referansı

> Uygulama: [`packages/schemas/brief.ts`](../../packages/schemas/brief.ts) · Tam ürün spec'i + gate kriterleri: Linear **KAR-18** (epic) · DESIGN §3'ü (Brief JSON iskeleti) section-haritalı hale genişletir.

İlk görüşmenin çıktısı = **sitenin sözleşmesi**: hem teklif üretmeye hem de hangi siteyi kuracağımızı tanımlamaya yetecek eksiksiz brief. İki katman:

1. **Yapılandırılmış alanlar** (deterministik) — fiyat + Site JSON'u besler. `null` = "henüz karar verilmedi" (≠ "hayır").
2. **Serbest not katmanı** — `notes` (global) + `sections[].notes`. Downstream AI kadrosunun promptunu zenginleştiren ham anlatı; gate'e girmez.

## Çekirdek: section üçlüsü

Her `sections[]` girdisi: `willInclude` (bölüm olacak mı) + `contentSource` (içerik nereden — dahil edilince asla boş) + `keyMessage` (ana mesaj, ham) + `notes` + arketibe özel `facts`.

`contentSource` ∈ `client_text | client_photos | instagram | provided_file | existing_site | agency_generated | none`.

## Enum'lar

- `archetype` (v1): `hizmet | kurumsal` (restoran v1.5, portfolyo/landing v2).
- `feature`: `contact_form | map | whatsapp_button | appointment | reservation | multilang | social_feed` — her biri `featureDecisions[]`'te evet/hayır'a bağlanır (varlık = soruldu).
- `ctaGoal`, `tone`, `domainStatus`, `carePlan` — bkz. `brief.ts`.

## Kritiklik meta'sı (gate tüketir — KAR-21)

`FIELD_CRITICALITY` her alanı etiketler; completeness gate bunu okur:

- **`Z-Fiyat`** — fiyat/kapsam sürücüsü (GATE-A, teklif-hazırlık)
- **`Z-Site`** — siteyi tanımlar (GATE-B, site-tanım-hazırlık)
- **`Beklenen`** — arketip default'u; sorulup karara bağlanmalı (boş bırakılamaz)
- **`Ops`** — opsiyonel; tamamlamayı bloke etmez

## Arketip default'ları

`ARCHETYPE_PAGES` + `ARCHETYPE_SECTIONS` her arketip için önerilen sayfa + section haritasını (label, `defaultInclude`, kritiklik) tutar. Ajan bunları **önerir**, müşteri **onaylar/düzeltir**. `createEmptyBrief(archetype)` bu haritadan boş bir brief tohumlar.

## Tüketiciler

Sesli ajan tool'ları (KAR-22) · completeness gate (KAR-21) · canlı brief paneli (KAR-24) · ileride Site Assembler. Şema değişiklikleri `schema-guardian` ile tüm tüketicilerle tutarlı tutulur.
