import type { Contact, Resume } from "@/lib/types";

/* Two web templates for v1: "slate" (dark banner) and "modern" (minimal).
   Both single-column, real text — parser-safe. */

export function ResumeSheet({
  resume,
  contact,
  template,
}: {
  resume: Resume;
  contact: Contact;
  template: string;
}) {
  const slate = template === "slate";
  const contactBits = [
    contact.email, contact.phone, contact.location, contact.linkedin, contact.website,
  ].filter(Boolean);

  return (
    <div className="print-sheet bg-white text-[#1c1e21] shadow-[0_16px_44px_-18px_rgba(34,39,31,0.4)] border border-rule text-[13.5px] leading-[1.45]">
      <header className={slate ? "bg-[#232629] text-white px-10 py-8" : "px-10 pt-10 pb-2"}>
        <h1
          className={
            slate
              ? "text-[26px] font-semibold tracking-[0.12em] uppercase"
              : "text-[30px] font-light tracking-wide"
          }
        >
          {contact.name || "Your Name"}
        </h1>
        {resume.headline && (
          <p className={slate ? "text-white/75 mt-1" : "text-[#555] mt-1"}>{resume.headline}</p>
        )}
        <p className={`mt-2 text-[12px] ${slate ? "text-white/55" : "text-[#777]"}`}>
          {contactBits.join("  ·  ")}
        </p>
      </header>

      <div className="px-10 pb-10 pt-4">
        {resume.summary && (
          <Section title="Summary" slate={slate}>
            <p>{resume.summary}</p>
          </Section>
        )}

        {resume.skills?.length > 0 && (
          <Section title="Skills" slate={slate}>
            {resume.skills.map((g) => (
              <p key={g.category} className="mb-0.5">
                <b className="font-semibold">{g.category}:</b> {g.items.join(", ")}
              </p>
            ))}
          </Section>
        )}

        {resume.experience?.length > 0 && (
          <Section title="Experience" slate={slate}>
            {resume.experience.map((j, i) => (
              <div key={i} className="mb-3 break-inside-avoid">
                <div className="flex justify-between items-baseline gap-4">
                  <p>
                    <b className="font-semibold">{j.title}</b>
                    <span className="text-[#666]"> — {j.company}{j.location ? ` · ${j.location}` : ""}</span>
                  </p>
                  <span className="text-[12px] text-[#666] whitespace-nowrap">{j.dates}</span>
                </div>
                <ul className="list-disc ml-5 mt-1 space-y-0.5">
                  {j.bullets.map((b, k) => (
                    <li key={k}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </Section>
        )}

        {resume.projects?.length > 0 && (
          <Section title="Projects" slate={slate}>
            {resume.projects.map((p, i) => (
              <div key={i} className="mb-2.5 break-inside-avoid">
                <p>
                  <b className="font-semibold">{p.name}</b>
                  {p.tech && <span className="text-[#666]"> — {p.tech}</span>}
                </p>
                <ul className="list-disc ml-5 mt-1 space-y-0.5">
                  {p.bullets.map((b, k) => (
                    <li key={k}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </Section>
        )}

        {resume.education?.length > 0 && (
          <Section title="Education" slate={slate}>
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
          <Section title="Certifications" slate={slate}>
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
  slate,
  children,
}: {
  title: string;
  slate: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4">
      <h2
        className={`text-[11px] font-bold uppercase tracking-[0.22em] pb-1 mb-2 border-b ${
          slate ? "border-[#232629]" : "text-[#0f6b5c] border-[#ddd]"
        }`}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
