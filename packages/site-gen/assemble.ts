import { parseSite, type Brief, type Site, type SiteSection } from "@kareya/schemas";

// Brief → Site JSON (KAR-33; agency wave KAR-55). Structure is deterministic:
// sections come from the brief's section map, pages from the brief's page list
// (multi-page when the brief asks for it — the TR SMB default). Content comes
// from keyMessages/notes; polish (LLM) refines copy afterwards but never
// invents facts. Trust sections (statsBar/process/ctaBanner) are seeded here;
// statsBar stays empty unless polish finds REAL numbers, and empty sections
// are skipped by the renderers.

const TONE_COLORS: Record<string, { primary: string; accent: string }> = {
  kurumsal: { primary: "#4F46E5", accent: "#6366F1" },
  samimi: { primary: "#0EA5E9", accent: "#22D3EE" },
  premium: { primary: "#7C3AED", accent: "#A855F7" },
};

const CTA_LABEL: Record<string, string> = {
  call: "Bizi arayın",
  whatsapp: "WhatsApp'tan yazın",
  form: "İletişime geçin",
  appointment: "Randevu alın",
  directions: "Yol tarifi",
  purchase: "Sipariş verin",
};

/** Split a raw keyMessage into list items (services, why-us points, quotes). */
function splitList(s: string | null | undefined): string[] {
  if (!s) return [];
  return s
    .split(/[\n;,•]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Known page keys (brief.pages) → path/title. Unknown keys are ignored. */
const PAGE_DEFS: Record<string, { path: string; title: string }> = {
  anasayfa: { path: "/", title: "Anasayfa" },
  hakkimizda: { path: "hakkimizda", title: "Hakkımızda" },
  hizmetler: { path: "hizmetler", title: "Hizmetler" },
  cozumler: { path: "hizmetler", title: "Çözümler" },
  iletisim: { path: "iletisim", title: "İletişim" },
};

/** Which section types live on which page in multi-page mode. */
const PAGE_SECTIONS: Record<string, SiteSection["type"][]> = {
  "/": ["hero", "statsBar", "whyUs", "testimonials", "ctaBanner", "faq"],
  hizmetler: ["services", "process"],
  hakkimizda: ["about"],
  iletisim: ["contact"],
};

export function briefToSite(brief: Brief): Site {
  const name = brief.business.name || "İşletme";
  const tone = brief.brand.tone || "kurumsal";
  const colors = TONE_COLORS[tone] ?? TONE_COLORS.kurumsal;

  const byKey = new Map(brief.sections.map((s) => [s.key, s]));
  const km = (k: string) => byKey.get(k)?.keyMessage ?? "";
  const has = (k: string) => byKey.get(k)?.willInclude === true;

  // Multi-page when the brief lists more than one known page (TR SMB default);
  // one-page otherwise. Contact links adapt (anchor vs page file).
  const pageKeys = brief.pages.map((p) => p.toLowerCase()).filter((p) => PAGE_DEFS[p]);
  const multiPage = new Set(pageKeys.map((p) => PAGE_DEFS[p].path)).size > 1;
  const contactHref = multiPage ? "iletisim.html" : "#iletisim";

  const sections: SiteSection[] = [];

  // Hero — always leads (from tagline + a supporting line).
  sections.push({
    type: "hero",
    headline: brief.business.tagline || name,
    subheadline:
      km("hero") ||
      km("about") ||
      (brief.business.sector ? `${name} — ${brief.business.sector}` : ""),
    ctaLabel: brief.cta.primaryGoal
      ? (CTA_LABEL[brief.cta.primaryGoal] ?? "İletişime geçin")
      : "İletişime geçin",
    ctaHref: contactHref,
    imageUrl: "",
  });

  // Trust-number strip: seeded empty; polish fills from REAL facts only.
  sections.push({ type: "statsBar", items: [] });

  if (has("services")) {
    sections.push({
      type: "services",
      title: "Hizmetlerimiz",
      items: splitList(km("services")).map((n) => ({ name: n, description: "" })),
    });
    // "How we work" — generic agency steps; polish tailors them to the brief.
    sections.push({
      type: "process",
      title: "Nasıl Çalışıyoruz?",
      steps: [
        { title: "Tanışma", description: "İhtiyacınızı dinler, hedefinizi netleştiririz." },
        { title: "Planlama", description: "Size özel kapsamı ve yol haritasını çıkarırız." },
        { title: "Teslim", description: "Uygular, birlikte kontrol eder, teslim ederiz." },
      ],
    });
  }

  if (has("about")) {
    sections.push({
      type: "about",
      title: "Hakkımızda",
      body: km("about") || brief.notes.slice(0, 400),
      imageUrl: "",
    });
  }

  if (has("whyUs")) {
    sections.push({
      type: "whyUs",
      title: "Neden Biz?",
      points: splitList(km("whyUs")).map((t) => ({ title: t, description: "" })),
    });
  }

  if (has("testimonials")) {
    sections.push({
      type: "testimonials",
      title: "Ne Diyorlar?",
      items: splitList(km("testimonials")).map((q) => ({ quote: q, author: "" })),
    });
  }

  // Mid-page conversion banner (audit #6); polish rewrites the headline.
  sections.push({
    type: "ctaBanner",
    headline: brief.business.tagline || "Projenizi konuşalım",
    ctaLabel: brief.cta.primaryGoal
      ? (CTA_LABEL[brief.cta.primaryGoal] ?? "İletişime geçin")
      : "İletişime geçin",
    ctaHref: contactHref,
  });

  // FAQ — topics from the brief become questions; polish writes the answers.
  if (has("faq")) {
    const topics = splitList(km("faq"));
    if (topics.length) {
      sections.push({
        type: "faq",
        title: "Sık Sorulan Sorular",
        items: topics.map((q) => ({ question: q, answer: "" })),
      });
    }
  }

  // Contact — always, if there is any contact info or the section was included.
  const mapEnabled =
    brief.featureDecisions.find((d) => d.feature === "map")?.enabled === true;
  if (has("contact") || brief.contact.phone || brief.contact.email) {
    sections.push({
      type: "contact",
      title: "İletişim",
      phone: brief.contact.phone || "",
      email: brief.contact.email || "",
      address: brief.contact.address || "",
      hours: brief.contact.hours || "",
      whatsapp: brief.contact.whatsapp || "",
      showForm: true,
      showMap: mapEnabled && !!brief.contact.address,
    });
  }

  // Feature decisions → site features (KAR-51). WhatsApp float: use a real
  // number when available; NEVER invent one (empty → button links to contact).
  const whatsappEnabled =
    brief.featureDecisions.find((d) => d.feature === "whatsapp_button")?.enabled === true;

  // Page layout: distribute sections across the brief's pages (multi-page) or
  // keep the single-scroll page.
  let pages: { path: string; title: string; sections: SiteSection[] }[];
  if (multiPage) {
    const ordered = ["/", "hizmetler", "hakkimizda", "iletisim"].filter(
      (path) =>
        path === "/" || pageKeys.some((k) => PAGE_DEFS[k].path === path),
    );
    pages = ordered
      .map((path) => ({
        path,
        title:
          path === "/"
            ? "Anasayfa"
            : (Object.values(PAGE_DEFS).find((d) => d.path === path)?.title ?? path),
        sections: sections.filter((s) => (PAGE_SECTIONS[path] ?? []).includes(s.type)),
      }))
      .filter((p) => p.sections.length > 0);
  } else {
    pages = [{ path: "/", title: "Anasayfa", sections }];
  }

  return parseSite({
    meta: {
      businessName: name,
      title: name,
      description: brief.business.tagline || brief.business.sector || "",
    },
    brand: { primary: colors.primary, accent: colors.accent, tone },
    whatsapp: {
      enabled: whatsappEnabled,
      number: brief.contact.whatsapp || brief.contact.phone || "",
    },
    social: {
      instagram: brief.social.instagram || "",
      facebook: brief.social.facebook || "",
    },
    pages,
  });
}
