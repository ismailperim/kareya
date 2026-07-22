import type { CSSProperties, ReactNode } from "react";

import type { SiteSection } from "@kareya/schemas";

// Component kit v3 (KAR-31/52): one component per Site JSON section type,
// driven entirely by typed props. Design tokens: --brand + --ink/--ink-soft/
// --ink-mut/--surface (set by SiteRenderer). Icons are inline SVG (no emoji).
// Markup mirrors the Astro generator (packages/site-gen/generate.ts).

type Hero = Extract<SiteSection, { type: "hero" }>;
type StatsBar = Extract<SiteSection, { type: "statsBar" }>;
type Process = Extract<SiteSection, { type: "process" }>;
type CtaBanner = Extract<SiteSection, { type: "ctaBanner" }>;
type Services = Extract<SiteSection, { type: "services" }>;
type About = Extract<SiteSection, { type: "about" }>;
type WhyUs = Extract<SiteSection, { type: "whyUs" }>;
type Testimonials = Extract<SiteSection, { type: "testimonials" }>;
type Faq = Extract<SiteSection, { type: "faq" }>;
type Contact = Extract<SiteSection, { type: "contact" }>;

const brand = { color: "var(--brand-ink)" } as const; // brand-hued text stays readable on light surfaces
const brandBg = { backgroundColor: "var(--brand)", color: "var(--on-brand)" } as const;
const ink = { color: "var(--ink)" } as const;
const inkSoft = { color: "var(--ink-soft)" } as const;
const tint = (pct: number) => ({
  background: `color-mix(in srgb, var(--brand) ${pct}%, var(--surface))`,
});
export const displayFont = {
  fontFamily: '"Sora Variable", "Inter Variable", ui-sans-serif, system-ui, sans-serif',
} as const;

const ICON_PATHS: Record<string, string> = {
  phone:
    "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",
  chat: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z",
  pin: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z",
  clock: "M12 6v6l4 2",
};

export function KitIcon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--brand)"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {name === "mail" ? (
        <>
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </>
      ) : name === "pin" ? (
        <>
          <path d={ICON_PATHS.pin} />
          <circle cx="12" cy="10" r="3" />
        </>
      ) : name === "clock" ? (
        <>
          <circle cx="12" cy="12" r="10" />
          <path d={ICON_PATHS.clock} />
        </>
      ) : (
        <path d={ICON_PATHS[name] ?? ICON_PATHS.chat} />
      )}
    </svg>
  );
}

export function monogramInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] ?? "")
      .join("")
      .toUpperCase() || "K"
  );
}

export function Monogram({ name }: { name: string }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold"
      style={brandBg}
    >
      {monogramInitials(name)}
    </span>
  );
}

export type SectionCtx = { hasServices: boolean };

