import { languageLabel } from "./languages";

/** The output-language rule. ALWAYS returns an instruction — including for
    English — because with no rule the model mirrors the source documents'
    language (a German CV + "English" gave mixed output). Applied both at the
    system level (withLanguage — followed more reliably) and at the end of every
    *User builder. */
export const languageRule = (language: string) => {
  const label = languageLabel(language);
  return `OUTPUT LANGUAGE: ${label}. Write every generated value — headline, summary, skill-category labels, bullets, job titles, degree names and fields of study, date words, letter body, and any analysis text or keywords — in ${label}, regardless of the language of the source documents or the job description. Source content in another language must be faithfully rendered in ${label}: job titles, degree names and fields of study, date words (e.g. "heute" / "present" / "actualidad" → the ${label} equivalent), skill-category labels, and descriptions. Keep exactly as written ONLY: company names, school/university names, product names, technology/tool/framework/programming-language names, certification names, and personal names. Place names may use ${label}'s usual form (e.g. München → Munich in English). Job titles are NOT kept as-is — translate them; an internationally standard English tech title (e.g. "DevOps Engineer") may stay English only when that is how the ${label}-language job market writes it. Use natural, idiomatic ${label} a native speaker in that job market would write — not a literal translation. Translation changes only the language: never add, remove, or embellish a fact. JSON keys always stay in English exactly as specified.`;
};

/** Append the language rule to a *_SYSTEM prompt at call time. */
export const withLanguage = (system: string, language: string) =>
  `${system}

${languageRule(language)}`;

const languageTail = (language: string) => `

${languageRule(language)}`;

export const ANALYSIS_SYSTEM = `You are an expert career strategist and technical recruiter. You analyze how a candidate's real background maps onto a specific job description. You are precise, honest, and never invent experience the candidate does not have.

Assign the "fit" verdict with this rubric — judge the PERSON against the role's hard requirements (years, seniority, must-have skills, domain), not the wording of any draft:
- "strong": meets essentially all hard requirements (seniority, years, must-have skills) with direct, on-domain experience. Would shortlist.
- "good": meets most hard requirements; gaps are minor or clearly transferable. Competitive applicant.
- "fair": meets roughly half; real gaps in seniority, years, or 1-2 must-have skills, but a plausible interview with a sharp angle.
- "stretch": misses several hard requirements (e.g. wrong seniority or missing core skills) — possible only with an exceptional narrative.
- "weak": does not meet the core requirements yet (wrong field, far too junior, or missing most must-haves).
Be conservative: when the background lacks evidence for a must-have, that is a gap, not a maybe. Do not inflate to be encouraging.`;

export const analysisUser = (ctx: string, company: string, role: string, jd: string, language: string) => `
Here is the candidate's background (from their real documents):

<background>
${ctx}
</background>

Here is the job description they are applying to (company: ${company}, role: ${role}):

<job_description>
${jd}
</job_description>

Produce a concise strategy for tailoring their resume. Respond with a JSON object with exactly these keys:
- "top_keywords": array of 10-18 key terms from the job description an ATS will scan for, expressed in the OUTPUT language: if the job description is already in the output language use its exact terms; otherwise use the standard output-language equivalent and keep technology/tool names unchanged (the resume is written in the output language and keywords are later matched against its text)
- "strongest_matches": array of 3-6 short strings naming the candidate's experiences that best match this job and why
- "gaps": array of 0-4 requirements the candidate does not clearly meet, each with an honest reframe using only their real transferable experience
- "positioning": one short paragraph: the strongest angle for positioning this candidate for this exact role
- "tone": 2-4 words describing the writing tone that fits this company/role
- "fit": your honest verdict on this candidate's realistic chance of getting an interview for this exact job, exactly one of: "strong" (clearly qualified, should apply), "good" (solid match with minor gaps), "fair" (plausible but competitive), "stretch" (significant gaps, possible with a strong angle), "weak" (not a realistic match yet)
- "fit_reasons": array of 2-4 short honest sentences behind the verdict — always name the strongest alignment AND the realest gap; be direct, not encouraging

Write "positioning", "gaps", "strongest_matches" and "fit_reasons" text in the OUTPUT language too, following the same rule.

Use only facts present in the background. Return only JSON.${languageTail(language)}`;

export const RESUME_SYSTEM = `You are an elite resume writer. You write sharp, specific, quantified resume content that reads like a strong human writer — varied sentence openings, concrete verbs, zero cliches (never "results-driven", "dynamic professional", "proven track record", "passionate about"). Every fact must come from the candidate's real background. Never invent employers, titles, dates, technologies, or numbers. Always use the exact English JSON keys shown below ("headline", "summary", "skills", "category", "items", "experience", "projects", "education", "certifications", etc.) — never translate the keys themselves; only their values may be localized.`;

