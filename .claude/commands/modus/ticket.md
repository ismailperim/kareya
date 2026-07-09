---
description: Bir Linear ticket'ını işe al — detayı çek, In Progress yap, branch aç, planla.
argument-hint: <KAR-123 | boş bırak ve seç>
---

Bir Linear ticket'ını işe alıp geliştirmeye hazırla.

Hedef ticket: **$1** (boşsa, bana atanmış/Todo ticket'ları Linear'dan listele ve hangisini alacağımı sor).

Adımlar:

1. **Detayı çek.** Linear MCP ile ticket'ı oku: başlık, açıklama, acceptance criteria, label, durum **ve son comment'ler**. (MCP araçları yoksa `ToolSearch "linear"` ile yükle. Bağlantı yoksa kullanıcıdan `/mcp` ile login istemesini söyle.)
2. **Niyeti oku — son comment'ler ne istiyor?** Bu komut tek giriş noktasıdır: ticket'ın durumuna **ve son comment'lerdeki talimata** göre doğru aksiyona yönlendir. Comment'lerde açık bir talimat varsa:
   - **Ship niyeti** (örn. "ship edelim", "gönder", "PR aç", "bu hazır") → işi **`/modus:ship` akışına** devret. Push + PR dışa dönük olduğu için **başlatmadan önce ne göndereceğini özetle ve onay al.**
   - **Düzeltme/feedback** (review/acceptance dönüşü veya ortak isteği) → son comment'lerden **ne istendiğini çıkar ve özetle**, düzeltmeye geç.
   - **Belirsiz/tartışma** comment'i → talimat sayma; ne anladığını söyle, kullanıcıya sor.
3. **Yeni mi, devam mı? — durumu tespit et.**
   - **Magic branch zaten var mı?** (`git branch --list`, `git ls-remote --heads origin`) Varsa o branch'e **checkout** et — **yeni branch açma**.
   - Ticket `In Review`/`Done`'dan geri döndüyse, gerekiyorsa state'i tekrar `In Progress`'e al.
   - İş **zaten sürüyorsa** (In Progress, branch açık): mevcut branch'te kal, yeni isteği mevcut işe ekle.
4. **Hazır mı kontrol et (yalnız ilk işe almada).** Acceptance criteria yok/belirsizse önce `/modus:refine` öner — netleşmeden koda başlama. Devam/feedback senaryosunda atla.
5. **State + assignee.** İlk işe almada `In Progress`'e geçir, assignee boşsa ata. Devam senaryosunda yalnızca gerekiyorsa state'i düzelt.
6. **Branch.** Yoksa `<type>/kar-<n>-<kisa-baslik>` formatında aç (type = işin türü: `feature`/`fix`/`chore`…, ticket tip label'ıyla uyumlu), güncel `main`'den. Varsa sadece checkout et. Linear'ın kullanıcı-prefix'li magic branch adını kullanma; `kar-<n>` branch'te geçtiği için otomatik bağlanır.
7. **Comment.** Ne yapacağını kısa bir comment'le bildir: ilk işe almada "Başladım, planım: …"; geri dönüşte "Feedback alındı, şunu düzeltiyorum: …".
8. **Planla (geliştirme gerekiyorsa).** İşin türüne göre doğru dev agent'ı belirle (`docs/process/agents.md`); gerekiyorsa `tech-lead`/`system-architect`/`business-analyst` devreye gir. Kısa bir uygulama planı sun. (Niyet ship ise bu adımı atla, doğrudan `/modus:ship`.)

Konvansiyonlar: `docs/process/workflow.md`, `docs/process/linear.md`, `docs/process/git-conventions.md`.
