# ADR-0002: Site = VERİ + workflow-driven orkestrasyon

- **Durum:** Kabul edildi
- **Tarih:** 2026-07-08
- **Karar verenler:** İsmail Perim
- **İlgili ticket:** —

## Bağlam

İki temel mimari karar, sistemin geri kalanını belirliyor: (1) agent'lar siteyi *nasıl* üretir, (2) kontrol akışının sahibi kim. builder.ai'nin çöküşü (sınırsız üretim + otonom sürü) ve maliyet/debug öngörülebilirliği ihtiyacı bu iki kararı zorunlu kılıyor. Detay: `docs/DESIGN.md` §8.0.

## Düşünülen seçenekler

1. **Agent-driven + LLM ham HTML/CSS üretir** — esnek, demo'da havalı; ama öngörülemez maliyet, resume/debug zor, kod enjeksiyonu riski, kalite tabanı yok (builder.ai borç modeli).
2. **Workflow-driven + Site = VERİ (Site JSON + deterministik renderer)** — kontrol state machine'de; agent'lar stateless işçi; site tek bir şema-valide JSON; render deterministik.

## Karar

**Seçenek 2.** İki bağlı ilke:

**A) Workflow-driven, agent-driven değil.** Kontrol akışının sahibi **state machine** (DESIGN §2); agent'lar aşamalarda çağrılan, girdisi-çıktısı şemayla sabit **stateless işçiler**. Hiçbir agent "sırada ne var" kararı vermez. Kazanım: öngörülebilir maliyet, resume edilebilir job, debug edilebilir hata.

**B) Site = kod değil, VERİ.** Her site tek bir **Site JSON** dokümanı (sayfalar → section listesi → props + içerik + marka token'ları), şemayla valide. **Renderer deterministik**: Site JSON + komponent kiti → Astro build. **LLM asla ham HTML/CSS üretmez.** Revizyon = **ChangeOps** (tipli JSON patch; diff'lenebilir, geri alınabilir, ucuz). `OUT_OF_SCOPE` op'u scope-creep'i otomatik ek-teklife eskale eder.

## Sonuçlar

- **Olumlu:** Revizyon = ucuz JSON patch; QA = şema + görsel; kod enjeksiyonu imkânsız; kalite tabanı komponent kitinden (500-site zanaatı); builder.ai "sınırsız üretim" ölümünün panzehiri.
- **Olumsuz / takas:** Komponent kiti + üç şema (Brief/Site/ChangeOps) önden yatırım ister; kit dışına çıkan istekler `OUT_OF_SCOPE` disiplini gerektirir (kabul edilen kısıt).
- **Takip:** Brief JSON + Site JSON + ChangeOps şema v1 ticket'ları; komponent kiti + section envanteri; `schema-guardian` + `component-kit-reviewer` bu kararın bekçileri.
