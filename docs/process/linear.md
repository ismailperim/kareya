# Linear Konvansiyonları

Kareya'nın proje yönetimi Linear üzerinden yapılır. Claude, Linear MCP (`linear`) ile ticket okur/yaratır, durum değiştirir ve comment atar.

## MCP kurulumu

- Config repoda: `.mcp.json` → server adı `linear`, remote HTTP (`https://mcp.linear.app/mcp`).
- İlk kullanımda `/mcp` ile **OAuth login** (kullanıcının manuel adımı, bir kez). Aynı Linear workspace'i başka repolarda da kullanıldıysa yetki taşınmış olabilir.
- Araçları görmek için: `ToolSearch "linear"` → issue create/update/list, comment, vb.

## Team / proje

- Team key: **`KAR`** (issue'lar `KAR-123` formatında). *Kurulumda MCP ile doğrula; farklıysa bu dosyayı, `git-conventions.md`'yi ve `.claude/commands/modus/*`'ı güncelle.*
- Tek aktif proje ile başlıyoruz; alanlar **label** ile ayrılır.

## State akışı

```
Backlog → Todo → In Progress → In Review → Done
                                     └────→ Canceled
```

| State | Anlamı |
|-------|--------|
| **Backlog** | Henüz refine edilmemiş, sıraya alınmamış. |
| **Todo** | Refine edilmiş, acceptance criteria net, başlanmaya hazır. |
| **In Progress** | Aktif çalışılıyor (branch açık). |
| **In Review** | PR açıldı, review bekliyor. |
| **Done** | Merge edildi (PR entegrasyonu **otomatik** yapar). |
| **Canceled** | Yapılmayacak. |

## Label'lar

**Alan:** `portal` (kareya.app: pazarlama + müşteri portalı + preview) · `component-kit` (Astro+Tailwind section kiti) · `orchestration` (n8n + Supabase state machine) · `meeting-room` (görüşme odası, WebRTC, brief paneli, co-browse) · `agents-runtime` (DESIGN §8.1 ürün ajanları: Brief Analyst, Site Assembler, Renderer…) · `schemas` (Brief JSON + Site JSON + ChangeOps) · `infra` (CF Pages, deploy, DNS/SSL, devops) · `billing` (iyzico + Paraşüt e-Arşiv) · `product` · `marketing`

**Tip:** `feature`, `bug`, `chore`, `spike`

**Öncelik:** Linear'ın yerleşik Priority alanı (Urgent/High/Medium/Low).

> Label'lar Linear tarafında bir kez oluşturulur. Yoksa `po-translator`/insan oluşturur; bu liste kaynak referanstır.

## Claude'un MCP davranış kuralları

1. **Okuma serbest:** issue listeleme/okuma her zaman yapılabilir.
2. **In Progress:** sadece `/modus:ticket` ile işe alındığında ve branch açıldığında.
3. **In Review:** sadece PR açıldıktan sonra.
4. **Done'a elle dokunma:** merge sonrası PR entegrasyonu hallediyor.
5. **Comment ne zaman:** başlangıç, önemli karar, blocker, soru, PR linki. Kısa ve net Türkçe.
6. **Assignee:** işe alınca kendini/ilgili kişiyi assignee yap.
7. **Yeni ticket yaratma:** yalnızca `/modus:meeting-to-tickets` veya `/modus:refine` (sub-issue) bağlamında, **kullanıcı onayıyla**. Spontane ticket açma.

## Comment ile kontrol (talimat kanalı)

Ticket comment'leri sadece kayıt değil, aynı zamanda **talimat kanalıdır**. `/modus:ticket <KAR-x>` çalıştığında son comment'leri okur ve niyeti anlayıp doğru aksiyona yönlendirir. Böylece sen/ortaklar Linear'dan iş akışını sürebilir.

Tanınan niyetler (doğal dil, bu ifadeler örnek):
- **Ship** — "ship edelim", "gönder", "PR aç", "bu hazır" → `/modus:ship` akışı. **Push + PR dışa dönük** olduğu için Claude başlatmadan önce ne göndereceğini özetler ve **onay alır**.
- **Düzeltme/feedback** — "şunu değiştir", "şu eksik", review/acceptance dönüşü → mevcut branch'te düzeltmeye geçer.
- **Refine** — "kapsam net değil", "kriterleri yazalım" → `/modus:refine` akışı.

Kurallar:
- Belirsiz/tartışma comment'i talimat sayılmaz; Claude ne anladığını söyler ve sorar.
- Geri alınamaz/dışa dönük adımlar (ship, merge) **her zaman onaya tabidir**.
- Talimat genelde son comment'tedir; çelişki varsa en güncel olanı esas al, gerekiyorsa sor.

## Branch & PR linkleme

- Branch adı `<type>/kar-<numara>-<kisa-baslik>` formatındadır (örn. `feature/kar-12-hero-section`); detay `git-conventions.md`. Linear'ın kullanıcı-prefix'li magic branch adını kullanmayız.
- PR body'sinde **`Fixes KAR-123`** (veya `Closes`) → merge'de issue otomatik kapanır.
- Linear'ın GitHub entegrasyonu branch/PR'ı issue'ya otomatik bağlar: branch'te `kar-<n>` geçmesi veya PR'daki `Fixes KAR-x` yeterli.

## İyi ticket nasıl olur

- **Atomik:** tek bir sonuç/değişiklik.
- **Test edilebilir:** acceptance criteria yazılabiliyor.
- **Bağımsız:** mümkünse başka ticket'ı beklemeden ilerleyebilir.
- Büyükse → sub-issue'lara böl (`/modus:refine`).
