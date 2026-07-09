# Çalışma Döngüsü (Workflow)

Kareya'da iş, uçtan uca şu döngüyle ilerler. Amaç: her değişikliğin izlenebilir bir Linear ticket'ına ve bir PR'a bağlı olması.

```
Çalışma seansı → ticket → refine → pick up → develop → ship → review → merge → Done
```

## 0. Altın kural

**Her iş bir ticket'tan başlar.** Ticket yoksa önce ticket. İstisna: operating model'in (modus) kendisini düzenleyen meta işler ve trivial yazım düzeltmeleri.

## 1. Çalışma seansı → Ticket'lar

- Seans/planlama notları `docs/meetings/templates/session.md` formatında tutulur (DESIGN §13 backlog'una bağlanır).
- `/modus:meeting-to-tickets` komutu notları alır, **atomik ticket önerileri** üretir.
- Onaydan sonra `po-translator` agent ticket'ları Linear'a yazar (uygun label + öncelik).

## 2. Refine (netleştirme)

- `/modus:refine <KAR-x>` → `business-analyst` agent issue'yu inceler.
- Çıktı: net **acceptance criteria**, varsa **sub-issue**'lar, açık sorular.
- Belirsizlik varsa ticket'ta soru olarak comment'lenir; çözülene kadar **Todo**'da kalır.

## 3. Pick up (işe alma)

- `/modus:ticket <KAR-x>` → MCP ile issue detayını çek.
- Issue state'i **In Progress**'e geçir, kendini assignee yap (yoksa).
- `<type>/kar-<n>-<kisa-baslik>` formatında branch aç (örn. `feature/kar-12-hero-section`), güncel `main`'den.
- Kısa bir başlangıç **comment**'i düş ("Üzerinde çalışmaya başladım, plan: …").
- İşi planla (gerekirse `tech-lead`/`system-architect` ile mimari netleştir).

## 4. Develop (geliştirme)

- İşin türüne göre doğru dev agent: `frontend-dev`, `backend-dev`, `database-dev` + Kareya'ya özel `schema-guardian`, `component-kit-reviewer`, `qa-runner`.
- Acceptance criteria'ya göre uygula; küçük ve odaklı commit'ler at.
- Önemli karar/blocker/yön değişikliğinde ticket'a kısa comment düş.
- Bitince `qa-engineer` ile doğrula (acceptance criteria karşılanıyor mu).

## 5. Ship (teslim)

- `/modus:ship` → değişiklikleri commit + push et.
- PR aç; body'de **`Fixes KAR-x`** ile ticket'ı linkle.
- Issue state'i **In Review**'e geçir.
- PR linkini ticket'a comment olarak ekle.

## 6. Review & Merge

- `code-reviewer` agent + insan PR'ı inceler (güvenlik gereken yerde `security-reviewer`).
- Geri bildirim varsa: düzelt, push'la, tekrar review.
- Merge edilince **Linear PR entegrasyonu issue'yu otomatik `Done` yapar**.
  - Bu yüzden issue'yu **elle Done yapma**.

## Durum ↔ adım eşlemesi

| Adım | Linear state |
|------|--------------|
| Backlog'da bekliyor | Backlog |
| Refine edilmiş, hazır | Todo |
| Üzerinde çalışılıyor | In Progress |
| PR açıldı, review'de | In Review |
| Merge edildi | Done (otomatik) |
| İptal | Canceled |

## Hatırlatmalar

- Tek ticket = tek branch = tek PR (mümkün olduğunca).
- PR küçük tut; büyükse ticket'ı sub-issue'lara böl.
- Konvansiyon detayları: `linear.md`, `git-conventions.md`, `agents.md`.
