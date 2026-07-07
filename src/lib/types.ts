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
export type AtsReport = {
  score: number;
  coverage: number;
  checks: AtsCheck[];
  keywords_found: string[];
  keywords_missing: string[];
};

export type Contact = {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  website: string;
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
  is_demo: boolean;
  created_at: string;
};
