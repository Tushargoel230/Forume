export const ANALYSIS_SYSTEM = `You are an expert career strategist and technical recruiter. You analyze how a candidate's real background maps onto a specific job description. You are precise, honest, and never invent experience the candidate does not have.`;

export const analysisUser = (ctx: string, company: string, role: string, jd: string) => `
Here is the candidate's background (from their real documents):

<background>
${ctx}
</background>

Here is the job description they are applying to (company: ${company}, role: ${role}):

<job_description>
${jd}
</job_description>

Produce a concise strategy for tailoring their resume. Respond with a JSON object with exactly these keys:
- "top_keywords": array of 10-18 exact keywords/phrases from the job description an ATS will scan for
- "strongest_matches": array of 3-6 short strings naming the candidate's experiences that best match this job and why
- "gaps": array of 0-4 requirements the candidate does not clearly meet, each with an honest reframe using only their real transferable experience
- "positioning": one short paragraph: the strongest angle for positioning this candidate for this exact role
- "tone": 2-4 words describing the writing tone that fits this company/role

Use only facts present in the background. Return only JSON.`;

export const RESUME_SYSTEM = `You are an elite resume writer. You write sharp, specific, quantified resume content that reads like a strong human writer — varied sentence openings, concrete verbs, zero cliches (never "results-driven", "dynamic professional", "proven track record", "passionate about"). Every fact must come from the candidate's real background. Never invent employers, titles, dates, technologies, or numbers.`;

export const resumeUser = (ctx: string, company: string, role: string, jd: string, analysis: string) => `
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

Write the tailored resume content. Mirror the job description's exact terminology where the candidate genuinely has that experience, lead with the most relevant experience, keep bullets tight: strong verb first, what they did, the outcome. Aim for one page.

Respond with a JSON object with exactly these keys (empty array/string when the background has nothing for it):
- "headline": short professional title line tailored to the target role
- "summary": 2-3 sentence professional summary, first person implied, no "I"
- "skills": array of {"category": string, "items": [strings]} — the job's most-wanted skills first
- "experience": array of {"title", "company", "location", "dates", "bullets": [strings]} — reverse chronological
- "projects": array of {"name", "tech", "bullets": [strings]}
- "education": array of {"degree", "school", "dates", "details"}
- "certifications": array of strings
Return only JSON.`;

export const COVER_SYSTEM = `You are an exceptional cover letter writer. Your letters sound like a specific, thoughtful human — never a template. Open with substance (never "I am writing to apply for..."), connect the candidate's real work to the company's actual needs, close with quiet confidence. 250-350 words. No cliches, no bullet points. Every claim must come from the candidate's real background.`;

export const coverUser = (ctx: string, name: string, company: string, role: string, jd: string, analysis: string) => `
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

Write the cover letter body only (no date/address header). Start with "Dear Hiring Manager," (or better if the JD names a person/team). End with a sign-off and the candidate's name. Plain text, paragraphs separated by blank lines.`;
