# Kareya — AI-Kadrolu Web Ajansı: Sistem Tasarımı

> Durum: tasarım dokümanı (2026-07-08). Faz (a) = insan-satışlı, AI-kaldıraçlı ajans; Faz (b) = sesli intake otomasyonu.
> Kurucu avantajı: 500+ kurumsal site deneyimi, mevcut hosting müşteri tabanı, CMS yazma geçmişi, DevOps/n8n uzmanlığı.
> Araştırma dayanağı: global + TR derin araştırma (builder.ai dersleri, TR fiyat/pazar, Türkçe voice AI durumu) — bkz. memory/project_indie_next.

## 1. Tasarım ilkeleri

1. **Ajans iş akışını kopyala, aşamaları ajanlaştır.** Sistem baştan sona bir pipeline: Intake → Teklif → Üretim → Revizyon → Yayın → Bakım. Her aşama önce insanlı, sonra ajanlı — mimari her insan adımını değiştirilebilir tasarlar ("ajanlaşma merdiveni").
2. **AI karar verir, altyapıya deterministik kod dokunur.** LLM içerik/tasarım/parse işleri yapar; DNS, deploy, fatura, fiyat HER ZAMAN kural tabanlı.
3. **Sınırlı ürün:** 4-5 site arketipi (kurumsal tanıtım, hizmet+iletişim, restoran/menü, portfolyo, landing). Arketip = tasarım sistemi, tema değil. builder.ai dersi: sınırsız scope = ölüm.
4. **Revizyon sözleşmeyle sınırlı:** 2 tur dahil, 3.+ tur ücretli. İnsan-kuyruk maliyeti işletmenin kaderi — kontratla yönetilir.
5. **Her şey ölçülür:** aşama başına insan-dakikası günlük kaydedilir. Bu metrik "startup mı lifestyle mı" kararını verecek.

## 2. Mimari

```
                        kareya.app (Next.js / CF Pages)
                 pazarlama + müşteri portalı + preview linkleri
                                    │
   INTAKE                           ▼
   Faz a: İsmail (tel/WhatsApp) ──► BRIEF JSON ◄── Faz b: Sesli ajan (10-15 dk
   + yapılandırılmış form           (şema §3)      yapılandırılmış görüşme, TR)
                                    │
   TEKLİF                           ▼
   Fiyat matrisi (kural!) + LLM anlatı → teklif sayfası + click-accept
   + iyzico kapora linki            │
                                    ▼
   ORKESTRASYON ÇEKİRDEĞİ — "Ajans OS" (Faz a: n8n + Supabase)
   Proje state machine: BRIEF→PROPOSED→ACCEPTED→BUILDING→QA→
   CLIENT_REVIEW→REVISION(≤2)→LAUNCH_PREP→LIVE→CARE
   Her geçiş event üretir; ajanlar event'lere abone.
                                    │
   ÜRETİM                           ▼
   Kendi şablon sistemi (Astro/Next + Tailwind + section komponent kiti)
   İçerik = yapılandırılmış JSON/MD ("CMS v3" — İsmail'in 3. nesil CMS'i)
   Ajanlar: içerik yazarı · tasarım seçici (palet/tipografi) · section
   dizici · görsel pipeline (logo temizlik, Pexels stok, OG/favicon üretimi)
   Her site = git repo → build → CF Pages preview URL
                                    │
   REVİZYON                         ▼
   Müşteri preview + WhatsApp sesli/yazılı geri bildirim → LLM parse →
   ticket item'ları → ajan uygular → yeni preview (tur sayacı)
                                    │
   YAYIN                            ▼
   Domain (.com.tr TRABİS) + DNS/CF + SSL → CertWarden izler (dogfood!)
   + hafif KVKK-uyumlu analytics + Google Business kurulumu (upsell)
                                    │
   BAKIM (MRR)                      ▼
   ₺1-2K/ay: hosting + Upti uptime izleme (dogfood!) + WhatsApp'tan içerik
   değişikliği ("fiyat listesini güncelle" → ajan JSON'u düzenler → deploy)
   + aylık otomatik rapor
```

## 3. Brief JSON — sistemin sözleşmesi

Intake'in çıktısı, üretimin girdisi. İnsan da doldursa ses ajanı da doldursa aynı şema:

