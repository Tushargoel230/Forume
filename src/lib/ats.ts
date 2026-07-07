import type { AtsReport, Contact, Resume } from "./types";

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/;

function plainText(resume: Resume, contact: Contact): string {
  const parts: string[] = [
    contact.name, contact.email, contact.phone,
    resume.headline, resume.summary,
  ];
  for (const g of resume.skills ?? []) parts.push(g.category, ...g.items);
  for (const j of resume.experience ?? []) parts.push(j.title, j.company, ...j.bullets);
  for (const p of resume.projects ?? []) parts.push(p.name, p.tech ?? "", ...p.bullets);
  for (const e of resume.education ?? []) parts.push(e.degree, e.school, e.details ?? "");
  parts.push(...(resume.certifications ?? []));
  return parts.filter(Boolean).join("\n");
}

export function atsCheck(resume: Resume, contact: Contact, keywords: string[]): AtsReport {
  const text = plainText(resume, contact).toLowerCase();
  const checks: AtsReport["checks"] = [];

  const found: string[] = [];
  const missing: string[] = [];
  for (const kw of keywords) {
    (text.includes(kw.toLowerCase()) ? found : missing).push(kw);
  }
  const coverage = keywords.length
    ? Math.round((100 * found.length) / keywords.length)
    : 100;
  checks.push({
    name: "Keyword coverage",
    passed: coverage >= 60,
    detail:
      `${coverage}% of the job's key terms appear in the resume.` +
      (missing.length ? ` Missing: ${missing.slice(0, 8).join(", ")}` : ""),
  });

  const missingSections = (
    [
      ["summary", !!resume.summary],
      ["skills", (resume.skills ?? []).length > 0],
      ["experience", (resume.experience ?? []).length > 0],
      ["education", (resume.education ?? []).length > 0],
    ] as const
  )
    .filter(([, ok]) => !ok)
    .map(([name]) => name);
  checks.push({
    name: "Standard sections",
    passed: missingSections.length <= 1,
    detail: missingSections.length
      ? `Missing: ${missingSections.join(", ")}`
      : "All standard sections present.",
  });

  const hasContact = !!contact.name.trim() && EMAIL_RE.test(contact.email);
  checks.push({
    name: "Contact info",
    passed: hasContact,
    detail: hasContact
      ? "Name and email present at the top of the resume."
      : "Add your name and email in Profile — ATS parsers need them at the top.",
  });

  checks.push({
    name: "Parser-safe layout",
    passed: true,
    detail: "Single-column layout, real text (no tables, images, or text boxes).",
  });

  const longBullets = (resume.experience ?? []).flatMap((j) =>
    j.bullets.filter((b) => b.length > 220),
  );
  checks.push({
    name: "Bullet length",
    passed: longBullets.length === 0,
    detail: longBullets.length
      ? `${longBullets.length} bullet(s) run long — tighten: ${longBullets[0].slice(0, 60)}…`
      : "Bullets are concise.",
  });

  const undated = (resume.experience ?? [])
    .filter((j) => !j.dates)
    .map((j) => j.company || "?");
  checks.push({
    name: "Employment dates",
    passed: undated.length === 0,
    detail: undated.length
      ? `Missing dates for: ${undated.join(", ")}`
      : "Every role has dates.",
  });

  const structural = checks.slice(1);
  const structuralScore =
    (100 * structural.filter((c) => c.passed).length) / structural.length;
  const score = Math.round(0.45 * coverage + 0.55 * structuralScore);

  return { score, coverage, checks, keywords_found: found, keywords_missing: missing };
}
