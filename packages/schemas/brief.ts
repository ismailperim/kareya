// Brief v1 — the "site contract" collected in the first meeting.
//
// Single source of truth consumed by: the voice agent tools (KAR-22), the
// completeness gate (KAR-21), the live brief panel (KAR-24), and later the
// Site Assembler. Two layers:
//   1. Structured fields (deterministic — feed pricing + Site JSON).
//   2. Free-form notes (`notes` global + per-section `notes`) — rich raw
//      material for the downstream AI crew's prompt. Not gated; more is better.
//
// Extends the DESIGN §3 Brief JSON skeleton into a section-map, normalized to
// camelCase. `null` on a structured field means "not decided yet" (≠ "no").

import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** v1 archetypes (restoran v1.5, portfolyo/landing v2 — see epic KAR-18). */
export const ARCHETYPES = ["hizmet", "kurumsal"] as const;
export const archetypeSchema = z.enum(ARCHETYPES);
export type Archetype = z.infer<typeof archetypeSchema>;

/** Where a section's content comes from. Never left unknown once a section is included. */
export const CONTENT_SOURCES = [
  "client_text",
  "client_photos",
  "instagram",
  "provided_file",
  "existing_site",
  "agency_generated",
  "none",
] as const;
export const contentSourceSchema = z.enum(CONTENT_SOURCES);
export type ContentSource = z.infer<typeof contentSourceSchema>;

/** Feature catalogue scanned during the meeting (each answered yes/no). */
export const FEATURES = [
  "contact_form",
  "map",
  "whatsapp_button",
  "appointment",
  "reservation",
  "multilang",
  "social_feed",
] as const;
export const featureSchema = z.enum(FEATURES);
export type Feature = z.infer<typeof featureSchema>;

export const TONES = ["kurumsal", "samimi", "premium"] as const;
export const toneSchema = z.enum(TONES);
export type Tone = z.infer<typeof toneSchema>;

export const CTA_GOALS = ["call", "whatsapp", "form", "appointment", "directions", "purchase"] as const;
export const ctaGoalSchema = z.enum(CTA_GOALS);
export type CtaGoal = z.infer<typeof ctaGoalSchema>;

export const DOMAIN_STATUSES = ["has", "needs", "unknown"] as const;
export const domainStatusSchema = z.enum(DOMAIN_STATUSES);

export const CARE_PLANS = ["none", "basic", "pro", "undecided"] as const;
export const carePlanSchema = z.enum(CARE_PLANS);

/**
 * Gate-criticality tags (machine-readable — the completeness gate reads these):
 * - `Z-Fiyat`: pricing/scope driver (proposal-readiness, GATE-A)
 * - `Z-Site` : defines the site (site-definition-readiness, GATE-B)
 * - `Beklenen`: archetype default; must be decided (asked), not silently empty
 * - `Ops`    : optional; never blocks completion
 */
export const CRITICALITY = ["Z-Fiyat", "Z-Site", "Beklenen", "Ops"] as const;
export type Criticality = (typeof CRITICALITY)[number];

// ---------------------------------------------------------------------------
// Section (the new core: willInclude + contentSource + keyMessage + notes)
// ---------------------------------------------------------------------------

export const sectionSchema = z.object({
  /** Section key, e.g. "hero" | "services" | "about" | "contact". */
  key: z.string(),
  /** null = not decided yet; true/false = confirmed by the client. */
  willInclude: z.boolean().nullable().default(null),
  /** Must be set (never null) once willInclude is true. */
  contentSource: contentSourceSchema.nullable().default(null),
  /** Raw main message / key facts in the client's words (NOT polished copy). */
  keyMessage: z.string().nullable().default(null),
  /** Per-section free-form notes (nuance, stories, preferences). */
  notes: z.string().default(""),
  /** Archetype-specific structured facts (e.g. service list, hours). */
  facts: z.record(z.string(), z.unknown()).default({}),
});
export type BriefSection = z.infer<typeof sectionSchema>;

// ---------------------------------------------------------------------------
// Sub-objects
// ---------------------------------------------------------------------------

const businessSchema = z.object({
  name: z.string().nullable().default(null),
  sector: z.string().nullable().default(null),
  tagline: z.string().nullable().default(null),
  region: z.string().nullable().default(null),
});

