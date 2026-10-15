/* Output languages for generated resumes/cover letters. No server-only deps, so
   both the client UI and lib/prompts.ts can import it. The candidate's uploaded
   background is never translated — only the generated output changes language. */

export const LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "de", label: "German" },
  { code: "nl", label: "Dutch" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
];

/** Human label for a language code. Falls back to "English" for unknown or
    missing codes (older stored applications have no language field). */
export function languageLabel(code: string | undefined | null): string {
  return LANGUAGES.find((l) => l.code === code)?.label ?? "English";
}

/* Template chrome (section headings etc.) per output language. Standard
   templates use summary…certifications; the Lebenslauf-style template uses
   cvTitle/profile/… — its German entry is exactly the original hardcoded set. */
export type SectionLabels = {
  summary: string;
  skills: string;
  experience: string;
  projects: string;
  education: string;
  certifications: string;
  // Lebenslauf-style template
  cvTitle: string;
  profile: string;
  cvExperience: string;
  cvProjects: string;
  cvEducation: string;
  cvSkills: string;
  cvCertificates: string;
  // small placeholders
  yourName: string;
  photoAlt: string;
};

export const SECTION_LABELS: Record<string, SectionLabels> = {
  en: {
    summary: "Summary", skills: "Skills", experience: "Experience", projects: "Projects",
    education: "Education", certifications: "Certifications",
    cvTitle: "Curriculum Vitae", profile: "Profile", cvExperience: "Experience",
    cvProjects: "Projects", cvEducation: "Education", cvSkills: "Skills", cvCertificates: "Certificates",
    yourName: "Your Name", photoAlt: "Profile photo",
  },
  de: {
    summary: "Profil", skills: "Kenntnisse", experience: "Berufserfahrung", projects: "Projekte",
    education: "Ausbildung", certifications: "Zertifikate",
    cvTitle: "Lebenslauf", profile: "Profil", cvExperience: "Berufserfahrung",
    cvProjects: "Projekte", cvEducation: "Ausbildung", cvSkills: "Kenntnisse", cvCertificates: "Zertifikate",
    yourName: "Ihr Name", photoAlt: "Bewerbungsfoto",
  },
  nl: {
    summary: "Profiel", skills: "Vaardigheden", experience: "Werkervaring", projects: "Projecten",
    education: "Opleiding", certifications: "Certificeringen",
    cvTitle: "Curriculum Vitae", profile: "Profiel", cvExperience: "Werkervaring",
    cvProjects: "Projecten", cvEducation: "Opleiding", cvSkills: "Vaardigheden", cvCertificates: "Certificaten",
    yourName: "Uw naam", photoAlt: "Profielfoto",
  },
  es: {
    summary: "Resumen", skills: "Habilidades", experience: "Experiencia", projects: "Proyectos",
    education: "Formación", certifications: "Certificaciones",
    cvTitle: "Currículum", profile: "Perfil", cvExperience: "Experiencia profesional",
    cvProjects: "Proyectos", cvEducation: "Formación", cvSkills: "Habilidades", cvCertificates: "Certificados",
    yourName: "Tu nombre", photoAlt: "Foto de perfil",
  },
  fr: {
    summary: "Profil", skills: "Compétences", experience: "Expérience", projects: "Projets",
    education: "Formation", certifications: "Certifications",
    cvTitle: "Curriculum Vitae", profile: "Profil", cvExperience: "Expérience professionnelle",
    cvProjects: "Projets", cvEducation: "Formation", cvSkills: "Compétences", cvCertificates: "Certificats",
    yourName: "Votre nom", photoAlt: "Photo de profil",
  },
  it: {
    summary: "Profilo", skills: "Competenze", experience: "Esperienza", projects: "Progetti",
    education: "Formazione", certifications: "Certificazioni",
    cvTitle: "Curriculum Vitae", profile: "Profilo", cvExperience: "Esperienza professionale",
    cvProjects: "Progetti", cvEducation: "Formazione", cvSkills: "Competenze", cvCertificates: "Certificati",
    yourName: "Il tuo nome", photoAlt: "Foto del profilo",
  },
  pt: {
    summary: "Resumo", skills: "Competências", experience: "Experiência", projects: "Projetos",
    education: "Formação", certifications: "Certificações",
    cvTitle: "Currículo", profile: "Perfil", cvExperience: "Experiência profissional",
    cvProjects: "Projetos", cvEducation: "Formação", cvSkills: "Competências", cvCertificates: "Certificados",
    yourName: "O seu nome", photoAlt: "Foto de perfil",
  },
};

/** Section/heading labels for a language code; falls back to English. */
export function sectionLabels(code: string | undefined | null): SectionLabels {
  return SECTION_LABELS[code ?? "en"] ?? SECTION_LABELS.en;
}