```json
{
  "business": { "name": "", "sector": "", "region": "", "phone": "", "instagram": "" },
  "archetype": "kurumsal | hizmet | restoran | portfolyo | landing",
  "pages": ["anasayfa", "hakkimizda", "hizmetler", "iletisim"],
  "brand": { "logoUrl": null, "colors": "var/yok/tercih", "tone": "kurumsal|samimi|premium" },
  "references": ["begendigi-site-1.com"],
  "content_sources": { "existing_site": null, "instagram": true, "provided_text": [] },
  "features": ["form", "harita", "whatsapp-butonu", "randevu-linki"],
  "care_plan": "none | basic | pro",
  "budget_band": "10-15K | 15-25K | 25K+",
  "deadline": "2 hafta",
  "notes_transcript": "görüşme özeti/transkript"
}
```

## 4. Ajanlaşma merdiveni (faz a → b geçişi, veri toplandıkça basamak basamak)

| Basamak | İnsandan ajana devredilen | Tetik/kanıt |
|---|---|---|
| 0 (bugün) | Üretimin ~%70'i (içerik, section dizimi, görsel, deploy) | — |
| 1 | Görüşme notu → Brief JSON (Whisper transkript + parse) | İlk 5 görüşme kaydından |
| 2 | Teklif taslağı otomatik | Fiyat matrisi 10 projede oturunca |
| 3 | WhatsApp revizyon taleplerini ajan işler | Revizyon tipleri kataloglanınca |
| 4 | **Mesai dışı** sesli intake (gece gelen lead'ler — düşük risk overflow) | Kendi çağrılarınla script netleşince |
| 5 | Tam otonom intake + insan istisna kuyruğu | AI-intake dönüşümü ≥ insan'ın %60'ı (A/B) |

Kayıt disiplini: **Faz (a)'daki her keşif görüşmesi kaydedilir** (KVKK bildirimli) — bunlar 4-5. basamağın eğitim datası ve script'i.

## 5. Fiyatlandırma (TR araştırma verisine dayalı)

- Kurulum: arketipe göre **₺12.500 / ₺18.500 / ₺27.500** (pazar: freelancer ₺5K — ajans ₺65K; konum: "ajans kalitesi, yarı fiyat, 1 hafta teslim")
- Bakım: **Basic ₺990/ay** (hosting+SSL+uptime+küçük değişiklik 2/ay) · **Pro ₺1.990/ay** (+içerik güncellemeleri, aylık rapor, öncelik)
- Revizyon: 2 tur dahil; sonrası ₺1.500/tur
- Kapora: %40 iyzico link, kalan yayında. e-Arşiv: Paraşüt entegratör.

## 6. Ölçüm (yatırımcı-hazır enstrümantasyon, gün 1'den)

Site başına: **aşama başına insan-dakikası** (KRİTİK metrik) · AI maliyeti · revizyon tur sayısı · intake→teklif→kabul dönüşümü · teslim süresi · bakım churn. Hedefler: insan ≤4 saat/site medyan; kabul ≥%40; churn <%3/ay.

## 7. Fazlar

**Faz a0 (bu hafta):** doktor hediye sitesi = müşteri sıfır — şablon sisteminin ilk arketipi bununla doğar.
**Faz a1 (ay 1-2):** şablon kiti (2 arketip) + n8n orkestrasyon iskeleti + teklif/kapora akışı. İlk 3-5 ücretli müşteri: **mevcut hosting müşterileri + arkadaşın ajans ağı** (sıfır CAC!).
**Faz a2 (ay 3-6):** 20 site hedefi, merdiven 1-3, metrik toplama. NextLabz "ajansımı AI çalıştırıyor" serisi başlar (build-in-public = pazarlama).
**Faz b (ay 6+, kill kriteri geçilirse):** sesli intake (ElevenLabs Agents/Vapi TR, 10-15 dk yapılandırılmış), A/B, yatırım hikâyesi değerlendirmesi.

**Kill kriterleri (baştan yazılı):** 20 site sonunda bakım churn yüksek VEYA görüşmeler sistematik olarak 45+ dk yapılandırılamaz pazarlık VEYA medyan insan-saati 8+/site → startup değil, kârlı yan iş olarak devam.

## 8. Agent Mimarisi (teknik tasarım)

### 8.0 İki temel karar

**A) Workflow-driven, agent'lı — agent-driven değil.** Kontrol akışının sahibi state machine (§2); agent'lar aşamalarda çağrılan, girdisi-çıktısı şemayla sabitlenmiş stateless işçiler. Hiçbir agent "sırada ne var" kararı vermez. Neden: tahmin edilebilir maliyet, resume edilebilir job'lar, debug edilebilir hatalar. (Otonom sürü, demo'da havalı, production'da borç.)

