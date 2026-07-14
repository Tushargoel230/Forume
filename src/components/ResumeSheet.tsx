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
  { id: "lebenslauf", name: "Lebenslauf", blurb: "German tabular CV, dates left" },
];

type Theme = {
  sheet: string;
  header: string;
  name: string;
  headline: string;
  contact: string;
  sectionTitle: string;
  centered?: boolean;
  /* border/ring tuning for the optional passport-style CV photo */
  photo?: string;
};

const THEMES: Record<string, Theme> = {
  slate: {
    sheet: "",
    header: "bg-[#232629] text-white px-10 py-8",
    name: "text-[26px] font-semibold tracking-[0.12em] uppercase",
    headline: "text-white/75 mt-1",
    contact: "text-white/55",
    sectionTitle: "border-[#232629]",
    photo: "ring-1 ring-white/30",
  },
  modern: {
    sheet: "",
    header: "px-10 pt-10 pb-2",
    name: "text-[30px] font-light tracking-wide",
    headline: "text-[#555] mt-1",
    contact: "text-[#777]",
    sectionTitle: "text-[#0f6b5c] border-[#ddd]",
    photo: "border border-black/10",
  },
  classic: {
    sheet: "",
    header: "px-10 pt-10 pb-3 text-center border-b-2 border-[#1c1e21] mx-10 !px-0",
    name: "font-display text-[28px] tracking-[0.04em]",
    headline: "text-[#555] mt-1 italic font-display",
    contact: "text-[#777]",
    sectionTitle: "border-[#bbb] text-[#1c1e21]",
    centered: true,
    photo: "border border-black/10",
  },
  accent: {
    sheet: "border-l-[6px] border-l-[#c5283d]",
    header: "px-10 pt-10 pb-2",
    name: "text-[28px] font-semibold text-[#c5283d]",
    headline: "text-[#555] mt-1",
    contact: "text-[#777]",
    sectionTitle: "text-[#c5283d] border-[#e8c2c8]",
    photo: "border-2 border-[#c5283d]/70",
  },
  executive: {
    sheet: "",
    header: "px-10 pt-11 pb-4 text-center",
    name: "font-display text-[24px] uppercase tracking-[0.22em]",
    headline: "text-[#555] mt-2 font-display italic",
    contact: "text-[#777] border-y border-[#1c1e21] py-1.5 mt-3 inline-block px-4",
    sectionTitle: "font-display normal-case tracking-[0.14em] text-[13px] border-[#1c1e21]",
    centered: true,
    photo: "border border-[#1c1e21]/25",
  },
  compact: {
    sheet: "text-[12px] leading-[1.35]",
    header: "px-8 pt-7 pb-1",
    name: "text-[22px] font-bold",
    headline: "text-[#555] mt-0.5",
    contact: "text-[#777]",
    sectionTitle: "border-[#ddd]",
    photo: "border border-black/10",
  },
};