const contactSchema = z.object({
  phone: z.string().nullable().default(null),
  whatsapp: z.string().nullable().default(null),
  email: z.string().nullable().default(null),
  address: z.string().nullable().default(null),
  hours: z.string().nullable().default(null),
});

const socialSchema = z.object({
  instagram: z.string().nullable().default(null),
  facebook: z.string().nullable().default(null),
  other: z.array(z.string()).default([]),
});

const brandSchema = z.object({
  hasLogo: z.boolean().nullable().default(null),
  logoUrl: z.string().nullable().default(null),
  colors: z.string().nullable().default(null),
  tone: toneSchema.nullable().default(null),
});

const contentSourcesSchema = z.object({
  hasText: z.boolean().nullable().default(null),
  hasPhotos: z.boolean().nullable().default(null),
  existingSite: z.string().nullable().default(null),
  providedFiles: z.array(z.string()).default([]),
});

const featureDecisionSchema = z.object({
  feature: featureSchema,
  enabled: z.boolean(),
});
export type FeatureDecision = z.infer<typeof featureDecisionSchema>;

const domainSchema = z.object({
  status: domainStatusSchema.default("unknown"),
  name: z.string().nullable().default(null),
});

// ---------------------------------------------------------------------------
// Brief
// ---------------------------------------------------------------------------

const ctaSchema = z.object({ primaryGoal: ctaGoalSchema.nullable().default(null) });
const multilangSchema = z.object({ langs: z.array(z.string()).default([]) });
const flagsSchema = z.object({ ecommerceRequested: z.boolean().default(false) });

export const briefSchema = z.object({
  schemaVersion: z.string().default("0.1.0"),
  archetype: archetypeSchema.nullable().default(null),

  business: businessSchema.default({ name: null, sector: null, tagline: null, region: null }),
  contact: contactSchema.default({ phone: null, whatsapp: null, email: null, address: null, hours: null }),
  social: socialSchema.default({ instagram: null, facebook: null, other: [] }),
  brand: brandSchema.default({ hasLogo: null, logoUrl: null, colors: null, tone: null }),
  contentSources: contentSourcesSchema.default({ hasText: null, hasPhotos: null, existingSite: null, providedFiles: [] }),

  /** Page list (archetype default proposed then adjusted). */
  pages: z.array(z.string()).default([]),
  /** Section map — the core of the brief. */
  sections: z.array(sectionSchema).default([]),

  /** Primary action the whole site drives toward. */
  cta: ctaSchema.default({ primaryGoal: null }),

  /** Each catalogue feature answered yes/no (presence = asked). */
  featureDecisions: z.array(featureDecisionSchema).default([]),
  multilang: multilangSchema.default({ langs: [] }),

  deadline: z.string().nullable().default(null),
  references: z.array(z.string()).default([]),
  carePlanInterest: carePlanSchema.default("undecided"),
  domain: domainSchema.default({ status: "unknown", name: null }),

  /** GLOBAL free-form notes — the rich prompt raw material (v1.1). */
  notes: z.string().default(""),
  /** Auto-filled conversation transcript/summary. */
  notesTranscript: z.string().default(""),

  /** Flags surfaced for the human (e.g. e-commerce = out of scope). */
  flags: flagsSchema.default({ ecommerceRequested: false }),
});
export type Brief = z.infer<typeof briefSchema>;

/** Parse + fill defaults; throws on invalid shape. */
export function parseBrief(input: unknown): Brief {
  return briefSchema.parse(input);
}

/** Safe parse variant for boundaries that shouldn't throw. */
export function safeParseBrief(input: unknown) {
  return briefSchema.safeParse(input);
}

// ---------------------------------------------------------------------------
// Field criticality (consumed by the completeness gate — KAR-21)
// ---------------------------------------------------------------------------

