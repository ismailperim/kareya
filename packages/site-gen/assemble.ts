import { parseSite, type Brief, type Site, type SiteSection } from "@kareya/schemas";

// Brief → Site JSON (KAR-33), deterministic v1. Structure comes from the brief's
// section map; content comes from each section's keyMessage / facts / notes;
// brand color from the tone. A Claude content-polish pass (raw → polished copy)
// is a follow-up once an Anthropic key is available.

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

export function briefToSite(brief: Brief): Site {
  const name = brief.business.name || "İşletme";
  const tone = brief.brand.tone || "kurumsal";
  const colors = TONE_COLORS[tone] ?? TONE_COLORS.kurumsal;

  const byKey = new Map(brief.sections.map((s) => [s.key, s]));
  const km = (k: string) => byKey.get(k)?.keyMessage ?? "";
  const has = (k: string) => byKey.get(k)?.willInclude === true;

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
    ctaHref: "#iletisim",
  });

  if (has("services")) {
    sections.push({
      type: "services",
      title: "Hizmetlerimiz",
      items: splitList(km("services")).map((n) => ({ name: n, description: "" })),
    });
  }

  if (has("about")) {
    sections.push({
      type: "about",
      title: "Hakkımızda",
      body: km("about") || brief.notes.slice(0, 400),
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

  // Contact — always, if there is any contact info or the section was included.
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
    });
  }

  return parseSite({
    meta: {
      businessName: name,
      title: name,
      description: brief.business.tagline || brief.business.sector || "",
    },
    brand: { primary: colors.primary, accent: colors.accent, tone },
    pages: [{ path: "/", title: "Anasayfa", sections }],
  });
}