export function ResumeSheet({
  resume,
  contact,
  template,
  showPhoto = true,
}: {
  resume: Resume;
  contact: Contact;
  template: string;
  showPhoto?: boolean;
}) {
  if (template === "lebenslauf") {
    return <LebenslaufSheet resume={resume} contact={contact} showPhoto={showPhoto} />;
  }
  const t = THEMES[template] ?? THEMES.slate;
  const compact = template === "compact";
  const contactBits = [
    contact.email, contact.phone, contact.location, contact.linkedin, contact.website,
  ].filter(Boolean);

  const photoEl =
    showPhoto && contact.photo ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={contact.photo}
        alt={contact.name || "Profile photo"}
        className={`cv-photo shrink-0 w-24 aspect-[3.5/4.5] rounded-md object-cover break-inside-avoid ${t.photo ?? ""}`}
      />
    ) : null;

  const textBlock = (
    <>
      <h1 className={t.name}>{contact.name || "Your Name"}</h1>
      {resume.headline && <p className={t.headline}>{resume.headline}</p>}
      <p className={`mt-2 text-[12px] ${t.contact}`}>{contactBits.join("  ·  ")}</p>
    </>
  );

  return (
    <div className={`print-sheet bg-white text-[#1c1e21] shadow-[0_16px_44px_-18px_rgba(34,39,31,0.4)] border border-rule text-[13.5px] leading-[1.45] ${t.sheet}`}>
      <header className={t.header}>
        {t.centered ? (
          <div className="flex flex-col items-center">
            {photoEl && <div className="mb-3">{photoEl}</div>}
            {textBlock}
          </div>
        ) : (
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">{textBlock}</div>
            {photoEl}
          </div>
        )}
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
    <section className={compact ? "mt-3" : "mt-5"}>
      <h2
        className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] pb-1.5 mb-2.5 border-b ${t.sectionTitle} ${
          t.centered ? "justify-center" : ""
        }`}
      >
        <span aria-hidden className="inline-block h-[6px] w-[6px] rotate-45 bg-crimson shrink-0" />
        {title}
      </h2>
      {children}
    </section>
  );
}

/* German-style Lebenslauf: a dates-left tabular CV with a top-right photo and a
   personal-details block — the layout German recruiters expect (and no US-market
   competitor renders natively). Section headings are in German; body content
   stays in whatever language the resume was written in. */
function LebenslaufSheet({
  resume, contact, showPhoto,
}: {
  resume: Resume;
  contact: Contact;
  showPhoto: boolean;
}) {
  const contactBits = [
    contact.email, contact.phone, contact.location, contact.linkedin, contact.website,
  ].filter(Boolean);

  return (
    <div className="print-sheet bg-white text-[#1c1e21] shadow-[0_16px_44px_-18px_rgba(34,39,31,0.4)] border border-rule text-[13px] leading-[1.5]">
      <header className="flex items-start justify-between gap-6 border-b-2 border-[#1c1e21] px-10 pt-10 pb-5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#8a8d91]">Lebenslauf</p>
          <h1 className="mt-1 font-display text-[30px] leading-tight tracking-[0.02em]">{contact.name || "Ihr Name"}</h1>
          {resume.headline && <p className="mt-1 text-[#555] italic font-display">{resume.headline}</p>}
          <p className="mt-3 text-[12px] text-[#666] leading-relaxed">{contactBits.join("  ·  ")}</p>
        </div>
        {showPhoto && contact.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={contact.photo}
            alt={contact.name || "Bewerbungsfoto"}
            className="cv-photo shrink-0 w-28 aspect-[3.5/4.5] rounded-sm object-cover border border-[#1c1e21]/25 break-inside-avoid"
          />
        )}
      </header>

      <div className="px-10 pb-10 pt-5">
        {resume.summary && (
          <LlSection title="Profil">
            <p>{resume.summary}</p>
          </LlSection>
        )}

        {resume.experience?.length > 0 && (
          <LlSection title="Berufserfahrung">
            {resume.experience.map((j, i) => (
              <LlRow key={i} dates={j.dates}>
                <p>
                  <b className="font-semibold">{j.title}</b>
                  <span className="text-[#666]"> — {j.company}{j.location ? `, ${j.location}` : ""}</span>
                </p>
                <ul className="list-disc ml-5 mt-1 space-y-0.5">
                  {j.bullets.map((b, k) => <li key={k}>{b}</li>)}
                </ul>
              </LlRow>
            ))}
          </LlSection>
        )}

        {resume.projects?.length > 0 && (
          <LlSection title="Projekte">
            {resume.projects.map((p, i) => (
              <LlRow key={i} dates={p.tech}>
                <p><b className="font-semibold">{p.name}</b></p>
                <ul className="list-disc ml-5 mt-1 space-y-0.5">
                  {p.bullets.map((b, k) => <li key={k}>{b}</li>)}
                </ul>
              </LlRow>
            ))}
          </LlSection>
        )}

        {resume.education?.length > 0 && (
          <LlSection title="Ausbildung">
            {resume.education.map((e, i) => (
              <LlRow key={i} dates={e.dates}>
                <p>
                  <b className="font-semibold">{e.degree}</b>
                  <span className="text-[#666]"> — {e.school}</span>
                </p>
                {e.details && <p className="text-[12px] text-[#666]">{e.details}</p>}
              </LlRow>
            ))}
          </LlSection>
        )}

        {resume.skills?.length > 0 && (
          <LlSection title="Kenntnisse">
            {resume.skills.map((g) => (
              <LlRow key={g.category} dates={g.category}>
                <p>{g.items.join(", ")}</p>
              </LlRow>
            ))}
          </LlSection>
        )}

        {resume.certifications?.length > 0 && (
          <LlSection title="Zertifikate">
            <LlRow dates="">
              <ul className="list-disc ml-5 space-y-0.5">
                {resume.certifications.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </LlRow>
          </LlSection>
        )}
      </div>
    </div>
  );
}

function LlSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 first:mt-0">
      <h2 className="mb-3 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.2em] text-[#1c1e21]">
        <span aria-hidden className="inline-block h-[6px] w-[6px] rotate-45 bg-crimson shrink-0" />
        {title}
      </h2>
      {children}
    </section>
  );
}

/* One tabular row: the date/label sits in a fixed left column, content on the right. */
function LlRow({ dates, children }: { dates?: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 grid grid-cols-[130px_1fr] gap-4 break-inside-avoid">
      <div className="text-[12px] text-[#666] whitespace-pre-line">{dates}</div>
      <div>{children}</div>
    </div>
  );
}
