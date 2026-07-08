import type { Contact, Resume } from "@/lib/types";

/* Six web templates, all single-column real text — parser-safe.
   Keep ids in sync with TEMPLATES (used by the dashboard select). */

export const TEMPLATES: { id: string; name: string; blurb: string }[] = [
  { id: "slate", name: "Onyx", blurb: "Confident dark header" },
  { id: "modern", name: "Air", blurb: "Minimal, restrained, modern" },
  { id: "classic", name: "Century", blurb: "Centered and timeless" },
  { id: "accent", name: "Scarlet", blurb: "A crimson edge" },
  { id: "executive", name: "Regent", blurb: "Small caps, senior calm" },
  { id: "compact", name: "Folio", blurb: "Dense — fits one page" },
];

type Theme = {
  sheet: string;
  header: string;
  name: string;
  headline: string;
  contact: string;
  sectionTitle: string;
  centered?: boolean;
};

const THEMES: Record<string, Theme> = {
  slate: {
    sheet: "",
    header: "bg-[#232629] text-white px-10 py-8",
    name: "text-[26px] font-semibold tracking-[0.12em] uppercase",
    headline: "text-white/75 mt-1",
    contact: "text-white/55",
    sectionTitle: "border-[#232629]",
  },
  modern: {
    sheet: "",
    header: "px-10 pt-10 pb-2",
    name: "text-[30px] font-light tracking-wide",
    headline: "text-[#555] mt-1",
    contact: "text-[#777]",
    sectionTitle: "text-[#0f6b5c] border-[#ddd]",
  },
  classic: {
    sheet: "",
    header: "px-10 pt-10 pb-3 text-center border-b-2 border-[#1c1e21] mx-10 !px-0",
    name: "font-display text-[28px] tracking-[0.04em]",
    headline: "text-[#555] mt-1 italic font-display",
    contact: "text-[#777]",
    sectionTitle: "border-[#bbb] text-[#1c1e21]",
    centered: true,
  },
  accent: {
    sheet: "border-l-[6px] border-l-[#c5283d]",
    header: "px-10 pt-10 pb-2",
    name: "text-[28px] font-semibold text-[#c5283d]",
    headline: "text-[#555] mt-1",
    contact: "text-[#777]",
    sectionTitle: "text-[#c5283d] border-[#e8c2c8]",
  },
  executive: {
    sheet: "",
    header: "px-10 pt-11 pb-4 text-center",
    name: "font-display text-[24px] uppercase tracking-[0.22em]",
    headline: "text-[#555] mt-2 font-display italic",
    contact: "text-[#777] border-y border-[#1c1e21] py-1.5 mt-3 inline-block px-4",
    sectionTitle: "font-display normal-case tracking-[0.14em] text-[13px] border-[#1c1e21]",
    centered: true,
  },
  compact: {
    sheet: "text-[12px] leading-[1.35]",
    header: "px-8 pt-7 pb-1",
    name: "text-[22px] font-bold",
    headline: "text-[#555] mt-0.5",
    contact: "text-[#777]",
    sectionTitle: "border-[#ddd]",
  },
};

export function ResumeSheet({
  resume,
  contact,
  template,
}: {
  resume: Resume;
  contact: Contact;
  template: string;
}) {
  const t = THEMES[template] ?? THEMES.slate;
  const compact = template === "compact";
  const contactBits = [
    contact.email, contact.phone, contact.location, contact.linkedin, contact.website,
  ].filter(Boolean);

  return (
    <div className={`print-sheet bg-white text-[#1c1e21] shadow-[0_16px_44px_-18px_rgba(34,39,31,0.4)] border border-rule text-[13.5px] leading-[1.45] ${t.sheet}`}>
      <header className={t.header}>
        <h1 className={t.name}>{contact.name || "Your Name"}</h1>
        {resume.headline && <p className={t.headline}>{resume.headline}</p>}
        <p className={`mt-2 text-[12px] ${t.contact}`}>{contactBits.join("  ·  ")}</p>
      </header>

      <div className={compact ? "px-8 pb-7 pt-2" : "px-10 pb-10 pt-4"}>
        {resume.summary && (
          <Section title="Summary" t={t} compact={compact}>
            <p>{resume.summary}</p>
          </Section>
        )}

        {resume.skills?.length > 0 && (
          <Section title="Skills" t={t} compact={compact}>
            {resume.skills.map((g) => (
              <p key={g.category} className="mb-0.5">
                <b className="font-semibold">{g.category}:</b> {g.items.join(", ")}
              </p>
            ))}
          </Section>
        )}

        {resume.experience?.length > 0 && (
          <Section title="Experience" t={t} compact={compact}>
            {resume.experience.map((j, i) => (
              <div key={i} className={`${compact ? "mb-2" : "mb-3"} break-inside-avoid`}>
                <div className="flex justify-between items-baseline gap-4">
                  <p>
                    <b className="font-semibold">{j.title}</b>
                    <span className="text-[#666]"> — {j.company}{j.location ? ` · ${j.location}` : ""}</span>
                  </p>
                  <span className="text-[12px] text-[#666] whitespace-nowrap">{j.dates}</span>
                </div>
                <ul className={`list-disc ml-5 mt-1 ${compact ? "space-y-0" : "space-y-0.5"}`}>
                  {j.bullets.map((b, k) => (
                    <li key={k}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </Section>
        )}

        {resume.projects?.length > 0 && (
          <Section title="Projects" t={t} compact={compact}>
            {resume.projects.map((p, i) => (
              <div key={i} className={`${compact ? "mb-1.5" : "mb-2.5"} break-inside-avoid`}>
                <p>
                  <b className="font-semibold">{p.name}</b>
                  {p.tech && <span className="text-[#666]"> — {p.tech}</span>}
                </p>
                <ul className={`list-disc ml-5 mt-1 ${compact ? "space-y-0" : "space-y-0.5"}`}>
                  {p.bullets.map((b, k) => (
                    <li key={k}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </Section>
        )}

        {resume.education?.length > 0 && (
          <Section title="Education" t={t} compact={compact}>
            {resume.education.map((e, i) => (
              <div key={i} className="mb-1.5 flex justify-between items-baseline gap-4">
                <p>
                  <b className="font-semibold">{e.degree}</b>
                  <span className="text-[#666]"> — {e.school}</span>
                  {e.details && <span className="block text-[12px] text-[#666]">{e.details}</span>}
                </p>
                <span className="text-[12px] text-[#666] whitespace-nowrap">{e.dates}</span>
              </div>
            ))}
          </Section>
        )}

        {resume.certifications?.length > 0 && (
          <Section title="Certifications" t={t} compact={compact}>
            <ul className="list-disc ml-5 space-y-0.5">
              {resume.certifications.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  t,
  compact,
  children,
}: {
  title: string;
  t: Theme;
  compact: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={compact ? "mt-2.5" : "mt-4"}>
      <h2
        className={`text-[11px] font-bold uppercase tracking-[0.22em] pb-1 mb-2 border-b ${t.sectionTitle} ${
          t.centered ? "text-center" : ""
        }`}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
