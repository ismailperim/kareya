import {
  ARCHETYPE_PAGES,
  sectionSpecsFor,
  type Archetype,
  type Brief,
  type BriefSection,
  type ContentSource,
  type Feature,
} from "@kareya/schemas";

import type { MeetingToolCall } from "./types";

// Applies a voice-agent tool call to the Brief state (KAR-22). Pure + immutable
// so the hook can drive it and the completeness gate can re-run on the result.
// Tool set mirrors the agent config (scripts/setup-agent.mjs):
//   set_archetype · update_field · set_flag · update_section · set_feature · append_note
export function applyToolCall(brief: Brief, call: MeetingToolCall): Brief {
  const p = call.parameters ?? {};
  switch (call.name) {
    case "set_archetype": {
      const archetype = p.archetype as Archetype;
      const existing = new Map(brief.sections.map((s) => [s.key, s]));
      return {
        ...brief,
        archetype,
        pages: brief.pages.length ? brief.pages : [...(ARCHETYPE_PAGES[archetype] ?? [])],
        sections: sectionSpecsFor(archetype).map(
          (spec) => existing.get(spec.key) ?? emptySection(spec.key),
        ),
      };
    }
    case "update_field": {
      const path = String(p.path ?? "");
      const value = String(p.value ?? "");
      // multilang.langs is an array — accept a comma-separated value.
      if (path === "multilang.langs") {
        const langs = value.split(",").map((s) => s.trim()).filter(Boolean);
        return { ...brief, multilang: { langs } };
      }
      return setPath(brief, path, value);
    }
    case "set_flag":
      return setFlag(brief, String(p.name ?? ""), Boolean(p.value));
    case "update_section":
      return upsertSection(brief, String(p.section ?? ""), p);
    case "set_feature": {
      const feature = p.feature as Feature;
      if (!feature) return brief;
      const others = brief.featureDecisions.filter((d) => d.feature !== feature);
      return { ...brief, featureDecisions: [...others, { feature, enabled: Boolean(p.enabled) }] };
    }
    case "append_note": {
      const text = String(p.text ?? "").trim();
      if (!text) return brief;
      return { ...brief, notes: brief.notes ? `${brief.notes}\n${text}` : text };
    }
    default:
      return brief;
  }
}

// Compact, human-readable summary of what's already collected — passed to the
// agent as resume context (KAR-26) so it continues instead of restarting.
export function buildCollectedSummary(brief: Brief): string {
  const parts: string[] = [];
  const push = (label: string, v: unknown) => {
    if (v !== null && v !== undefined && v !== "") parts.push(`${label}: ${v}`);
  };
  push("Arketip", brief.archetype);
  push("İşletme", brief.business.name);
  push("Sektör", brief.business.sector);
  push("Slogan", brief.business.tagline);
  push("Bölge", brief.business.region);
  push("Ana hedef (CTA)", brief.cta.primaryGoal);
  push("Ton", brief.brand.tone);
  if (brief.brand.hasLogo !== null) push("Logo", brief.brand.hasLogo ? "var" : "yok");
  if (brief.contentSources.hasText !== null)
    push("Metin kaynağı", brief.contentSources.hasText ? "müşteride" : "biz üreteceğiz");
  if (brief.contentSources.hasPhotos !== null)
    push("Görsel kaynağı", brief.contentSources.hasPhotos ? "müşteride" : "biz üreteceğiz");
  const contact = [
    brief.contact.phone && `tel ${brief.contact.phone}`,
    brief.contact.email && `e-posta ${brief.contact.email}`,
    brief.contact.hours && `saat ${brief.contact.hours}`,
  ]
    .filter(Boolean)
    .join(", ");
  push("İletişim", contact);
  const secs = brief.sections
    .filter((s) => s.willInclude !== null)
    .map((s) => `${s.key}=${s.willInclude ? (s.contentSource ?? "?") : "yok"}`);
  if (secs.length) push("Bölümler", secs.join(", "));
  if (brief.featureDecisions.length)
    push("Özellikler", brief.featureDecisions.map((d) => `${d.feature}:${d.enabled ? "evet" : "hayır"}`).join(", "));
  push("Termin", brief.deadline);
  if (brief.notes) push("Notlar", brief.notes.slice(0, 600));
  return parts.join("\n");
}

function emptySection(key: string): BriefSection {
  return { key, willInclude: null, contentSource: null, keyMessage: null, notes: "", facts: {} };
}

function setFlag(brief: Brief, name: string, value: boolean): Brief {
  switch (name) {
    case "hasText":
      return { ...brief, contentSources: { ...brief.contentSources, hasText: value } };
    case "hasPhotos":
      return { ...brief, contentSources: { ...brief.contentSources, hasPhotos: value } };
    case "hasLogo":
      return { ...brief, brand: { ...brief.brand, hasLogo: value } };
    default:
      return brief;
  }
}

function upsertSection(brief: Brief, key: string, p: Record<string, unknown>): Brief {
  if (!key) return brief;
  const patch = (s: BriefSection): BriefSection => ({
    ...s,
    willInclude: typeof p.willInclude === "boolean" ? p.willInclude : s.willInclude,
    contentSource: p.contentSource ? (p.contentSource as ContentSource) : s.contentSource,
    keyMessage: typeof p.keyMessage === "string" ? p.keyMessage : s.keyMessage,
    notes: typeof p.notes === "string" && p.notes ? p.notes : s.notes,
  });
  const found = brief.sections.some((s) => s.key === key);
  return {
    ...brief,
    sections: found
      ? brief.sections.map((s) => (s.key === key ? patch(s) : s))
      : [...brief.sections, patch(emptySection(key))],
  };
}

// Set a dotted string path (e.g. "business.tagline", "contact.phone",
// "brand.tone", "cta.primaryGoal", "deadline") on a clone of the brief.
function setPath(brief: Brief, path: string, value: string): Brief {
  if (!path) return brief;
  const parts = path.split(".");
  const clone = structuredClone(brief);
  let obj = clone as unknown as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    const next = obj[parts[i]];
    if (next === null || typeof next !== "object") return brief;
    obj = next as Record<string, unknown>;
  }
  obj[parts[parts.length - 1]] = value;
  return clone;
}
