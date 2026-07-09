# ADR-0001: Tech stack

- **Durum:** Kabul edildi
- **Tarih:** 2026-07-08
- **Karar verenler:** İsmail Perim
- **İlgili ticket:** —

## Bağlam

Kareya; TR KOBİ'leri için **done-for-you** web sitesi üreten AI-kaldıraçlı bir ajans. Çekirdek iş: görüşme odasında brief topla → teklif → AI kadro siteyi üret → review → yayın → bakım (MRR). Kurucu indie ve maliyet hassas; compute'unu Cloudflare'de tutuyor, n8n/DevOps'ta ve CMS yazımında deneyimli. Üretilen her site statik olabilir (içerik sitesi) → hosting marjı buradan gelir. Detay: `docs/DESIGN.md` §8.4.

## Düşünülen seçenekler

1. **Hazır SaaS website builder + entegrasyon** — hızlı ama moat yok, scope kontrolü ve deterministik render mümkün değil (builder.ai dersi: sınırsız scope = ölüm).
2. **Kendi orkestrasyon + komponent kiti + Site JSON (satın-al/yap dengeli)** — ses/ödeme/hosting satın al; kit + şema + orkestrasyon + ChangeOps yap. Moat burada.
3. **Full custom, her şey elde** — en yüksek kontrol, en yavaş; ses/ödeme/turn-taking'i yeniden yazmak israf.

## Karar

**Seçenek 2 — dengeli satın-al/yap.**

- **Orkestrasyon:** **n8n** (self-host, Faz a) + **Supabase** (Postgres + RLS + Auth + Storage) state. State machine: BRIEF→PROPOSED→ACCEPTED→BUILDING→QA→CLIENT_REVIEW→REVISION(≤2)→LAUNCH_PREP→LIVE→CARE. (Faz b'de gerekirse Temporal/Inngest'e taşınabilir — state machine tanımı taşınabilir tutulur.)
- **Üretim:** **Astro + Tailwind** komponent kiti → Site JSON'dan deterministik build → **Cloudflare Pages** (site başına deploy). Statik çıktı ≈ sıfır marjinal hosting.
- **Portal:** kareya.app (Next.js / CF Pages) — pazarlama + müşteri portalı + preview + görüşme odası.
- **Agent runtime:** Node/TS worker + **Claude API (Agent SDK)** + job queue; model routing (parse/patch → ucuz, copy/art-direction → güçlü, görsel QA → vision). Site başına LLM+vision **<$10** hedefi.
- **Ödeme/fatura:** iyzico (kapora/link) + Paraşüt e-Arşiv — **kural tabanlı, LLM'siz**.
- **İletişim:** WhatsApp Business API (Meta/Twilio).
- **Sesli görüşme (Faz b/spike):** ElevenLabs Agents vs OpenAI Realtime — `MeetingSession` soyutlaması arkasında, **satın al, yazma** (turn-taking).
- **Dogfood izleme:** müşteri sitelerinin SSL'i CertWarden, uptime'ı Upti.

## Sonuçlar

- **Olumlu:** En güçlü olunan alanlar (n8n, CF, CMS) kullanılır; düşük/öngörülebilir maliyet; statik çıktı bakım marjını taşır; vendor kilidi soyutlamalarla sınırlı.
- **Olumsuz / takas:** n8n self-host + build/QA runner operasyon yükü doğar; çok sayıda entegrasyon (iyzico/Paraşüt/WhatsApp/ses) yönetilecek.
- **Takip:** repo bootstrap, şema v1 (ADR/ticket), CI/CD, n8n iskeleti ticket'ları; ADR-0002 (site = veri).
