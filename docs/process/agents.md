# Agent Kadrosu

Kareya amaç-bazlı subagent'larla geliştirilir. Her rol `.claude/agents/` altında bir `.md` dosyasıdır ve `Agent` tool'u ile çağrılır. Bu doküman "hangi iş için hangi agent" sorusunun referansıdır.

> **Kritik ayrım — iki farklı "agent" katmanı:**
> - **Geliştirme subagent'ları (bu dosya):** Kareya'yı *inşa eden* Claude Code ajanları (tech-lead, frontend-dev, schema-guardian…).
> - **Ürün çalışma-zamanı ajanları (DESIGN §8.1):** Kareya ürününün *içinde* koşan AI kadro (Brief Analyst, Proposal Writer, Art Director, Content Writer, Site Assembler, Renderer, QA süiti, Revision Interpreter, Comms, Care, Intake Voice). Bunlar n8n + Claude API/Agent SDK runtime'ında çalışır; Claude Code subagent'ı **değildir**. İleride `agents-runtime` label'lı ticket'larla inşa edilir.

## Genel ilke

- Bir işi başlatmadan önce **doğru rolü seç**. Yanlış agent ile başlamak yerine, işi en uygun role devret.
- Her agent kendi **sorumluluk sınırında** kalır; sınır dışına çıkması gerekirse ilgili agent'a devreder veya kullanıcıya danışır.
- Tüm agent'lar `CLAUDE.md`, `docs/DESIGN.md` ve `docs/process/` konvansiyonlarına uyar.

## Tech bağlamı (karar verildi — DESIGN §8.4, ADR-0001/0002)

Stack ve mimarinin çekirdeği kararlaştırıldı (`docs/DESIGN.md` §8, `docs/architecture/decisions/`):
- **Orkestrasyon:** n8n (self-host) + **Supabase** (Postgres + RLS + Auth + Storage) state. State machine: BRIEF→PROPOSED→ACCEPTED→BUILDING→QA→CLIENT_REVIEW→REVISION(≤2)→LAUNCH_PREP→LIVE→CARE.
- **Site = VERİ:** her site tek bir **Site JSON** dokümanı → deterministik **Astro + Tailwind** komponent kiti render → **Cloudflare Pages** (site başına deploy). LLM asla ham HTML/CSS yazmaz.
- **Revizyon = ChangeOps:** tipli patch listesi (`replace_text`, `swap_section`, `change_palette`, `add_page`, `OUT_OF_SCOPE`…). 2 tur dahil.
- **Portal:** kareya.app (Next.js / CF Pages) — pazarlama + müşteri portalı + preview + görüşme odası.
- **Agent runtime:** Node/TS worker + Claude API (Agent SDK) + job queue; model routing (parse/patch → ucuz model, copy/art-direction → güçlü model, görsel QA → vision). Site başına <$10 hedefi.
- **Al/yap çizgisi:** ses altyapısı (ElevenLabs/OpenAI Realtime — spike), ödeme (iyzico+Paraşüt), hosting → **satın al**. Komponent kiti + Site JSON şeması + orkestrasyon + ChangeOps → **yap, moat burası.**
- **Konvansiyon (dil):** kod, yorum, kod mesajları/API, teknik doküman (README/ADR), commit/branch **İngilizce**; yalnızca son-kullanıcı ürün içeriği (UI/KVKK/pazarlama) **Türkçe**. Strateji/operating dokümanları (DESIGN, `docs/process`, agents) şimdilik Türkçe.

> Genel review/TDD için ECC benzeri bir plugin eklenirse **GateGuard kapalı** kurulmalı (perim.net dersi).

## Roller

### Ürün & Analiz
- **po-translator** — Seans/planlama çıktısını atomik, net Linear ticket'larına çevirir. Label/öncelik atar. Kullanıcı onayı olmadan ticket yazmaz.
- **business-analyst** — Gereksinimi netleştirir, acceptance criteria yazar, büyük işi sub-issue'lara böler, açık soruları çıkarır.

### Domain
- **web-agency-expert** — Done-for-you web ajansı domain'i: TR KOBİ web ihtiyaçları, **site arketipleri** (kurumsal, hizmet, restoran, portfolyo, landing) + section envanteri, İsmail'in 500-site fiyat/scope sezgisi, komponent kiti kalite tabanı, revizyon/ChangeOps katalogu. Ürün doğruluğunun sahibi.