**B) Site = kod değil, VERİ.** Her site tek bir **Site JSON** dokümanı: sayfalar → section listesi → section props + içerik + marka token'ları. Şemayla valide edilir. **Renderer deterministik**: Site JSON + komponent kiti → Astro build. LLM asla ham HTML/CSS üretmez.
Kazanımlar: revizyon = JSON patch (diff'lenebilir, geri alınabilir, ucuz) · QA = şema + görsel · kod enjeksiyonu imkânsız · kalite tabanı komponent kitinden (500-site zanaatının kodlanmış hali) · builder.ai'nin "sınırsız üretim" ölümünün panzehiri.

### 8.1 Agent kadrosu

| Agent | Girdi → Çıktı | Model sınıfı | İnsan kapısı |
|---|---|---|---|
| **Brief Analyst** | görüşme transkripti / form → Brief JSON (şema-valide) | orta | Faz a1: İsmail onaylar |
| **Proposal Writer** | Brief + fiyat matrisi çıktısı (fiyatı KURAL hesaplar) → teklif anlatısı | orta | gönderim onayı (kalıcı olabilir) |
| **Art Director** | Brief → marka token'ları: palet + tipografi + görsel mood. **Kürasyonlu kütüphaneden SEÇER, icat etmez** (ui-ux-pro-max tarzı palet/font kataloğu) | güçlü | — |
| **Content Writer** | Brief + arketip + section iskeleti → TR copy (section bazında, ton kontrollü, temel SEO) | güçlü | — |
| **Site Assembler** | Brief + arketip + içerik + token'lar → **Site JSON** (kit içinden section seçer, props doldurur) | güçlü | — |
| **Renderer** | Site JSON + kit → build + preview URL | **LLM YOK** | — |
| **QA süiti** | preview → görsel QA (Playwright screenshot + vision model: taşma, kontrast, mobil kırılma) · içerik QA (imla, ton, yasal metinler) · teknik QA (link/form/Lighthouse, deterministik) | vision + ucuz | Faz a: müşteriye gitmeden İsmail bakar |
| **Revision Interpreter** | müşteri WhatsApp sesli/yazılı feedback → **ChangeOps[]** (tipli patch listesi, aşağıda) | orta | belirsizse insana eskale |
| **Comms Agent** | proje durumu → müşteri mesajları (WhatsApp şablonları, durum güncellemeleri) | ucuz | Faz a: onaylı gönderim |
| **Care Agent** | bakım talepleri ("fiyat listesini güncelle") → ChangeOps + aylık rapor (Upti/CertWarden verisiyle) | ucuz/orta | eşik üstü değişiklikte onay |
| **Intake Voice Agent** (Faz b) | canlı Türkçe görüşme → Brief JSON slot-filling | realtime voice | istisna kuyruğu |

Maliyet hedefi: site başına toplam LLM+vision **<$10** (parse/patch işleri ucuz modele, copy/tasarım güçlü modele — model routing).

### 8.2 ChangeOps — revizyon dili

Müşteri geri bildirimi serbest metin; sisteme girişi **tipli operasyon**:

```json
[
  { "op": "replace_text", "target": "pages.home.hero.title", "value": "..." },
  { "op": "swap_section", "page": "home", "from": "hero-video", "to": "hero-image" },
  { "op": "change_palette", "value": "palette-terra-04" },
  { "op": "add_page", "archetype_page": "sss" },
  { "op": "OUT_OF_SCOPE", "note": "e-ticaret istiyor → insana eskale + ek teklif" }
]
```

Revizyon turu sayacı ChangeOps batch'i üstünden işler; `OUT_OF_SCOPE` op'u scope-creep'i otomatik yakalayıp ek-teklif akışına atar (builder.ai dersi #2'nin koda dökülmüş hali). Uygulanan her batch → rebuild → müşteriye diff özeti ("3 değişiklik yapıldı: ...").

### 8.3 Doğrulama döngüleri

1. Her agent çıktısı **şema validasyonundan** geçer; geçmezse hata mesajıyla retry (max 2), sonra istisna kuyruğu.
2. QA süiti müşteri-öncesi **kapı**: görsel + içerik + teknik üçü yeşil olmadan CLIENT_REVIEW'a geçilmez.
3. İnsan kapıları kaldırılabilir tasarlanır: her kapı için "son N projede müdahale oranı" ölçülür; %5 altına düşen kapı otomatiğe alınır. **Ajanlaşma merdiveni (§4) böyle veriyle tırmanılır, hisle değil.**

