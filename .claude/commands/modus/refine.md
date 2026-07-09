---
description: Bir issue'yu refine et — acceptance criteria yaz, gerekiyorsa sub-issue'lara böl, açık soruları çıkar.
argument-hint: <KAR-123>
---

Bir Linear issue'sunu geliştirmeye hazır hale getir.

Hedef: **$1** (boşsa hangi ticket olduğunu sor).

Adımlar:

1. **Oku.** Linear MCP ile issue detayını çek. (MCP araçları yoksa `ToolSearch "linear"` ile yükle.)
2. **`business-analyst` agent'ını çağır.** Şunları üretsin:
   - **Özet** (1-2 cümle): ticket ne istiyor.
   - **Acceptance criteria**: madde madde, test edilebilir.
   - **Sub-issue'lar** (iş büyükse): her biri atomik.
   - **Açık sorular**: belirsizlikler.
3. **Güncelle.** Onay sonrası:
   - Acceptance criteria'yı issue açıklamasına/comment'ine ekle.
   - Sub-issue'ları (varsa) parent'a bağlı, doğru label/öncelik ile oluştur.
   - Açık soru kaldıysa ticket'ı `Todo`'ya alma; soruyu comment olarak bırak.
4. **Özet.** Issue'nun hazır olup olmadığını ve sonraki adımı bildir.

Konvansiyonlar: `docs/process/linear.md`, `docs/process/workflow.md`.
