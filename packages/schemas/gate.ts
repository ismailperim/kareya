// Completeness gate (KAR-21) — deterministic, server-side. Decides whether a
// Brief is complete enough to (A) produce a proposal and (B) define the site.
// The "tamamla" action opens only when both gates are green. This is NOT left
// to the LLM; the agent receives the structured `missing[]` and keeps asking.

import {
  ARCHETYPE_SECTIONS,
  FEATURES,
  type Brief,
} from "./brief";

export type GateId = "A" | "B";

export interface GateMissing {
  gate: GateId;
  /** Dotted field / section path, e.g. "contentSources.hasText". */
  field: string;
  /** Turkish reason shown in the panel + fed to the agent. */
  reason: string;
}

export interface GateBucket {
  ok: boolean;
  missing: GateMissing[];
}

export interface GateResult {
  /** Proposal-readiness (pricing/scope). */
  gateA: GateBucket;
  /** Site-definition-readiness (feeds Site JSON). */
  gateB: GateBucket;
  /** All missing items across both gates. */
  missing: GateMissing[];
  /** True only when both gates are green. */
  canComplete: boolean;
}

const filled = (v: unknown): boolean => typeof v === "string" && v.trim().length > 0;
const decided = (v: unknown): boolean => v === true || v === false;

export function evaluateGate(brief: Brief): GateResult {
  const a: GateMissing[] = [];
  const b: GateMissing[] = [];

  // ---- GATE-A: proposal-readiness (pricing/scope drivers) ----
  if (!brief.archetype) a.push({ gate: "A", field: "archetype", reason: "Arketip belirlenmedi" });
  if (brief.pages.length === 0) a.push({ gate: "A", field: "pages", reason: "Sayfa listesi boş" });
  if (!filled(brief.business.region))
    a.push({ gate: "A", field: "business.region", reason: "Bölge / hizmet alanı alınmadı" });
  if (!decided(brief.contentSources.hasText))
    a.push({ gate: "A", field: "contentSources.hasText", reason: "Metin kaynağı sorulmadı (siz mi / biz mi)" });
  if (!decided(brief.contentSources.hasPhotos))
    a.push({ gate: "A", field: "contentSources.hasPhotos", reason: "Görsel kaynağı sorulmadı (sizde mi / biz mi)" });
  if (!decided(brief.brand.hasLogo))
    a.push({ gate: "A", field: "brand.hasLogo", reason: "Logo var mı sorulmadı" });
  if (!filled(brief.deadline))
    a.push({ gate: "A", field: "deadline", reason: "Termin beklentisi alınmadı" });

  // Every catalogue feature must be answered yes/no ("not asked" ≠ "no").
  const answered = new Set(brief.featureDecisions.map((d) => d.feature));
  for (const f of FEATURES) {
    if (!answered.has(f))
      a.push({ gate: "A", field: `feature.${f}`, reason: `Özellik sorulmadı: ${f}` });
  }
  // Conditional: multilang selected → languages required.
  const multilangOn = brief.featureDecisions.find((d) => d.feature === "multilang")?.enabled;
  if (multilangOn && brief.multilang.langs.length === 0)
    a.push({ gate: "A", field: "multilang.langs", reason: "Çok dillilik seçildi ama diller belirtilmedi" });

  // ---- GATE-B: site-definition-readiness (feeds Site JSON) ----
  if (!filled(brief.business.tagline))
    b.push({ gate: "B", field: "business.tagline", reason: "Slogan / tek cümlelik tanım (hero) alınmadı" });
  if (!brief.cta.primaryGoal)
    b.push({ gate: "B", field: "cta.primaryGoal", reason: "Sitenin ana hedef aksiyonu (CTA) belirlenmedi" });
  if (!brief.brand.tone)
    b.push({ gate: "B", field: "brand.tone", reason: "Ton (kurumsal / samimi / premium) alınmadı" });
  if (!filled(brief.contact.phone))
    b.push({ gate: "B", field: "contact.phone", reason: "Telefon alınmadı" });
  if (!filled(brief.contact.email))
    b.push({ gate: "B", field: "contact.email", reason: "E-posta alınmadı" });

  // Section map — driven by the archetype's section metadata.
  if (brief.archetype) {
    const specs = ARCHETYPE_SECTIONS[brief.archetype];
    const byKey = new Map(brief.sections.map((s) => [s.key, s]));
    for (const spec of specs) {
      const sec = byKey.get(spec.key);
      const mandatory =
        spec.criticality.includes("Z-Site") || spec.criticality.includes("Z-Fiyat");
      const expected = spec.criticality.includes("Beklenen");

      if (mandatory) {
        if (!sec || sec.willInclude !== true) {
          b.push({ gate: "B", field: `section.${spec.key}.willInclude`, reason: `Zorunlu bölüm eksik: ${spec.label}` });
          continue;
        }
        if (!filled(sec.contentSource))
          b.push({ gate: "B", field: `section.${spec.key}.contentSource`, reason: `İçerik kaynağı belirsiz: ${spec.label}` });
        if (!filled(sec.keyMessage))
          b.push({ gate: "B", field: `section.${spec.key}.keyMessage`, reason: `Ana mesaj alınmadı: ${spec.label}` });
      } else if (expected) {
        // Must be decided (included or explicitly excluded) — not silently empty.
        if (!sec || sec.willInclude === null) {
          b.push({ gate: "B", field: `section.${spec.key}.willInclude`, reason: `Bölüm kararı verilmedi (dahil/hariç): ${spec.label}` });
        } else if (sec.willInclude === true && !filled(sec.contentSource)) {
          b.push({ gate: "B", field: `section.${spec.key}.contentSource`, reason: `İçerik kaynağı belirsiz: ${spec.label}` });
        }
      }
      // Ops sections: no requirement.
    }
  }

  const missing = [...a, ...b];
  return {
    gateA: { ok: a.length === 0, missing: a },
    gateB: { ok: b.length === 0, missing: b },
    missing,
    canComplete: a.length === 0 && b.length === 0,
  };
}

/** One-line signal for the agent, e.g. "Eksik (2): business.tagline, section.about.keyMessage". */
export function formatGateSignal(result: GateResult): string {
  if (result.canComplete) return "Brief tamam — tamamlanabilir.";
  return `Eksik (${result.missing.length}): ${result.missing.map((m) => m.field).join(", ")}`;
}
