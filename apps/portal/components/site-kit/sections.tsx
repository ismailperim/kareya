import type { ReactNode } from "react";

import type { SiteSection } from "@kareya/schemas";

// Component kit v1 (KAR-31): one component per Site JSON section type, driven
// entirely by typed props. The brand color is read from the `--brand` CSS var
// set by the renderer, so components stay brand-agnostic. Deterministic output.

type Hero = Extract<SiteSection, { type: "hero" }>;
type Services = Extract<SiteSection, { type: "services" }>;
type About = Extract<SiteSection, { type: "about" }>;
type WhyUs = Extract<SiteSection, { type: "whyUs" }>;
type Testimonials = Extract<SiteSection, { type: "testimonials" }>;
type Contact = Extract<SiteSection, { type: "contact" }>;

const brand = { color: "var(--brand)" } as const;
const brandBg = { backgroundColor: "var(--brand)" } as const;
const tint = (pct: number) => ({
  backgroundColor: `color-mix(in srgb, var(--brand) ${pct}%, white)`,
});

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={brandBg} />
      <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{children}</h2>
    </div>
  );
}

export function HeroSection({ s }: { s: Hero }) {
  return (
    <section className="relative overflow-hidden" style={tint(8)}>
      <div className="mx-auto max-w-4xl px-6 py-24 text-center sm:py-32">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          {s.headline}
        </h1>
        {s.subheadline && (
          <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-600">{s.subheadline}</p>
        )}
        {s.ctaLabel && (
          <a
            href={s.ctaHref}
            className="mt-8 inline-block rounded-xl px-7 py-3.5 font-medium text-white shadow-lg transition hover:opacity-90"
            style={brandBg}
          >
            {s.ctaLabel}
          </a>
        )}
      </div>
    </section>
  );
}

export function ServicesSection({ s }: { s: Services }) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <SectionTitle>{s.title}</SectionTitle>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {s.items.map((it, i) => (
          <div
            key={i}
            className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 transition hover:shadow-md"
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl font-semibold text-white"
              style={brandBg}
            >
              {i + 1}
            </div>
            <h3 className="mt-4 font-semibold text-gray-900">{it.name}</h3>
            {it.description && <p className="mt-1.5 text-sm text-gray-600">{it.description}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

export function AboutSection({ s }: { s: About }) {
  return (
    <section className="px-6 py-16" style={tint(5)}>
      <div className="mx-auto max-w-3xl text-center">
        <SectionTitle>{s.title}</SectionTitle>
        {s.body && (
          <p className="mt-6 whitespace-pre-line text-lg leading-relaxed text-gray-700">
            {s.body}
          </p>
        )}
      </div>
    </section>
  );
}

export function WhyUsSection({ s }: { s: WhyUs }) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <SectionTitle>{s.title}</SectionTitle>
      <div className="mt-10 grid gap-8 sm:grid-cols-3">
        {s.points.map((p, i) => (
          <div key={i}>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full font-semibold text-white"
              style={brandBg}
            >
              ✓
            </div>
            <h3 className="mt-3 font-semibold text-gray-900">{p.title}</h3>
            {p.description && <p className="mt-1 text-sm text-gray-600">{p.description}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

export function TestimonialsSection({ s }: { s: Testimonials }) {
  return (
    <section className="px-6 py-16" style={tint(5)}>
      <div className="mx-auto max-w-5xl">
        <SectionTitle>{s.title}</SectionTitle>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {s.items.map((t, i) => (
            <figure key={i} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
              <div className="text-4xl leading-none" style={brand}>
                &ldquo;
              </div>
              <blockquote className="mt-1 text-gray-700">{t.quote}</blockquote>
              {t.author && (
                <figcaption className="mt-3 text-sm font-medium text-gray-500">
                  — {t.author}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactRow({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={tint(12)}>
        {icon}
      </span>
      <span className="text-gray-700">{label}</span>
    </div>
  );
}

export function ContactSection({ s }: { s: Contact }) {
  return (
    <section id="iletisim" className="mx-auto max-w-5xl px-6 py-16">
      <SectionTitle>{s.title}</SectionTitle>
      <div className="mt-10 grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          {s.phone && <ContactRow icon="📞" label={s.phone} />}
          {s.whatsapp && <ContactRow icon="💬" label={`WhatsApp: ${s.whatsapp}`} />}
          {s.email && <ContactRow icon="✉️" label={s.email} />}
          {s.address && <ContactRow icon="📍" label={s.address} />}
          {s.hours && <ContactRow icon="🕐" label={s.hours} />}
        </div>
        {s.showForm && (
          <form className="space-y-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <input
              placeholder="Adınız"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
            />
            <input
              placeholder="E-posta / Telefon"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
            />
            <textarea
              placeholder="Mesajınız"
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
            />
            <button
              type="button"
              className="w-full rounded-lg px-4 py-2.5 font-medium text-white transition hover:opacity-90"
              style={brandBg}
            >
              Gönder
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

// Deterministic section → component mapping (the "registry").
export function renderSection(section: SiteSection, key: number) {
  switch (section.type) {
    case "hero":
      return <HeroSection key={key} s={section} />;
    case "services":
      return <ServicesSection key={key} s={section} />;
    case "about":
      return <AboutSection key={key} s={section} />;
    case "whyUs":
      return <WhyUsSection key={key} s={section} />;
    case "testimonials":
      return <TestimonialsSection key={key} s={section} />;
    case "contact":
      return <ContactSection key={key} s={section} />;
    default:
      return null;
  }
}
