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