### 8.4 Altyapı eşlemesi

| Katman | Faz a seçimi | Not |
|---|---|---|
| Orkestrasyon | **n8n** (self-host) + Supabase (state) | İsmail'in zanaatı; NextLabz içeriği bonus. Faz b'de gerekirse Temporal/Inngest'e taşınır — state machine tanımı taşınabilir tutulur |
| DB / Auth / Storage | Supabase (Postgres + RLS) | proje kaydı, Brief, Site JSON versiyonları, ChangeOps log |
| Build & hosting | Site JSON → Astro build → **Cloudflare Pages** (site başına proje) | statik çıktı ≈ sıfır marjinal hosting maliyeti; bakım marjını bu taşır |
| Agent runtime | Node/TS worker'lar + Claude API (Agent SDK), job queue | build/QA gibi uzun işler küçük bir VPS/Hetzner runner'da |
| QA | Playwright + vision model + Lighthouse CI | screenshot'lar Site JSON versiyonuna bağlanır |
| Sesli intake (Faz b) | ElevenLabs Agents veya Vapi (TR) — **satın al, yazma** | slot-filling Brief şemasına karşı; KVKK açılış anonsu; karışıklıkta insana devir |
| Müşteri iletişimi | WhatsApp Business API (Meta/Twilio) | TR KOBİ'nin yaşadığı yer |
| Ödeme/fatura | iyzico link + Paraşüt e-Arşiv | kural tabanlı, LLM'siz |

**Al/yap çizgisi:** ses altyapısı, ödeme, hosting → satın al. Komponent kiti + Site JSON şeması + orkestrasyon + ChangeOps → **yap, moat burası.**

### 8.5 Görüşme Odası ("Meeting Room") — sesli katmanın asıl tasarımı

Kurucunun vizyonu (2026-07-08): telefon değil, **planlı tarayıcı-içi görüşme**. Akış: kayıt → mini ön-brief formu (sektör, logo var mı, referans) → takvimden slot seç → görüşme saatinde kareya.app'te görüşme odası → AI ajanla sesli görüşme → istekler belirlenir → teklif. Review aşamasında aynı oda: ajan **yapılan işi sunar**.

**Neden telefon aramasından üstün:**
- Telefoni yok (Twilio/numara/santral derdi sıfır), maliyet sadece WebRTC + model
- KVKK: görüşmeye katılmadan önce açık onay ekranı (telefonda anons etmekten çok daha temiz)
- Planlı slot = müşteri beklentisi ayarlı + ajan hazırlıklı girer (ön-brief elinde)
- **Ekran var** → review meeting mümkün oluyor

**Oda bileşenleri:**
1. **Ses oturumu** (WebRTC) — vendor-agnostik `MeetingSession` soyutlaması arkasında
2. **Canlı Brief Paneli** — ajanın `update_brief(field, value)` tool-call'ları müşterinin gözü önünde forma işlenir ("notlarımı alıyor" güven UX'i); görüşme sonunda müşteri paneli onaylar → Brief JSON kesinleşir
3. **Ajanda çubuğu** — yapılandırılmış görüşme adımları görünür (10-15 dk disiplini kendiliğinden)
4. **Review modunda: ajan-güdümlü co-browse** — preview iframe'i; ajan konuşurken tool-call ile gezdirir: `show_page("hakkimizda")`, `scroll_to("services")`, `highlight_section(...)` → postMessage ile iframe'e komut. "Şimdi hizmetler bölümüne bakalım" derken sayfa oraya kayar. **Kimsede olmayan deneyim bu.**
5. **"İnsanla devam et" butonu** — her an görünür (güven + eskalasyon)

**Vendor kararı (spike ile verilecek, ikisi de 1'er günlük POC):**

| | ElevenLabs Agents | OpenAI Realtime (gpt-realtime) |
|---|---|---|
| TR ses kalitesi | En iyi (Flash v2.5, ~75ms) | İyi, ses seçeneği az |
| Turn-taking/kesme | Platform halleder | Server VAD, yeterli |
| Tool calling | Var | Native, güçlü |
| Entegrasyon | Hazır widget (en hızlı yol) | WebRTC native, UI bize ait |
| Beyin | BYO-LLM mümkün | Model+ses tek vendor |
| Maliyet | ~$0.08-0.10/dk | ~benzer bant |

`MeetingSession` soyutlaması iki vendor'ı da aynı arayüze indirger (ses + tool-call event'leri) → vendor kilidi yok. DIY (STT+LLM+TTS kendi turn-taking) = YAPMA; turn-taking satın alınır.

