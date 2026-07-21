// Site JSON v1 (KAR-30) — the single source of truth for a generated site.
// "Site = data": the deterministic renderer + component kit turn this document
// into a real page; the LLM never writes raw HTML/CSS (DESIGN §8). Sections are
// a discriminated union so each type carries its own typed props.

import { z } from "zod";

const TONES = ["kurumsal", "samimi", "premium"] as const;

// Brand tokens applied across the rendered site.
export const brandTokensSchema = z.object({
  primary: z.string().default("#4F46E5"), // hex accent color
  accent: z.string().default("#8B5CF6"),
  tone: z.enum(TONES).default("kurumsal"),
});
export type BrandTokens = z.infer<typeof brandTokensSchema>;

// ---- Sections (v1) ----

const heroSection = z.object({
  type: z.literal("hero"),
  headline: z.string(),
  subheadline: z.string().default(""),
  ctaLabel: z.string().default(""),
  ctaHref: z.string().default("#iletisim"),
});

const servicesSection = z.object({
  type: z.literal("services"),
  title: z.string().default("Hizmetlerimiz"),
  items: z
    .array(z.object({ name: z.string(), description: z.string().default("") }))
    .default([]),
});

const aboutSection = z.object({
  type: z.literal("about"),
  title: z.string().default("Hakkımızda"),
  body: z.string().default(""),
});

const whyUsSection = z.object({
  type: z.literal("whyUs"),
  title: z.string().default("Neden Biz?"),
  points: z
    .array(z.object({ title: z.string(), description: z.string().default("") }))
    .default([]),
});

const testimonialsSection = z.object({
  type: z.literal("testimonials"),
  title: z.string().default("Ne Diyorlar?"),
  items: z
    .array(z.object({ quote: z.string(), author: z.string().default("") }))
    .default([]),
});

const contactSection = z.object({
  type: z.literal("contact"),
  title: z.string().default("İletişim"),
  phone: z.string().default(""),
  email: z.string().default(""),
  address: z.string().default(""),
  hours: z.string().default(""),
  whatsapp: z.string().default(""),
  showForm: z.boolean().default(true),
});

export const siteSectionSchema = z.discriminatedUnion("type", [
  heroSection,
  servicesSection,
  aboutSection,
  whyUsSection,
  testimonialsSection,
  contactSection,
]);
export type SiteSection = z.infer<typeof siteSectionSchema>;
export type SiteSectionType = SiteSection["type"];

export const SITE_SECTION_TYPES = [
  "hero",
  "services",
  "about",
  "whyUs",
  "testimonials",
  "contact",
] as const;

export const sitePageSchema = z.object({
  path: z.string().default("/"),
  title: z.string().default(""),
  sections: z.array(siteSectionSchema).default([]),
});
export type SitePage = z.infer<typeof sitePageSchema>;

export const siteSchema = z.object({
  schemaVersion: z.string().default("0.1.0"),
  meta: z
    .object({
      businessName: z.string().default(""),
      title: z.string().default(""),
      description: z.string().default(""),
    })
    .default({ businessName: "", title: "", description: "" }),
  brand: brandTokensSchema.default({ primary: "#4F46E5", accent: "#8B5CF6", tone: "kurumsal" }),
  pages: z.array(sitePageSchema).default([]),
});
export type Site = z.infer<typeof siteSchema>;

/** Parse + fill defaults; throws on invalid shape. */
export function parseSite(input: unknown): Site {
  return siteSchema.parse(input);
}

/** Safe parse for boundaries that shouldn't throw. */
export function safeParseSite(input: unknown) {
  return siteSchema.safeParse(input);
}
