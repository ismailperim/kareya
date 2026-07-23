# LinkedIn Postu — TR

> **Sıra: HN'den 1-2 gün ÖNCE.** Düşük riskli kanalda momentum + geri
> bildirim topla; HN metnini ona göre rötuşla. Video: tam versiyon (90 sn).
> Kişisel profil'den, sabah 08:30–10:00 arası (TR LinkedIn'in en aktif dilimi).

---

Yıllar içinde 500'e yakın KOBİ web sitesi yaptım. Bir şey hep aynıydı: işin kendisi kod değil, süreçti. Görüşmeler, brief toplamak, "şu yazıyı değiştirebilir miyiz" mesajları…

Son aylarda şunu denedim: ajansın kendisini yazılıma çevirmek. Ortaya Kareya çıktı — ve bu hafta açık kaynak olarak paylaşıyorum.

Nasıl çalışıyor?

🎙️ Müşteri tarayıcıdan görüşme odasına giriyor ve sadece konuşuyor. Yapay zekâ danışman (sesli, Türkçe) 15-30 dakika boyunca doğru soruları sorup brief'i ekranda canlı canlı dolduruyor.

🧑‍💻 Brief onaylanınca Claude o işletmeye ÖZEL gerçek kod yazıyor. Şablon değil: hukuk bürosuna keskin ve kurumsal, mahalle pastanesine sıcak ve samimi bir kompozisyon — aynı sistem, farklı kod.

🛡️ Yazılan her kod önce derleme + içerik kontrolünden geçiyor; geçemezse deterministik bir güvenlik ağına düşüyor. Müşteriye asla bozuk bir şey gitmiyor.

💬 Revizyon = mesaj atmak. "Başlığı değiştir" de yetiyor, "daha premium dursun" da.

📦 Ve en önemlisi: üretilen sitenin kaynak kodu müşterinin malı. İstediği yerde barındırır, kimseye bağımlı kalmaz.

İşin bir de perde arkası var: bu sistemi tek başıma ama bir yapay zekâ geliştirme ekibiyle kurdum — mimari kararlardan kod incelemesine kadar süreci Claude'la yürüttüm, o işletim modeli de repoda duruyor.

Repo (AGPL, self-host edilebilir): https://github.com/ismailperim/kareya

Videoda uçtan uca akış var: sesli görüşme → canlı brief → kod üretimi → yayın → sesli revizyon. 👇

Yorumlara açığım — özellikle "bunu kendi sektörümde nasıl kullanırım" diyenlerle konuşmak isterim.

#yapayzeka #opensource #girişimcilik #webtasarım #claude

---

## Notlar

- İlk saat içinde gelen her yoruma cevap ver (LinkedIn algoritması ilk
  60 dakikaya bakar).
- DM'den "bana da lazım" diyenlere davet kodu akışı hazır (ops → kod üret).
- Repo yıldız sayısı HN sonrası artınca "48 saatte X yıldız" follow-up
  postu at (sosyal kanıt döngüsü).