**Güvenlik & eskalasyon tasarımı:**
- Görüşme linki hesaba bağlı tek-kullanımlık token; oda auth'suz açılmaz
- **In-call ajanın yetkisi dar:** brief toplar, brief paneli günceller, sayfada gezdirir — **fiyat hesaplayamaz, indirim veremez, taahhüt veremez** (fiyat matrisi server-side; teklif backend'de üretilir, Faz a'da insan onayıyla gider). Prompt injection müşteri sesinden gelse bile tool yüzeyi zararsız
- Her tool-call server-side şema+yetki validasyonundan geçer (meeting tipine göre tool allowlist)
- Eskalasyon: ajan karışıklık/öfke/kapsam-dışı algılarsa → "uzmanımız sizi arasın" + ticket; buton her zaman görünür
- Kayıt + transkript saklama: onay ekranında açık; VERBİS envanterine işlenir

**Faz a hilesi — oda gün 1'de yaşar, içinde insan olur:** aynı görüşme odası UI'ı (takvim, brief paneli, co-browse) ilk günden kurulur; ses koltuğunda **İsmail** oturur. Müşteri deneyimi aynı, brief paneli İsmail'in ekranında dolar. Böylece: (1) ürün deneyimi baştan var, (2) İsmail'in görüşmeleri kayıt + transkript olarak ajanın script/eval setini üretir, (3) ajan hazır olduğunda koltuk değişir — müşteri akışı değişmez. Merdiven §4 bununla fiziksel hale gelir.

### 8.6 PRD'ye kalan kararlar

