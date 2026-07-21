import assert from "node:assert/strict";
import { test } from "vitest";

import { parseSite, safeParseSite } from "./site";

const sample = {
  meta: { businessName: "Denge Beslenme", title: "Denge Beslenme", description: "Diyetisyen kliniği" },
  brand: { primary: "#0EA5E9", tone: "samimi" },
  pages: [
    {
      path: "/",
      title: "Anasayfa",
      sections: [
        { type: "hero", headline: "Sağlıklı yaşama birebir eşlik", ctaLabel: "Randevu al" },
        { type: "services", items: [{ name: "Kilo yönetimi", description: "…" }, { name: "Sporcu beslenmesi" }] },
        { type: "about", body: "8 yıllık deneyim." },
        { type: "contact", phone: "0216 555 12 34", email: "info@x.com" },
      ],
    },
  ],
};

test("parses a valid site + fills defaults", () => {
  const site = parseSite(sample);
  assert.equal(site.schemaVersion, "0.1.0");
  assert.equal(site.brand.primary, "#0EA5E9");
  assert.equal(site.brand.accent, "#8B5CF6"); // default filled
  assert.equal(site.pages[0].sections.length, 4);
  assert.equal(site.pages[0].sections[0].type, "hero");
  // services item without description gets the default
  const services = site.pages[0].sections[1];
  assert.equal(services.type, "services");
  if (services.type === "services") assert.equal(services.items[1].description, "");
});

test("empty site parses to defaults", () => {
  const site = parseSite({});
  assert.equal(site.pages.length, 0);
  assert.equal(site.brand.tone, "kurumsal");
});

test("rejects an unknown section type", () => {
  const bad = safeParseSite({ pages: [{ sections: [{ type: "gallery" }] }] });
  assert.equal(bad.success, false);
});
