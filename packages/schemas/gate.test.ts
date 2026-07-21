import assert from "node:assert/strict";
import { test } from "vitest";

import { parseBrief, createEmptyBrief, ARCHETYPE_SECTIONS, FEATURES } from "./brief";
import { evaluateGate } from "./gate";

// A brief that satisfies both gates for the "hizmet" archetype.
function completeHizmet(overrides: Record<string, unknown> = {}) {
  return parseBrief({
    archetype: "hizmet",
    business: { name: "Altın Fırın", sector: "fırın", tagline: "Taş fırın lezzeti", region: "İstanbul" },
    contact: { phone: "02121112233", email: "info@altinfirin.com", address: "Kadıköy", hours: "09-19" },
    social: { instagram: "@altinfirin" },
    brand: { hasLogo: true, tone: "samimi" },
    contentSources: { hasText: true, hasPhotos: true },
    pages: ["anasayfa", "hakkimizda", "hizmetler", "iletisim"],
    cta: { primaryGoal: "whatsapp" },
    deadline: "2 hafta",
    featureDecisions: FEATURES.map((f) => ({ feature: f, enabled: false })),
    sections: ARCHETYPE_SECTIONS.hizmet.map((s) => ({
      key: s.key,
      willInclude: true,
      contentSource: "client_text",
      keyMessage: "ana mesaj",
    })),
    ...overrides,
  });
}

test("empty brief cannot complete", () => {
  const r = evaluateGate(createEmptyBrief());
  assert.equal(r.canComplete, false);
  assert.equal(r.gateA.ok, false);
  assert.equal(r.gateB.ok, false);
  assert.ok(r.missing.length > 5);
});

test("complete hizmet brief passes both gates", () => {
  const r = evaluateGate(completeHizmet());
  assert.deepEqual(r.missing, []);
  assert.equal(r.canComplete, true);
});

test("completes without contact phone/email (new business — KAR-35)", () => {
  const r = evaluateGate(
    completeHizmet({ contact: { phone: "", email: "", address: "", hours: "", whatsapp: "" } }),
  );
  assert.equal(r.canComplete, true);
});

test("missing content source (GATE-A) blocks completion", () => {
  const r = evaluateGate(completeHizmet({ contentSources: { hasText: null, hasPhotos: true } }));
  assert.equal(r.canComplete, false);
  assert.ok(r.gateA.missing.some((m) => m.field === "contentSources.hasText"));
});

test("unasked feature (GATE-A) blocks completion", () => {
  const r = evaluateGate(completeHizmet({ featureDecisions: [{ feature: "map", enabled: true }] }));
  assert.equal(r.canComplete, false);
  assert.ok(r.gateA.missing.some((m) => m.field === "feature.whatsapp_button"));
});

test("undecided mandatory section (GATE-B) blocks completion", () => {
  const sections = ARCHETYPE_SECTIONS.hizmet.map((s) => ({
    key: s.key,
    willInclude: s.key === "services" ? null : true,
    contentSource: "client_text",
    keyMessage: "ana mesaj",
  }));
  const r = evaluateGate(completeHizmet({ sections }));
  assert.equal(r.canComplete, false);
  assert.ok(r.gateB.missing.some((m) => m.field === "section.services.willInclude"));
});

test("undecided expected section (GATE-B) blocks completion", () => {
  const sections = ARCHETYPE_SECTIONS.hizmet.map((s) => ({
    key: s.key,
    // 'team' is [Beklenen]: leaving it undecided (null) must block.
    willInclude: s.key === "team" ? null : true,
    contentSource: "client_text",
    keyMessage: "ana mesaj",
  }));
  const r = evaluateGate(completeHizmet({ sections }));
  assert.equal(r.canComplete, false);
  assert.ok(r.gateB.missing.some((m) => m.field === "section.team.willInclude"));
});

test("excluding an expected section is a valid decision", () => {
  const sections = ARCHETYPE_SECTIONS.hizmet.map((s) => ({
    key: s.key,
    willInclude: s.key === "team" || s.key === "testimonials" ? false : true,
    contentSource: "client_text",
    keyMessage: "ana mesaj",
  }));
  const r = evaluateGate(completeHizmet({ sections }));
  assert.equal(r.canComplete, true);
});