export const FIELD_CRITICALITY: Record<string, Criticality[]> = {
  archetype: ["Z-Fiyat"],
  "business.name": ["Z-Fiyat", "Z-Site"],
  "business.sector": ["Z-Fiyat"],
  "business.tagline": ["Z-Site"],
  "business.region": ["Z-Fiyat", "Z-Site"],
  "contact.phone": ["Z-Site"],
  "contact.email": ["Z-Site"],
  "contact.address": ["Z-Site"], // conditional: physical location / map
  "contact.hours": ["Z-Site"],
  "social.instagram": ["Z-Site"],
  pages: ["Z-Fiyat", "Z-Site"],
  "cta.primaryGoal": ["Z-Site"],
  "brand.hasLogo": ["Z-Fiyat"],
  "brand.tone": ["Z-Site"],
  "contentSources.hasText": ["Z-Fiyat"],
  "contentSources.hasPhotos": ["Z-Fiyat"],
  "contentSources.existingSite": ["Z-Fiyat"],
  featureDecisions: ["Z-Fiyat", "Z-Site"],
  deadline: ["Z-Fiyat"],
  references: ["Ops"],
  carePlanInterest: ["Ops"],
  "domain.status": ["Ops"],
};

// ---------------------------------------------------------------------------
// Archetype defaults (pages + section map) — proposed by the agent, confirmed
// with the client. Also drives the gate's per-archetype required content facts.
// ---------------------------------------------------------------------------

export interface ArchetypeSectionSpec {
  key: string;
  /** Turkish label shown in the live panel. */
  label: string;
  /** Archetype default recommendation for willInclude. */
  defaultInclude: boolean;
  criticality: Criticality[];
}

export const ARCHETYPE_PAGES: Record<Archetype, string[]> = {
  hizmet: ["anasayfa", "hakkimizda", "hizmetler", "iletisim"],
  kurumsal: ["anasayfa", "hakkimizda", "cozumler", "iletisim"],
};

export const ARCHETYPE_SECTIONS: Record<Archetype, ArchetypeSectionSpec[]> = {
  hizmet: [
    { key: "hero", label: "Hero", defaultInclude: true, criticality: ["Z-Site"] },
    { key: "services", label: "Hizmetler", defaultInclude: true, criticality: ["Z-Fiyat", "Z-Site"] },
    { key: "about", label: "Hakkımızda", defaultInclude: true, criticality: ["Z-Site"] },
    { key: "whyUs", label: "Neden Biz", defaultInclude: true, criticality: ["Z-Site"] },
    { key: "team", label: "Ekip", defaultInclude: false, criticality: ["Beklenen"] },
    { key: "testimonials", label: "Yorumlar", defaultInclude: false, criticality: ["Beklenen"] },
    { key: "faq", label: "SSS", defaultInclude: false, criticality: ["Ops"] },
    { key: "contact", label: "İletişim", defaultInclude: true, criticality: ["Z-Site"] },
  ],
  kurumsal: [
    { key: "hero", label: "Hero", defaultInclude: true, criticality: ["Z-Site"] },
    { key: "about", label: "Hakkımızda / Hikaye", defaultInclude: true, criticality: ["Z-Site"] },
    { key: "services", label: "Çözümler / Faaliyetler", defaultInclude: true, criticality: ["Z-Fiyat", "Z-Site"] },
    { key: "whyUs", label: "Değerler / Neden Biz", defaultInclude: true, criticality: ["Z-Site"] },
    { key: "clients", label: "Referanslar", defaultInclude: false, criticality: ["Beklenen"] },
    { key: "team", label: "Ekip / Yönetim", defaultInclude: false, criticality: ["Beklenen"] },
    { key: "press", label: "Basında Biz", defaultInclude: false, criticality: ["Ops"] },
    { key: "contact", label: "İletişim", defaultInclude: true, criticality: ["Z-Site"] },
  ],
};

/** Section specs for an archetype (empty until archetype is set). */
export function sectionSpecsFor(archetype: Archetype | null): ArchetypeSectionSpec[] {
  return archetype ? ARCHETYPE_SECTIONS[archetype] : [];
}

/**
 * A fresh brief. If `archetype` is given, seeds pages + an undecided section
 * entry per archetype default section (so the panel can show the full map).
 */
export function createEmptyBrief(archetype: Archetype | null = null): Brief {
  const seed: unknown = {
    archetype,
    pages: archetype ? [...ARCHETYPE_PAGES[archetype]] : [],
    sections: sectionSpecsFor(archetype).map((s) => ({ key: s.key })),
  };
  return briefSchema.parse(seed);
}
