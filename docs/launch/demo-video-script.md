# Demo Video Senaryosu (60–90 sn)

> Format önerisi: **ekran kaydı + altyazı** (talking head yok — çekimi kolay,
> HN/X/LinkedIn'in üçünde de çalışır, sessiz izlenebilir). 1080p, tercihen
> 4K'da kaydet → 1080'e indir. Müzik: düşük, nötr. Türkçe konuşma sesi
> videonun KENDİSİ (ajanla gerçek diyalog) — altyazılar İngilizce olsun ki
> aynı video HN/X'te de çalışsın.

## Hazırlık (çekimden önce)

- [ ] Temiz bir davet kodu üret (ops → "Kod oluştur")
- [ ] Tarayıcı: tek pencere, temiz profil, yer imi çubuğu kapalı, 100% zoom
- [ ] Mikrofon testi — ajanın sesi + senin sesin net duyulmalı
- [ ] Senaryodaki işletme: gerçekçi bir kurgu (ör. "Yıldız Fizik Tedavi
      Merkezi, İzmir — 12 yıllık klinik, randevu istiyor")
- [ ] ElevenLabs bakiye/limit kontrolü

## Akış (sahne sahne)

| # | Süre | Ekranda | Altyazı (EN) |
|---|------|---------|--------------|
| 1 | 0:00–0:05 | `/invite` sayfası, kod girilir | "This is an open-source AI web agency. Watch it build a real website from one voice call." |
| 2 | 0:05–0:15 | Oda açılır, ajan Türkçe karşılar, sen cevap verirsin | "The AI consultant interviews you by voice (in Turkish). No forms, no editor." |
| 3 | 0:15–0:35 | **Split ekran hissi:** konuşma sürerken sağdaki brief paneli CANLI dolar (işletme adı, hizmetler, notlar) — en güçlü an, buraya zaman ver | "As you talk, it takes structured notes — live." |
| 4 | 0:35–0:42 | "Görüşmeyi tamamla" → onay modalı → onay | "Approve the brief…" |
| 5 | 0:42–0:55 | Ops/log görünümü ya da bekleme ekranı; ardından **site açılır**, hızlı scroll (multi-page nav'ı da göster) | "…and Claude writes a real Astro project for this business — custom components, gated by `astro build` + content checks. If generation fails, a deterministic kit takes over." |
| 6 | 0:55–1:10 | Odaya dön, revizyon kutusuna yaz (ör. "başlığı değiştir, köşeleri yumuşat") → site güncellenir (before/after) | "Revisions are just messages. Content edits patch data; design edits patch the code — same build gates." |
| 7 | 1:10–1:20 | `sources/<slug>/` manifest + kod dosyaları; hızlıca `git clone`/dosya gezintisi hissi | "The customer owns the source. Real code, no lock-in." |
| 8 | 1:20–1:30 | README/repo sayfası + yıldız butonu | "Open source (AGPL). Self-host your own AI agency. Link below." |

## Kesitler

- **README hero GIF:** Sahne 3'ten 10–15 sn (konuşma → panel dolması). En
  çarpıcı an bu; GIF'e ses gerekmez.
- **X/LinkedIn kısa versiyon (≤45 sn):** Sahne 3 + 5 + 6.

## Çekim notları

- Sahne 5'te build gerçek zamanda ~1-2 dk sürer → kesme (jump cut) kullan,
  "2 minutes later" altyazısı dürüst durur, HN bunu sever.
- Revizyonda değişikliğin görünür olduğu bir istek seç (renk/başlık gibi).
- Hata olursa KESME — "the build gate caught it and fell back" anlatısı
  guardrail hikâyesini kanıtlar (bonus içerik).