- [ ] Arketip v1 listesi + her arketipin section envanteri (öneri: 2 arketiple başla — "hizmet işletmesi" ve "kurumsal tanıtım"; doktor sitesi ilkini doğurur)
- [ ] Site JSON şemasının v1'i (Brief şemasıyla birlikte — sistemin iki sözleşmesi)
- [ ] Komponent kiti stack'i: Astro + Tailwind onayı; section adlandırma konvansiyonu
- [ ] Palet/tipografi kütüphanesi kaynağı (kürasyonlu ~40 palet + ~20 font eşleşmesi yeter)
- [ ] Fiyat matrisi (arketip × sayfa sayısı × feature'lar → ₺)
- [ ] QA rubrik'i: görsel QA'nın "geçti" tanımı (madde madde)
- [ ] WhatsApp Business API onboarding (Meta süreç 1-2 hafta — erken başla)

## 9. Açık maddeler

1. **Ortaklık:** mevcut ajans arkadaşının rolü — insan güven-köprüsü/satış mı? Aynı girişimin devamı mı, yeni yapı mı? Pay? (Pabula dersleri: baştan yazılı.)
2. Marka: kareya.app portal; kareya.com.tr alınacak (TR güveni için). TÜRKPATENT başvurusu sınıf 42'ye bu kapsamla yapılmalı.
3. Şablon stack son kararı: Astro (içerik siteleri için hızlı/ucuz) vs Next.js (Kareya-photo PRD'siyle ortaklık). Öneri: **Astro** — statik çıktı, CF Pages'te bedava ölçek.
4. KVKK: çağrı kaydı bildirimi + müşteri verisi işleme envanteri.
5. Fotoğrafçı SaaS PRD'si (prds/kareya.md) isimsiz-park — 6 ay sonra yeniden değerlendir.

---

## 10. Araştırma özeti (kendi kendine yeten kayıt — 2026-07-08)

**Global:** DFY sesli-intake ajans konsepti dünyada yok. En yakınlar: B12 ($199-399/ay DFY-hibrit, yıllardır durgun), Wegic (chat "AI ekibi", 2.5M kullanıcı), 10Web agentic builder, Durable. Sesli intake hukuk/ev hizmetlerinde olgun ($0.07-0.15/dk) ama üretimle kimse birleştirmemiş. a16z 2026 fikir listelerinde "AI website builds (not a website builder)" kelimesi kelimesine var; Sequoia "sell the work" tezi fonlanıyor ama yüksek-ACV verticallerde (Crosby hukuk $60M B). Web sitesi tek-seferlik artifact = VC ACV elemesine takılır → **global VC-scale kapı dar; TR productized servis penceresi açık.** Lovable ($400-500M ARR) alttan DIY fiyat baskısı yapıyor.
**builder.ai dersleri** ($445M → 2025 iflas): otomasyon %'sinde dürüstlük, sınırlı scope, revizyon sınırı sözleşmede, "AI builds your app" cümlesi yatırımcıda yanık.
**TR:** kurumsal site ₺5-65K + bakım alışkanlığı ₺500-10K/ay mevcut; 1M+ websitesiz işletme; sesli-intake yapan yok. Türkçe voice AI: yapılandırılmış 10-15 dk görüşme için hazır, 30 dk serbest form kanıtsız. Trust köprüsü: AI çalışır, insan (WhatsApp) kapatır/tahsil eder. KVKK: görüşme kaydı açık onayla.
**Ekonomi:** ses ₺100-200/görüşme, AI üretim $10-50/site — önemsiz. **İnsan kuyruğu (revizyon döngüleri, mutsuz müşteri) tüm maliyet yapısıdır** → ChangeOps + tur sınırı bu yüzden mimari çekirdekte.

## 11. GTM — ilk müşteriler (sıfır CAC)

1. **Müşteri 0:** çocuk doktoru (hediye) → arketip #1 doğar + portföy parçası + NextLabz içeriği
2. **Müşteri 1-5:** mevcut hosting müşterileri (yenileme/upgrade teklifi) + arkadaşın ajans ağı
3. **Müşteri 6-10:** ilk müşterilerin referansları + NextLabz build-in-public izleyicisi
4. Ölçekli kanal (sonra): "1 haftada ajans kalitesinde site" konumu, Armut/Bionluk değil — kendi markası + içerik

## 12. Non-goals taslağı (İsmail onaylayacak)

Kareya YAPMAZ: e-ticaret siteleri · özel web uygulamaları/SaaS geliştirme · logo/kurumsal kimlik tasarımı (hazır logo alınır; yoksa basit wordmark üretimi sınırlı hizmet) · SEO retainer/reklam yönetimi · mobil uygulama. Şüphede kural: **otomasyon yüzdesini düşürecek her iş = hayır** (OUT_OF_SCOPE op'una güven).

## 13. Çalışma seansları backlog'u (build öncesi/paralel)

| Seans | Çıktı | Not |
|---|---|---|
| Fiyat matrisi çıkarma | arketip × sayfa × feature → ₺ tablosu + teklif şablonu | İsmail'in 500-site sezgisi kurallara dökülür — İLK SEANS |
| Non-goals onayı | §12 kesinleşir | 15 dk |
| İlk-10-müşteri listesi | isim + sıra + mesaj taslağı | bir akşam |
| Hosting migration kararı | eski PHP/.NET siteler yeni stack'e taşınacak mı, takvimi | gelir + test alanı vs legacy yük |
| Brief JSON + Site JSON şema v1 | iki sözleşme dosyası | build session'ın ilk işi |
| Entity/fatura | hangi tüzel yapı kesecek | ilk ücretli müşteriden önce |

## 14. Build session kurulum notları

- **Subagents/skills bu repoda kurulacak** (yeni session'da): önerilen özel agent'lar — `schema-guardian` (Brief/Site JSON değişikliklerini şemalarla tutarlı tutar), `component-kit-reviewer` (yeni section'ların kit konvansiyonlarına uyumu), `qa-runner` (Playwright + vision görsel QA orkestrasyonu). Genel kod-review/TDD için ECC plugin eklenebilir — ama GateGuard kapalı kurulmalı (perim.net deneyimi).
- **Geliştirme modeli:** ana build oturumları Opus 4.8 veya Fable 5 (en güçlü mevcut); toplu/tekrarlı işler (section varyantı üretimi, içerik doldurma) Sonnet 4.6 yeterli ve ucuz.
- **Üründeki modeller (runtime, ayrı karar):** model routing §8.1 — parse/patch işleri Haiku-sınıfı, copy/art-direction Sonnet-sınıfı, görsel QA vision. Site başına <$10 hedefi bu routing ile tutar.

## 15. Karar kaydı

- **2026-07-08: GO kararı.** Kareya-ajans = indie ana proje. Foto-SaaS derin park (PRD perim.net'te). Agri veri turu pasif devam (besidefteri feedback'leri birikiyor). NextLabz haftalık ritim korunur; bu build kanalın içerik serisi.
- kareya.app alınmış; kareya.com.tr + TÜRKPATENT sınıf 42 yapılacak.
- WhatsApp Business API başvurusu erken tetiklenecek (Meta 1-2 hafta).