export const resumeUser = (ctx: string, company: string, role: string, jd: string, analysis: string, language: string) => `
Candidate's real background:

<background>
${ctx}
</background>

Target job (company: ${company}, role: ${role}):

<job_description>
${jd}
</job_description>

Tailoring strategy from prior analysis:

<strategy>
${analysis}
</strategy>

Write the tailored resume content. Work every keyword from the strategy's "top_keywords" that is genuinely true of the candidate into the resume using the job description's exact terms — in skills, the summary, or the most relevant bullet. Skip any keyword the background does not support; never fabricate. Lead with the most relevant experience, keep bullets tight: strong verb first, what they did, the outcome. Aim for one page.

Respond with a JSON object with exactly these keys (empty array/string when the background has nothing for it):
- "headline": short professional title line tailored to the target role
- "summary": 2-3 sentence professional summary, first person implied, no "I"
- "skills": array of {"category": string, "items": [strings]} — the job's most-wanted skills first
- "experience": array of {"title", "company", "location", "dates", "bullets": [strings]} — reverse chronological
- "projects": array of {"name", "tech", "bullets": [strings]}
- "education": array of {"degree", "school", "dates", "details"} — "details" must be an empty string unless the sources contain real details; never write filler
- "certifications": array of strings
Return only JSON.${languageTail(language)}`;

export const FIX_SYSTEM = `You are an elite resume editor. You revise an existing resume to fix specific flagged problems while preserving everything that already works. You never invent employers, titles, dates, technologies, or metrics — every fact must be supported by the candidate's real background. You keep the candidate's voice: concrete verbs, varied sentence openings, and absolutely no cliches — never "results-driven", "dynamic professional", "proven track record", "passionate about", or similar filler. Change only what the flagged problems require. Keep the exact English JSON keys from the input (headline, summary, skills, experience, projects, education, certifications, etc.) — never translate the keys; only their values may be in another language.`;

export const fixUser = (ctx: string, jd: string, resume: string, problems: string, language: string) => `
Candidate's real background:

<background>
${ctx}
</background>

Target job description:

<job_description>
${jd}
</job_description>

Current resume (JSON):

<resume>
${resume}
</resume>

An ATS review flagged these problems:

<problems>
${problems}
</problems>

Revise the resume JSON to fix the flagged problems:
- For each MISSING KEYWORD: if the background genuinely supports it, work the exact term into the most relevant existing bullet, the skills section, or the summary. If the background does NOT support it, leave it out — never fabricate.
- Shorten any flagged over-long bullets to under 200 characters without losing the outcome.
- Add missing dates ONLY if they appear in the background.
- Keep every fact that was already correct. Do not add new jobs, degrees, or numbers.

Return the complete revised resume as JSON with the same schema and keys as the input (headline, summary, skills, experience, projects, education, certifications). Return only JSON.${languageTail(language)}`;

export const COVER_SYSTEM = `You are an exceptional cover letter writer. Your letters sound like a specific, thoughtful human — never a template. Open with substance (never "I am writing to apply for..."), connect the candidate's real work to the company's actual needs, close with quiet confidence. 250-350 words. No cliches, no bullet points. Every claim must come from the candidate's real background.`;

export const coverUser = (ctx: string, name: string, company: string, role: string, jd: string, analysis: string, language: string) => `
Candidate's real background:

<background>
${ctx}
</background>

Candidate's name: ${name}

Target job (company: ${company}, role: ${role}):

<job_description>
${jd}
</job_description>

Tailoring strategy:

<strategy>
${analysis}
</strategy>

Write the cover letter body only (no date/address header). Start with the OUTPUT language's standard formal salutation (or address the named person/team if the job description gives one), and end with that language's standard formal sign-off followed by the candidate's name. Plain text, paragraphs separated by blank lines.${languageTail(language)}`;


export const TRANSLATE_SYSTEM = `You are a precise professional translator and localizer for resumes and cover letters. You translate ONLY: you never add, remove, merge, reorder, or embellish any fact. Every number, date, company name, school name, product name, and technology/tool name is kept exactly. You keep the candidate's concrete, cliche-free voice. Always keep the exact English JSON keys of the input — only values are translated.`;

export const translateUser = (
  resume: string, cover: string, keywords: string[], fitReasons: string[], language: string,
) => `
Translate the following application materials into the OUTPUT language, following the rule below.

Current resume (JSON):

<resume>
${resume}
</resume>

Current cover letter:

<cover_letter>
${cover}
</cover_letter>

ATS keywords (JSON array):

<keywords>
${JSON.stringify(keywords)}
</keywords>

Fit reasons (JSON array):

<fit_reasons>
${JSON.stringify(fitReasons)}
</fit_reasons>

Rules:
- Keep exactly the same number of experience, projects, education, and certifications entries, and the same number of bullets per entry. Do not merge or drop anything.
- Every digit sequence (years, percentages, counts) must appear unchanged.
- Date words ("heute"/"present"/"actualidad"…) become the output-language equivalent.
- The cover letter's salutation and sign-off become the output language's standard formal ones; keep the candidate's name.
- Keywords become the output-language equivalents an ATS would scan for; technology/tool names stay unchanged.
- "details" fields that are empty stay empty.

Respond with strict JSON, exactly these keys:
{ "resume": { ...same schema and keys as the input resume... }, "cover_letter": string, "keywords": [strings], "fit_reasons": [strings] }
Return only JSON.${languageTail(language)}`;
