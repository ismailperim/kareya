import type { CSSProperties, ReactNode } from "react";

import type { SiteSection } from "@kareya/schemas";

// Component kit v2 (KAR-31/52): one component per Site JSON section type,
// driven entirely by typed props. Premium pass: display typography, layered
// hero, refined cards/spacing. Markup mirrors the Astro generator
// (packages/site-gen/generate.ts) — keep them in sync.

type Hero = Extract<SiteSection, { type: "hero" }>;
type Services = Extract<SiteSection, { type: "services" }>;
type About = Extract<SiteSection, { type: "about" }>;
type WhyUs = Extract<SiteSection, { type: "whyUs" }>;
type Testimonials = Extract<SiteSection, { type: "testimonials" }>;
type Faq = Extract<SiteSection, { type: "faq" }>;
type Contact = Extract<SiteSection, { type: "contact" }>;

const brand = { color: "var(--brand)" } as const;
const brandBg = { backgroundColor: "var(--brand)" } as const;
const tint = (pct: number) => ({
  backgroundColor: `color-mix(in srgb, var(--brand) ${pct}%, white)`,
});
export const displayFont = {
  fontFamily: '"Sora Variable", "Inter Variable", ui-sans-serif, system-ui, sans-serif',
} as const;

export type SectionCtx = { hasServices: boolean };

function SectionHeading({ kicker, children }: { kicker: string; children: ReactNode }) {
  return (
    <div className="text-center">
      <div className="text-xs font-semibold uppercase tracking-[0.2em]" style={brand}>
        {kicker}
      </div>
      <h2
        className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
        style={displayFont}
      >
        {children}
      </h2>
    </div>
  );
}