function SectionHeading({ kicker, children }: { kicker: string; children: ReactNode }) {
  return (
    <div className="text-center">
      <div className="text-xs font-semibold uppercase tracking-[0.2em]" style={brand}>
        {kicker}
      </div>
      <h2
        className="mt-2 text-3xl font-semibold leading-[1.15] tracking-tight sm:text-4xl"
        style={{ ...ink, ...displayFont }}
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
        className="absolute inset-0 hidden opacity-40 sm:block"
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
  const ctas = (aligned: boolean) => (
    <div
      className={`mt-10 flex flex-wrap items-center ${aligned ? "justify-center lg:justify-start" : "justify-center"} gap-3`}
    >
      {s.ctaLabel && (
        <a
          href={s.ctaHref}
          className="rounded-xl px-8 py-4 font-semibold shadow-lg transition hover:opacity-90 hover:shadow-xl"
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
          className="rounded-xl border border-gray-200 bg-white/80 px-8 py-4 font-semibold backdrop-blur transition hover:bg-white"
          style={inkSoft}
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
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 text-center sm:py-28 lg:grid-cols-2 lg:text-left">
          <div>
            <h1
              className="text-4xl font-medium leading-[1.1] tracking-tight sm:text-5xl"
              style={{ ...ink, ...displayFont }}
            >
              {s.headline}
            </h1>
            {s.subheadline && (
              <p
                className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed sm:text-xl lg:mx-0"
                style={inkSoft}
              >
                {s.subheadline}
              </p>
            )}
            {ctas(true)}
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
      <div className="relative mx-auto max-w-5xl px-6 py-28 text-center sm:py-36">
        <h1
          className="text-4xl font-medium leading-[1.08] tracking-tight sm:text-7xl"
          style={{ ...ink, ...displayFont }}
        >
          {s.headline}
        </h1>
        <div className="mx-auto mt-8 h-px w-24" style={brandBg} />
        {s.subheadline && (
          <p className="mx-auto mt-8 max-w-2xl text-[17px] leading-relaxed sm:text-xl" style={inkSoft}>
            {s.subheadline}
          </p>
        )}
        {ctas(false)}
      </div>
    </section>
  );
}

export function StatsBarSection({ s }: { s: StatsBar }) {
  if (!s.items.length) return null;
  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <div
        className="grid grid-cols-2 gap-6 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-900/5"
        style={{ gridTemplateColumns: `repeat(${Math.min(s.items.length, 4)}, 1fr)` }}
      >
        {s.items.map((it, i) => (
          <div key={i} className="text-center">
            <div className="text-3xl font-semibold sm:text-4xl" style={{ ...brand, ...displayFont }}>
              {it.value}
            </div>
            <div className="mt-1 text-sm" style={inkSoft}>
              {it.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProcessSection({ s }: { s: Process }) {
  if (!s.steps.length) return null;
  return (
    <section id="surec" className="px-6 py-20 sm:py-24" style={tint(5)}>
      <div className="mx-auto max-w-5xl">
        <SectionHeading kicker="Süreç">{s.title}</SectionHeading>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {s.steps.map((p, i) => (
            <div key={i}>
              <div className="text-4xl font-light" style={{ ...brand, ...displayFont }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="mt-3 text-lg font-semibold" style={{ ...ink, ...displayFont }}>
                {p.title}
              </h3>
              {p.description && (
                <p className="mt-2 text-[15px] leading-relaxed" style={inkSoft}>
                  {p.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CtaBannerSection({ s }: { s: CtaBanner }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="relative overflow-hidden rounded-3xl px-8 py-14 text-center" style={brandBg}>
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(white 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <h2
          className="relative text-2xl font-semibold tracking-tight sm:text-3xl"
          style={{ ...displayFont, color: "var(--on-brand)" }}
        >
          {s.headline}
        </h2>
        <a
          href={s.ctaHref}
          className="relative mt-6 inline-block rounded-xl bg-white px-8 py-3.5 font-semibold transition hover:opacity-90"
          style={brand}
        >
          {s.ctaLabel}
        </a>
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
            <div className="h-px w-8 transition-all group-hover:w-12" style={brandBg} />
            <h3 className="mt-5 text-lg font-semibold" style={{ ...ink, ...displayFont }}>
              {it.name}
            </h3>
            {it.description && (
              <p className="mt-2 text-[15px] leading-relaxed" style={inkSoft}>
                {it.description}
              </p>
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
      <section id="hakkimizda" className="px-6 py-24 sm:py-32" style={tint(5)}>
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
              className="mt-2 text-3xl font-semibold leading-[1.15] tracking-tight sm:text-4xl"
              style={{ ...ink, ...displayFont }}
            >
              {s.title}
            </h2>
            {s.body && (
              <p className="mt-6 whitespace-pre-line text-[17px] leading-8" style={inkSoft}>
                {s.body}
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }
  return (
    <section id="hakkimizda" className="px-6 py-24 sm:py-32" style={tint(5)}>
      <div className="mx-auto max-w-3xl text-center">
        <SectionHeading kicker="Bizi tanıyın">{s.title}</SectionHeading>
        {s.body && (
          <p className="mt-8 whitespace-pre-line text-[17px] leading-8" style={inkSoft}>
            {s.body}
          </p>
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
            <div className="text-4xl font-light" style={{ ...brand, ...displayFont }}>
              {String(i + 1).padStart(2, "0")}
            </div>
            <h3 className="mt-3 text-lg font-semibold" style={{ ...ink, ...displayFont }}>
              {p.title}
            </h3>
            {p.description && (
              <p className="mt-2 text-[15px] leading-relaxed" style={inkSoft}>
                {p.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function TestimonialsSection({ s }: { s: Testimonials }) {
  return (
    <section id="yorumlar" className="px-6 py-24 sm:py-32" style={tint(5)}>
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
              <blockquote className="mt-2 flex-1 leading-relaxed" style={inkSoft}>
                {t.quote}
              </blockquote>
              {t.author && (
                <figcaption className="mt-5 flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold"
                    style={brandBg}
                  >
                    {t.author.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium" style={inkSoft}>
                    {t.author}
                  </span>
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
            <summary
              className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold"
              style={ink}
            >
              {it.question}
              <span className="text-xl transition group-open:rotate-45" style={brand}>
                +
              </span>
            </summary>
            {it.answer && (
              <p className="mt-3 text-[15px] leading-relaxed" style={inkSoft}>
                {it.answer}
              </p>
            )}
          </details>
        ))}
      </div>
    </section>
  );
}

function ContactRow({ iconName, label }: { iconName: string; label: string }) {
  return (
    <div className="flex items-center gap-4">
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={tint(12)}
      >
        <KitIcon name={iconName} />
      </span>
      <span style={inkSoft}>{label}</span>
    </div>
  );
}

export function ContactSection({ s }: { s: Contact }) {
  const rows = [
    s.phone && <ContactRow key="p" iconName="phone" label={s.phone} />,
    s.whatsapp && <ContactRow key="w" iconName="chat" label={`WhatsApp: ${s.whatsapp}`} />,
    s.email && <ContactRow key="e" iconName="mail" label={s.email} />,
    s.address && <ContactRow key="a" iconName="pin" label={s.address} />,
    s.hours && <ContactRow key="h" iconName="clock" label={s.hours} />,
  ].filter(Boolean);

  const inputCls =
    "w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2";
  const ringStyle = { "--tw-ring-color": "var(--brand)" } as CSSProperties;

  return (
    <section id="iletisim" className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
      <SectionHeading kicker="Bize ulaşın">{s.title}</SectionHeading>
      <div className="mt-12 grid items-start gap-10 md:grid-cols-2">
        <div>
          <div className="space-y-5">
            {rows.length ? (
              rows
            ) : (
              <p style={{ color: "var(--ink-mut)" }}>
                İletişim bilgilerimiz çok yakında burada olacak — şimdilik formdan yazabilirsiniz.
              </p>
            )}
          </div>
          {s.showMap && s.address && (
            <iframe
              title="Harita"
              src={`https://www.google.com/maps?q=${encodeURIComponent(s.address)}&output=embed`}
              className="mt-6 h-64 w-full rounded-2xl ring-1 ring-gray-900/10"
              loading="lazy"
            />
          )}
        </div>
        {s.showForm && (
          <form className="space-y-4 rounded-2xl bg-white p-7 shadow-sm ring-1 ring-gray-900/5">
            <input placeholder="Adınız" className={inputCls} style={ringStyle} />
            <input placeholder="E-posta / Telefon" className={inputCls} style={ringStyle} />
            <textarea placeholder="Mesajınız" rows={4} className={inputCls} style={ringStyle} />
            <button
              type="button"
              className="w-full rounded-xl px-5 py-3.5 font-semibold transition hover:opacity-90"
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
    case "statsBar":
      return <StatsBarSection key={key} s={section} />;
    case "process":
      return <ProcessSection key={key} s={section} />;
    case "ctaBanner":
      return <CtaBannerSection key={key} s={section} />;
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
