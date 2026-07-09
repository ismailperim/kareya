---
description: Çalışma seansı / planlama notlarını atomik Linear ticket önerilerine çevir; onaydan sonra Linear'a yaz.
argument-hint: <notları yapıştır veya dosya yolu ver>
---

Seans/planlama notlarını Linear ticket'larına dönüştür.

Girdi: **$ARGUMENTS** (boşsa, notları yapıştırmamı iste veya `docs/meetings/` altındaki ilgili dosyayı oku).

Adımlar:

1. **`po-translator` agent'ını çağır.** Notları ona ver.
2. **Öneri listesi.** Agent şu formatta ticket önerileri üretsin:
   `Başlık | Alan | Tip | Öncelik | Acceptance (taslak)` + varsa "Açık sorular".
3. **Onay al.** Listeyi kullanıcıya göster. **Onay olmadan Linear'a yazma.** Kullanıcı düzenleyebilir.
4. **Yaz.** Onaylananları Linear MCP ile **KAR** team'ine oluştur; doğru alan+tip label + öncelik ata. (MCP araçları yoksa `ToolSearch "linear"` ile yükle; bağlantı yoksa kullanıcıdan `/mcp` ile login istemesini söyle.)
5. **Özet.** Oluşturulan ticket'ları `KAR-<n> — başlık` listesi olarak bildir.

Konvansiyonlar: `docs/process/linear.md`, `docs/meetings/templates/session.md`.