export function HeroSection({ s, ctx }: { s: Hero; ctx: SectionCtx }) {
  const bg = (
    <>
      <div className="absolute inset-0" style={tint(7)} />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(color-mix(in srgb, var(--brand) 22%, white) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div
        className="absolute -right-32 -top-32 h-96 w-96 rounded-full blur-3xl"
        style={{ background: "color-mix(in srgb, var(--brand) 16%, white)" }}
      />
    </>
  );
  const ctas = (
    <div
      className={`mt-10 flex flex-wrap items-center ${s.imageUrl ? "" : "justify-center "}gap-3`}
    >
      {s.ctaLabel && (
        <a
          href={s.ctaHref}
          className="rounded-xl px-8 py-4 font-semibold text-white shadow-lg transition hover:opacity-90 hover:shadow-xl"
          style={{
            ...brandBg,
            boxShadow: "0 10px 25px -5px color-mix(in srgb, var(--brand) 40%, transparent)",
          }}
        >
          {s.ctaLabel}
        </a>
      )}
      {ctx.hasServices && (
        <a
          href="#hizmetler"
          className="rounded-xl border border-gray-200 bg-white/80 px-8 py-4 font-semibold text-gray-700 backdrop-blur transition hover:bg-white"
        >
          Hizmetlerimiz
        </a>
      )}
    </div>
  );

  if (s.imageUrl) {
    return (
      <section className="relative overflow-hidden">
        {bg}
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 sm:py-28 lg:grid-cols-2">
          <div>
            <h1
              className="text-4xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl"
              style={displayFont}
            >
              {s.headline}
            </h1>
            {s.subheadline && (
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-600 sm:text-xl">
                {s.subheadline}
              </p>
            )}
            {ctas}
          </div>
          <div className="relative">
            <div
              className="absolute -inset-4 rounded-3xl opacity-60 blur-2xl"
              style={{ background: "color-mix(in srgb, var(--brand) 18%, white)" }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.imageUrl}
              alt=""
              className="relative aspect-[4/3] w-full rounded-3xl object-cover shadow-2xl ring-1 ring-gray-900/10"
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden">
      {bg}
      <div className="relative mx-auto max-w-4xl px-6 py-28 text-center sm:py-36">
        <h1
          className="text-4xl font-bold leading-tight tracking-tight text-gray-900 sm:text-6xl"
          style={displayFont}
        >
          {s.headline}
        </h1>
        {s.subheadline && (
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600 sm:text-xl">
            {s.subheadline}
          </p>
        )}
        {ctas}
      </div>
    </section>
  );
}

export function ServicesSection({ s }: { s: Services }) {
  return (
    <section id="hizmetler" className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
      <SectionHeading kicker="Neler yapıyoruz">{s.title}</SectionHeading>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {s.items.map((it, i) => (
          <div
            key={i}
            className="group rounded-2xl bg-white p-7 shadow-sm ring-1 ring-gray-900/5 transition hover:-translate-y-1 hover:shadow-xl"
          >
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl font-bold text-white transition group-hover:scale-105"
              style={brandBg}
            >
              {String(i + 1).padStart(2, "0")}
            </div>
            <h3 className="mt-5 text-lg font-semibold text-gray-900" style={displayFont}>
              {it.name}
            </h3>
            {it.description && (
              <p className="mt-2 text-[15px] leading-relaxed text-gray-600">{it.description}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function AboutSection({ s }: { s: About }) {
  if (s.imageUrl) {
    return (
      <section id="hakkimizda" className="px-6 py-20 sm:py-24" style={tint(5)}>
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.imageUrl}
            alt=""
            className="aspect-[4/3] w-full rounded-3xl object-cover shadow-xl ring-1 ring-gray-900/10"
          />
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em]" style={brand}>
              Bizi tanıyın
            </div>
            <h2
              className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
              style={displayFont}
            >
              {s.title}
            </h2>
            {s.body && (
              <p className="mt-6 whitespace-pre-line text-lg leading-8 text-gray-700">{s.body}</p>
            )}
          </div>
        </div>
      </section>
    );
  }
  return (
    <section id="hakkimizda" className="px-6 py-20 sm:py-24" style={tint(5)}>
      <div className="mx-auto max-w-3xl text-center">
        <SectionHeading kicker="Bizi tanıyın">{s.title}</SectionHeading>
        {s.body && (
          <p className="mt-8 whitespace-pre-line text-lg leading-8 text-gray-700">{s.body}</p>
        )}
      </div>
    </section>
  );
}

export function WhyUsSection({ s }: { s: WhyUs }) {
  return (
    <section id="neden-biz" className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
      <SectionHeading kicker="Farkımız">{s.title}</SectionHeading>
      <div className="mt-12 grid gap-10 sm:grid-cols-3">
        {s.points.map((p, i) => (
          <div key={i} className="text-center sm:text-left">
            <div
              className="mx-auto flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold text-white sm:mx-0"
              style={brandBg}
            >
              ✓
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900" style={displayFont}>
              {p.title}
            </h3>
            {p.description && (
              <p className="mt-2 text-[15px] leading-relaxed text-gray-600">{p.description}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function TestimonialsSection({ s }: { s: Testimonials }) {
  return (
    <section id="yorumlar" className="px-6 py-20 sm:py-24" style={tint(5)}>
      <div className="mx-auto max-w-6xl">
        <SectionHeading kicker="Referanslar">{s.title}</SectionHeading>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {s.items.map((t, i) => (
            <figure
              key={i}
              className="flex flex-col rounded-2xl bg-white p-7 shadow-sm ring-1 ring-gray-900/5"
            >
              <div className="text-5xl leading-none" style={brand}>
                &ldquo;
              </div>
              <blockquote className="mt-2 flex-1 leading-relaxed text-gray-700">
                {t.quote}
              </blockquote>
              {t.author && (
                <figcaption className="mt-5 flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={brandBg}
                  >
                    {t.author.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-gray-600">{t.author}</span>
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FaqSection({ s }: { s: Faq }) {
  return (
    <section id="sss" className="mx-auto max-w-3xl px-6 py-20 sm:py-24">
      <SectionHeading kicker="Merak edilenler">{s.title}</SectionHeading>
      <div className="mt-10 space-y-3">
        {s.items.map((it, i) => (
          <details
            key={i}
            className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-900/5 transition open:shadow-md"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-gray-900">
              {it.question}
              <span className="text-xl transition group-open:rotate-45" style={brand}>
                +
              </span>
            </summary>
            {it.answer && (
              <p className="mt-3 text-[15px] leading-relaxed text-gray-600">{it.answer}</p>
            )}
          </details>
        ))}
      </div>
    </section>
  );
}

function ContactRow({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-4">
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg"
        style={tint(12)}
      >
        {icon}
      </span>
      <span className="text-gray-700">{label}</span>
    </div>
  );
}

export function ContactSection({ s }: { s: Contact }) {
  const rows = [
    s.phone && <ContactRow key="p" icon="📞" label={s.phone} />,
    s.whatsapp && <ContactRow key="w" icon="💬" label={`WhatsApp: ${s.whatsapp}`} />,
    s.email && <ContactRow key="e" icon="✉️" label={s.email} />,
    s.address && <ContactRow key="a" icon="📍" label={s.address} />,
    s.hours && <ContactRow key="h" icon="🕐" label={s.hours} />,
  ].filter(Boolean);

  const inputCls =
    "w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2";
  const ringStyle = { "--tw-ring-color": "var(--brand)" } as CSSProperties;

  return (
    <section id="iletisim" className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
      <SectionHeading kicker="Bize ulaşın">{s.title}</SectionHeading>
      <div className="mt-12 grid items-start gap-10 md:grid-cols-2">
        <div className="space-y-5">
          {rows.length ? (
            rows
          ) : (
            <p className="text-gray-500">
              İletişim bilgilerimiz çok yakında burada olacak — şimdilik formdan yazabilirsiniz.
            </p>
          )}
        </div>
        {s.showForm && (
          <form className="space-y-4 rounded-2xl bg-white p-7 shadow-sm ring-1 ring-gray-900/5">
            <input placeholder="Adınız" className={inputCls} style={ringStyle} />
            <input placeholder="E-posta / Telefon" className={inputCls} style={ringStyle} />
            <textarea placeholder="Mesajınız" rows={4} className={inputCls} style={ringStyle} />
            <button
              type="button"
              className="w-full rounded-xl px-5 py-3.5 font-semibold text-white transition hover:opacity-90"
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
export function renderSection(section: SiteSection, key: number, ctx: SectionCtx) {
  switch (section.type) {
    case "hero":
      return <HeroSection key={key} s={section} ctx={ctx} />;
    case "services":
      return <ServicesSection key={key} s={section} />;
    case "about":
      return <AboutSection key={key} s={section} />;
    case "whyUs":
      return <WhyUsSection key={key} s={section} />;
    case "testimonials":
      return <TestimonialsSection key={key} s={section} />;
    case "faq":
      return <FaqSection key={key} s={section} />;
    case "contact":
      return <ContactSection key={key} s={section} />;
    default:
      return null;
  }
}
