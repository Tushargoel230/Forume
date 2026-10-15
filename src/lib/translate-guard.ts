import type { Resume } from "./types";

/* Deterministic faithfulness guard for /api/translate. A translation may only
   change the language — never add, drop, or alter a fact. This is a pure
   function (no I/O) so it can be unit-checked and reused by any engine.

   It fails a translation when:
   - an experience/projects/education/certifications list changed length
   - an experience or project entry changed its bullet count
   - any digit sequence present in the input resume is missing from the output */

export type GuardResult = { ok: true } | { ok: false; reason: string };

/** Every string value in the resume, flattened. */
function allText(r: Resume): string {
  const out: string[] = [r.headline, r.summary];
  for (const g of r.skills ?? []) out.push(g.category, ...g.items);
  for (const j of r.experience ?? []) out.push(j.title, j.company, j.location ?? "", j.dates ?? "", ...j.bullets);
  for (const p of r.projects ?? []) out.push(p.name, p.tech ?? "", ...p.bullets);
  for (const e of r.education ?? []) out.push(e.degree, e.school, e.dates ?? "", e.details ?? "");
  out.push(...(r.certifications ?? []));
  return out.join("\n");
}

const digitSequences = (s: string): string[] => s.match(/\d+/g) ?? [];

export function checkTranslation(input: Resume, output: Resume): GuardResult {
  const lists = ["experience", "projects", "education", "certifications"] as const;
  for (const key of lists) {
    const a = input[key]?.length ?? 0;
    const b = output[key]?.length ?? 0;
    if (a !== b) return { ok: false, reason: `${key} count changed (${a} → ${b})` };
  }

  for (const key of ["experience", "projects"] as const) {
    const inList = input[key] ?? [];
    const outList = output[key] ?? [];
    for (let i = 0; i < inList.length; i++) {
      const a = inList[i].bullets?.length ?? 0;
      const b = outList[i]?.bullets?.length ?? 0;
      if (a !== b) return { ok: false, reason: `${key}[${i}] bullet count changed (${a} → ${b})` };
    }
  }

  const outDigits = new Set(digitSequences(allText(output)));
  for (const d of new Set(digitSequences(allText(input)))) {
    if (!outDigits.has(d)) return { ok: false, reason: `number "${d}" is missing from the translation` };
  }

  return { ok: true };
}

/** Cover-letter check: if the input letter had text, the output must too, and
    every number in the input must survive. */
export function checkCoverTranslation(input: string, output: string): GuardResult {
  if (input.trim() && !output.trim()) return { ok: false, reason: "cover letter came back empty" };
  const outDigits = new Set(digitSequences(output));
  for (const d of new Set(digitSequences(input))) {
    if (!outDigits.has(d)) return { ok: false, reason: `number "${d}" is missing from the cover letter` };
  }
  return { ok: true };
}
