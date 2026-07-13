export type SkillGroup = { category: string; items: string[] };
export type Job = {
  title: string;
  company: string;
  location?: string;
  dates?: string;
  bullets: string[];
};
export type Project = { name: string; tech?: string; bullets: string[] };
export type Education = {
  degree: string;
  school: string;
  dates?: string;
  details?: string;
};

export type Resume = {
  headline: string;
  summary: string;
  skills: SkillGroup[];
  experience: Job[];
  projects: Project[];
  education: Education[];
  certifications: string[];
};

export type AtsCheck = { name: string; passed: boolean; detail: string };

export type FitLevel = "strong" | "good" | "fair" | "stretch" | "weak";
export type Fit = { level: FitLevel; reasons: string[] };

export type AtsReport = {
  score: number;
  coverage: number;
  checks: AtsCheck[];
  keywords_found: string[];
  keywords_missing: string[];
  /* honest interview-chance verdict from the analysis stage; absent on samples */
  fit?: Fit;
};

export type Contact = {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  website: string;
  /* optional European-style CV photo, as a compressed base64 data URL;
     presentation-only — never sent to the LLM or used in ATS scoring */
  photo?: string;
};

export type Application = {
  id: number;
  company: string;
  role: string;
  jd: string;
  resume: Resume | null;
  cover_letter: string | null;
  ats: AtsReport | null;
  template: string;
  show_photo?: boolean;
  is_demo: boolean;
  created_at: string;
};
