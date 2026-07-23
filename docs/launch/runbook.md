# Launch Runbook

> Tarihi İsmail seçer. Öneri: repo'yu **Pazartesi** public yap (sessiz),
> **Salı** LinkedIn TR, **Perşembe** Show HN + X. Böylece HN ziyaretçisi
> birkaç günlük yıldız/aktivite görür, "az önce açılmış boş repo" görmez.

## T-3 → T-1: Hazırlık kontrol listesi

**Güvenlik (public'ten önce ŞART):**
- [ ] Key rotasyonu: ElevenLabs → Neon → R2 (yeni değerler yalnız `.env.local` + CF secret)
- [ ] `OPS_PASSWORD` CF Worker'da tanımlı, /ops 401 veriyor (auth'suz)
- [ ] ElevenLabs harcama tavanı + concurrency limiti
- [ ] (Ops.) CF Access — sadece `/ops` path'i, ikinci katman

**İçerik:**
- [ ] Demo video çekildi (script: `demo-video-script.md`), YouTube'a (NextLabz) yüklendi — unlisted başlat, launch günü public
- [ ] README'ye hero GIF (Sahne 3 kesiti) + video linki eklendi
- [ ] Demo proje (Ege Yazılım) son haliyle parlak — preview linki çalışıyor
- [ ] 5-10 davet kodu hazır (DM'den isteyenlere)

**Repo:**
- [ ] `gh repo edit --visibility public`
- [ ] About/topics: `ai`, `agent`, `astro`, `claude`, `open-source-agency`, `voice`
- [ ] 3-5 "good first issue" aç (CONTRIBUTING'deki alanlardan)
- [ ] Son bir `gitleaks git --log-opts="--all" .` koşusu

## Launch günleri

| Gün | Saat (TR) | Aksiyon |
|-----|-----------|---------|
| Pzt | — | Repo public (duyurusuz). CI yeşil mi kontrol. |
| Salı | 08:30–10:00 | **LinkedIn TR** postu (`linkedin-tr.md`). İlk saat tüm yorumlara cevap. |
| Salı | akşam | LinkedIn geri bildirimiyle Show HN metnine son rötuş. |
| Perş | 15:00–16:00 | **Show HN** (`show-hn.md`) → hemen ardından mimari ilk yorumu ekle. |
| Perş | 16:00 | **X thread** (`x-thread.md`), HN linkini thread sonuna yanıt olarak ekle. |
| Perş | 15:00–24:00 | Cevap nöbeti: HN + X + LinkedIn. Teknik sorulara hız ve dürüstlük. |

## İlk 48 saat

- HN ön sayfaya girerse: yorum başına maks. 15 dk cevap gecikmesi hedefle;
  savunmacılık yok, "good point, opened an issue" en güçlü cevap.
- Trafik → ElevenLabs/LLM harcamalarını günde 2 kez kontrol et (tavanlar
  devrede ama gözle de bak).
- Gelen PR/issue'lara ilk 24 saatte mutlaka insan cevabı (ilk izlenim kalıcı).
- Metrikler (48. saatte not al): yıldız, fork, HN sırası/puanı, davet kodu
  talebi, LinkedIn erişimi → "ne öğrendik" postunun hammaddesi.

## Başarısızlık senaryosu

HN tutmazsa (çoğu Show HN tutmaz): 2 hafta sonra farklı açıyla tekrar
atılabilir (HN buna izin verir — ör. mimari yazısı açısından). LinkedIn +
davet kodu talepleri zaten bağımsız değer üretiyor; NextLabz build-in-public
serisi malzemesi hazır.
