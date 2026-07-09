---
description: İşi teslim et — commit + push + PR aç (Fixes KAR-x), ticket'ı In Review yap, PR linkini comment'le.
argument-hint: <opsiyonel: KAR-123 (branch'ten çıkarılamazsa)>
---

Üzerinde çalışılan ticket'ı teslim et.

Ticket: **$1** (boşsa branch adından `KAR-<n>`'i çıkar).

Adımlar:

1. **Doğrula.** Acceptance criteria karşılanıyor mu? Varsa testleri çalıştır; geçmiyorsa **dur** ve bildir. Gerekiyorsa `qa-engineer`/`qa-runner` ile doğrula.
2. **Commit.** Conventional Commits formatında, İngilizce mesaj(lar). Co-author satırını ekle:
   `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
3. **Push.** Mevcut branch'i `origin`'e push et.
4. **PR aç.** `gh pr create` ile. Body'de:
   - `Fixes KAR-<n>`
   - kısa "Ne / Neden / Nasıl test edildi" (bkz. `docs/process/git-conventions.md` PR şablonu).
5. **In Review.** Linear'da ticket'ı `In Review`'e geçir.
6. **Comment.** PR linkini ticket'a comment olarak ekle.
7. **Done'a dokunma.** Merge sonrası Linear otomatik kapatır.

Sonunda: PR linkini ve ticket'ın yeni durumunu özetle.
