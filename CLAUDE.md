# Kareya — AI-Kadrolu Web Ajansı

Türkiye KOBİ'leri için done-for-you web sitesi: müşteri kareya.app'ten kayıt olur, görüşme planlar, **görüşme odasında** (tarayıcı-içi, WebRTC) ajansla konuşur → brief → teklif → AI kadro üretir → review meeting'de ajan siteyi sunar → yayın → bakım aboneliği (MRR).

**Ana tasarım dokümanı: `docs/DESIGN.md`** — mimari, agent kadrosu, Site JSON/ChangeOps kavramları, görüşme odası, fazlar, kill kriterleri. Değişiklikler oraya işlenir; bu dosya sadece giriş kapısı.

## Temel kurallar (DESIGN.md'nin özü)

1. **Workflow-driven:** state machine kontrolü tutar (BRIEF→PROPOSED→ACCEPTED→BUILDING→QA→CLIENT_REVIEW→REVISION(≤2)→LAUNCH_PREP→LIVE→CARE); agent'lar stateless işçi.
2. **Site = veri:** agent asla ham HTML/CSS yazmaz. Site JSON + komponent kiti → deterministik Astro render. Revizyon = ChangeOps (tipli patch).
3. **LLM karar verir, altyapıya kural dokunur:** fiyat, DNS, deploy, fatura asla LLM'de.
4. **In-call ajan yetkisi dar:** brief toplar, panel günceller, sayfa gezdirir. Fiyat/indirim/taahhüt veremez.
5. **Faz a: koltuktaki insan İsmail** — görüşme odası UI'ı gün 1'de gerçek, ses koltuğu sonra ajana devredilir. Her görüşme kaydı = ajanın script/eval seti.
6. **Revizyon 2 tur dahil**, OUT_OF_SCOPE op'u ek-teklife eskale eder (builder.ai dersi).
7. **Gün 1'den ölç:** aşama başına insan-dakikası — startup vs lifestyle kararını bu metrik verir.

## Stack (karar verilmiş)

Supabase (Postgres+RLS+Auth) · n8n (Faz a orkestrasyon) · Astro + Tailwind komponent kiti · Cloudflare Pages (site başına deploy) · Claude API (Agent SDK) · iyzico + Paraşüt e-Arşiv · WhatsApp Business API · Sesli görüşme: ElevenLabs Agents vs OpenAI Realtime (spike ile seçilecek, `MeetingSession` soyutlaması arkasında)

## Dogfooding

Müşteri sitelerinin SSL'i CertWarden, uptime'ı Upti izler (İsmail'in kendi app'leri). Ajans kurulum hikâyesi NextLabz kanalında build-in-public içerik olur.

## Çalışma modeli (modus)

