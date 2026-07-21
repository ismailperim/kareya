// Demo Site JSON fixture (KAR-32) — a full generated site for the preview until
// the Brief → Site JSON assembler (KAR-33) produces one live.
export const DEMO_SITE = {
  meta: {
    businessName: "Denge Beslenme",
    title: "Denge Beslenme — Diyetisyen Kliniği",
    description: "Sağlıklı yaşama birebir eşlik eden diyetisyen kliniği",
  },
  brand: { primary: "#0EA5E9", accent: "#22D3EE", tone: "samimi" },
  pages: [
    {
      path: "/",
      title: "Anasayfa",
      sections: [
        {
          type: "hero",
          headline: "Sağlıklı yaşama birebir eşlik ediyoruz",
          subheadline:
            "Kadıköy'deki kliniğimizde, size özel beslenme programı ve haftalık takiple hedeflerinize güvenle ulaşın.",
          ctaLabel: "Ücretsiz ön görüşme al",
          ctaHref: "#iletisim",
        },
        {
          type: "services",
          title: "Hizmetlerimiz",
          items: [
            { name: "Kilo Yönetimi", description: "Kişiye özel, sürdürülebilir kilo verme ve koruma programları." },
            { name: "Sporcu Beslenmesi", description: "Performansınızı destekleyen, hedefe yönelik beslenme planları." },
            { name: "Çocuk Beslenmesi", description: "Ailelere rehberlik eden, sağlıklı büyüme odaklı programlar." },
          ],
        },
        {
          type: "about",
          title: "Hakkımızda",
          body:
            "8 yıldır Kadıköy'de, danışanlarımıza birebir eşlik ediyoruz. Bizim için beslenme; kısa süreli diyetler değil, hayat boyu sürdürülebilir alışkanlıklar demek. Her danışanımızı haftalık kontrollerle takip eder, programı yaşamına göre kişiselleştiririz.",
        },
        {
          type: "whyUs",
          title: "Neden Denge Beslenme?",
          points: [
            { title: "Birebir Takip", description: "Her danışan için ayrılan özel zaman ve ilgi." },
            { title: "Haftalık Kontrol", description: "Sürecinizi yakından izler, programı güncelleriz." },
            { title: "8 Yıllık Deneyim", description: "Binlerce danışana ulaşan kanıtlı yaklaşım." },
          ],
        },
        {
          type: "testimonials",
          title: "Danışanlarımız Ne Diyor?",
          items: [
            { quote: "6 ayda hem kilo verdim hem de yeme alışkanlıklarım tamamen değişti.", author: "Elif K." },
            { quote: "Sporcu programı sayesinde performansım gözle görülür arttı.", author: "Mert A." },
            { quote: "Çocuğumun beslenmesinde ailece çok şey öğrendik.", author: "Zeynep T." },
          ],
        },
        {
          type: "contact",
          title: "İletişim",
          phone: "0216 555 12 34",
          whatsapp: "0555 555 12 34",
          email: "info@dengebeslenme.com",
          address: "Caferağa Mah., Moda Cad. No:12, Kadıköy / İstanbul",
          hours: "Hafta içi 09:00 – 18:00",
          showForm: true,
        },
      ],
    },
  ],
};