### Teknik liderlik
- **system-architect** — Sistemin büyük resmi: bileşen sınırları, veri akışı (Brief JSON → Site JSON → render → ChangeOps), ölçeklenebilirlik, entegrasyon desenleri. Sistemin *şeklini* tasarlar.
- **tech-lead** — Teknik yürütme: ADR sahipliği, cross-cutting standartlar, dev koordinasyonu, günlük kararlar, teknik risk. (architect *neyi/şekli*, tech-lead *nasıl yürütülür*.)

### Geliştirme
- **backend-dev** — n8n orkestrasyon akışları, Node/TS worker'lar, Claude Agent SDK entegrasyonu, Supabase iş mantığı, iyzico/Paraşüt/WhatsApp entegrasyonları (kural tabanlı).
- **frontend-dev** — kareya.app portalı (Next.js), görüşme odası UI (WebRTC, brief paneli, co-browse), Astro komponent kiti section'ları.
- **database-dev** — Supabase/Postgres şema, RLS, migration; proje kaydı, Brief/Site JSON versiyonları, ChangeOps log tabloları.

### Kareya'ya özel (DESIGN §14)
- **schema-guardian** — Brief JSON + Site JSON + ChangeOps şemalarının tek doğruluk kaynağı; şema değişikliklerini tüketicilerle (renderer, agent'lar, validasyon) tutarlı tutar.
- **component-kit-reviewer** — yeni section'ların kit adlandırma/props/token konvansiyonuna ve Site JSON şemasına uyumunu denetler.
- **qa-runner** — Playwright + vision model görsel QA orkestrasyonu (taşma, kontrast, mobil kırılma) + Lighthouse; screenshot'ları Site JSON versiyonuna bağlar.

### Tasarım
- **ux-designer** — görüşme odası deneyimi, canlı brief paneli, review co-browse, müşteri portalı akışları; teknik olmayan KOBİ sahibi için sade deneyim.

### Kalite & Operasyon
- **qa-engineer** — Test yazımı (unit/integration/e2e), acceptance criteria doğrulaması, regresyon.
- **code-reviewer** — PR review: doğruluk, güvenlik, okunabilirlik, konvansiyon uyumu.
- **security-reviewer** — Güvenlik denetimi: Supabase RLS, **görüşme odası tool allowlist** (in-call ajan yetkisi dar), prompt-injection yüzeyi, secret, KVKK, bağımlılık riskleri.
- **devops** — CI/CD (GitHub Actions), CF Pages site-başına deploy, n8n self-host, DNS/SSL, gözlemlenebilirlik (CertWarden/Upti dogfood), secret yönetimi.

### Dokümantasyon
- **technical-writer** — Kullanıcı/geliştirici dokümanı, onboarding, yardım içeriği (Türkçe).

### Büyüme
- **marketing** — Konumlandırma ("1 haftada ajans kalitesinde site"), landing/içerik, GTM, NextLabz build-in-public serisi, mesajlaşma.

## Seçim tablosu

| İhtiyaç | Agent |
|---------|-------|
| Seans notu → ticket | `po-translator` |
| "Bu ticket tam ne istiyor?" | `business-analyst` |
| Arketip / section / fiyat / domain doğruluğu | `web-agency-expert` |
| Sistemin büyük resmi / mimari şekil | `system-architect` |
| Teknik yürütme / ADR / standartlar | `tech-lead` |
| n8n akışı / worker / entegrasyon / iş mantığı | `backend-dev` |
| Portal / görüşme odası / section UI | `frontend-dev` |
| Supabase şema / migration / RLS | `database-dev` |
| Brief/Site JSON/ChangeOps şema tutarlılığı | `schema-guardian` |
| Yeni section kit uyumu | `component-kit-reviewer` |
| Görsel/teknik QA orkestrasyonu | `qa-runner` |
| UX / akış / wireframe | `ux-designer` |
| Test / doğrulama | `qa-engineer` |
| PR incelemesi | `code-reviewer` |
| Güvenlik / RLS / meeting-room yetki / KVKK | `security-reviewer` |
| Pipeline / CF deploy / infra | `devops` |
| Doküman / onboarding / yardım | `technical-writer` |
| Konumlandırma / içerik / GTM | `marketing` |

## İleride eklenebilecek roller

İhtiyaç doğdukça: `voice-integration` (MeetingSession/vendor spike), `data-analyst` (aşama-başına insan-dakikası metriği), `support` (müşteri destek). Eklerken bu listeyi ve `.claude/agents/`'i güncelle.