Kareya, Linear tabanlı **modus** operating model'i ile geliştirilir. **Altın kural: her iş bir Linear ticket'ından başlar** (istisna: bu operating model'i düzenleyen meta işler + trivial düzeltmeler).

**Döngü:** çalışma seansı → `/modus:meeting-to-tickets` → `/modus:refine <KAR-x>` → `/modus:ticket <KAR-x>` (In Progress + branch) → develop → `/modus:ship` (PR `Fixes KAR-x` + In Review) → review → merge → Linear otomatik **Done**.

**Subagent'lar — hangi iş için hangisi** (tam liste: `docs/process/agents.md`):

| İş | Agent |
|----|-------|
| Seans notu → ticket | `po-translator` |
| Gereksinim netleştirme, acceptance criteria | `business-analyst` |
| Arketip / section / fiyat / domain doğruluğu | `web-agency-expert` |
| Sistem mimarisi / büyük resim | `system-architect` |
| Teknik yürütme / ADR / standartlar | `tech-lead` |
| n8n / worker / entegrasyon / iş mantığı | `backend-dev` |
| Portal / görüşme odası / section UI | `frontend-dev` |
| Supabase şema / migration / RLS | `database-dev` |
| Brief/Site JSON/ChangeOps şema tutarlılığı | `schema-guardian` |
| Yeni section kit uyumu | `component-kit-reviewer` |
| Görsel/teknik QA orkestrasyonu | `qa-runner` |
| UX / akış / wireframe | `ux-designer` |
| Test / doğrulama | `qa-engineer` |
| PR review | `code-reviewer` |
| Güvenlik / RLS / meeting-room yetki / KVKK | `security-reviewer` |
| CI/CD, CF deploy, infra | `devops` |
| Doküman / onboarding | `technical-writer` |
| Konumlandırma, içerik, GTM | `marketing` |

> **Ayrım:** Yukarıdakiler Kareya'yı *inşa eden* geliştirme subagent'ları. DESIGN §8.1'deki ürün ajanları (Brief Analyst, Site Assembler, Renderer…) ürünün *çalışma-zamanı* kadrosudur — n8n/Claude API'de koşar, `agents-runtime` label'lı ticket'larla inşa edilir.

## Linear / MCP davranışı

- Linear MCP `linear` adıyla bağlıdır (`.mcp.json`, http `https://mcp.linear.app/mcp`). İlk kullanımda `/mcp` ile OAuth login gerekir. Team key: **`KAR`**.
- Ticket'ı işe alırken **In Progress** yap; iş bitince PR aç ve **In Review** yap. Issue'yu **elle `Done` yapma** — merge sonrası Linear otomatik kapatır.
- Anlamlı her adımda (başlangıç, blocker, karar, PR) ticket'a kısa bir **comment** düş. Comment'ler aynı zamanda talimat kanalıdır.
- Yeni ticket yalnızca `/modus:meeting-to-tickets` veya `/modus:refine` bağlamında, **kullanıcı onayıyla**. Detay: `docs/process/linear.md`.

## Konvansiyonlar

- **Branch:** `<type>/kar-<n>-<kisa-baslik>` (örn. `feature/kar-12-hero-section`). **Commit:** Conventional Commits (İngilizce). **PR:** body'de `Fixes KAR-x`. Detay: `docs/process/git-conventions.md`.
- **Dil:** kod, yorum, kod mesajları/**API**, teknik doküman (README, ADR), commit/PR, değişken/dosya adı **İngilizce** (best practice). Yalnızca **son-kullanıcıya dönük ürün içeriği** (görüşme odası/portal UI, KVKK metni, pazarlama copy, üretilen siteler) **Türkçe**. Strateji/operating dokümanları (`docs/DESIGN.md`, `docs/process/`, `.claude/agents/`) şimdilik Türkçe.

## Repo haritası

- `CLAUDE.md` — bu dosya (giriş kapısı). · `docs/DESIGN.md` — ana tasarım.
- `apps/portal` — kareya.app portalı (Next.js → CF Worker): görüşme odası, `/s/[id]` site önizleme, `/ops` dashboard, API'ler. · `apps/runner` — build runner (Node; homelab/container): kuyruktan `build_site` işler → Astro build → R2.
- `packages/schemas` — Brief/Site JSON + completeness gate + faz makinesi (tek doğruluk kaynağı). · `packages/site-gen` — Brief→Site→Astro üretimi + R2 publish.
- `docs/process/` — workflow, Linear, git, agent konvansiyonları. · `docs/architecture/decisions/` — ADR'ler. · `docs/meetings/templates/` — seans şablonu.
- `.claude/agents/` — subagent tanımları. · `.claude/commands/modus/` — `/modus:*` komutları. · `.mcp.json` — Linear MCP config.

## Açık kararlar (build başlamadan)

- [ ] Arketip v1 section envanteri (doktor hediye sitesi = arketip #1'in doğumu)
- [ ] Brief JSON + Site JSON şema v1
- [ ] Fiyat matrisi (İsmail'in 500-site deneyiminden kurallara dökülecek)
- [ ] Voice vendor spike (ElevenLabs vs OpenAI Realtime, 1'er gün)
- [ ] WhatsApp Business API onboarding (Meta 1-2 hafta — erken başlat)

## İlişkili yerler

- Araştırma geçmişi + niş analizleri: `~/Repos/perim.net` (research workspace)
- Video pipeline: `~/Repos/nextlabz-studio`
- kareya.app domain alınmış; kareya.com.tr alınacak; TÜRKPATENT sınıf 42 başvurusu yapılacak
