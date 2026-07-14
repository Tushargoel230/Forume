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

/* --- keyword normalization + synonym matching ---------------------------
   The old check was a raw `text.includes(kw)`, which missed "React" vs
   "React.js", "JS" vs "JavaScript", "K8s" vs "Kubernetes", etc., and so
   systematically understated coverage and generated spurious "missing
   keyword" fixes. We normalize punctuation to spaces, match on word
   boundaries, and expand each keyword to a group of known equivalents. */

/** Groups of interchangeable terms. Matching any member counts the keyword. */
const SYNONYM_GROUPS: string[][] = [
  ["javascript", "js"],
  ["typescript", "ts"],
  ["react", "react js", "reactjs"],
  ["node", "node js", "nodejs"],
  ["vue", "vue js", "vuejs"],
  ["angular", "angular js", "angularjs"],
  ["next", "next js", "nextjs"],
  ["kubernetes", "k8s"],
  ["docker", "containerization", "containers"],
  ["postgresql", "postgres", "psql"],
  ["mongodb", "mongo"],
  ["amazon web services", "aws"],
  ["google cloud", "google cloud platform", "gcp"],
  ["microsoft azure", "azure"],
  ["continuous integration continuous delivery", "ci cd", "cicd", "ci/cd"],
  ["machine learning", "ml"],
  ["artificial intelligence", "ai"],
  ["natural language processing", "nlp"],
  ["large language model", "large language models", "llm", "llms"],
  ["computer vision", "cv"],
  ["deep learning", "dl"],
  ["representational state transfer", "rest", "restful", "rest api"],
  ["graphql", "graph ql"],
  ["object oriented programming", "oop", "object oriented"],
  ["test driven development", "tdd"],
  ["user interface", "ui"],
  ["user experience", "ux"],
  ["c plus plus", "cpp", "c++"],
  ["c sharp", "csharp", "c#"],
  ["dot net", "dotnet", ".net"],
  ["golang", "go lang"],
  ["structured query language", "sql"],
  ["robot operating system", "ros"],
  ["computer aided design", "cad"],
  ["software development kit", "sdk"],
  ["application programming interface", "api", "apis"],
  ["infrastructure as code", "iac"],
  ["extract transform load", "etl"],
];

const NUM_WORDS: Record<string, string> = {
  zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5",
  six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
};

/** Lowercase, turn any non-alphanumeric run into a single space, trim. */
function normalize(s: string): string {
  let out = s.toLowerCase().replace(/[^a-z0-9+#]+/g, " ");
  // fold small number-words to digits so "five years" ~ "5 years"
  out = out.replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten)\b/g, (m) => NUM_WORDS[m]);
  return ` ${out.replace(/\s+/g, " ").trim()} `;
}

/** All accepted surface forms for a keyword (itself + any synonym group it hits). */
function variantsFor(keyword: string): string[] {
  const norm = normalize(keyword).trim();
  const set = new Set<string>([norm]);
  for (const group of SYNONYM_GROUPS) {
    const normed = group.map((g) => normalize(g).trim());
    if (normed.includes(norm)) normed.forEach((g) => set.add(g));
  }
  return [...set].filter(Boolean);
}

/** True if any variant of the keyword appears as a whole word/phrase in text. */
function keywordPresent(normalizedText: string, keyword: string): boolean {
  for (const v of variantsFor(keyword)) {
    if (normalizedText.includes(` ${v} `)) return true;
  }
  return false;
}

export function atsCheck(resume: Resume, contact: Contact, keywords: string[]): AtsReport {
  const normText = normalize(plainText(resume, contact));
  const checks: AtsReport["checks"] = [];

  const found: string[] = [];
  const missing: string[] = [];
  for (const kw of keywords) {
    (keywordPresent(normText, kw) ? found : missing).push(kw);
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

  // Real signal (replaces the old always-true "parser-safe layout" check):
  // recruiters and ATS ranking reward quantified impact. Count experience
  // bullets that carry a number (%, count, €/$, x, or a year).
  const bullets = (resume.experience ?? []).flatMap((j) => j.bullets);
  const quantified = bullets.filter((b) => /\d/.test(b)).length;
  const quantRatio = bullets.length ? quantified / bullets.length : 1;
  checks.push({
    name: "Quantified impact",
    passed: quantRatio >= 0.3,
    detail: bullets.length
      ? `${quantified} of ${bullets.length} experience bullets include a concrete number.` +
        (quantRatio < 0.3 ? " Add metrics (%, counts, time saved) to more bullets." : "")
      : "Add experience bullets with measurable outcomes.",
  });

  const longBullets = bullets.filter((b) => b.length > 220);
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
  // Keyword coverage and parse-quality weigh equally — a resume that misses
  // half the JD's terms should not score well on structure alone, and vice-versa.
  const score = Math.round(0.5 * coverage + 0.5 * structuralScore);

  return { score, coverage, checks, keywords_found: found, keywords_missing: missing };
}
