import type { Resume } from "./types";

/** Deterministic sample output shown when no AI engine is configured.
    Always flagged is_demo so the UI labels it clearly. */
export const DEMO_RESUME: Resume = {
  headline: "Sample Output — Product Designer, Growth",
  summary:
    "This is Forume's sample resume, shown because no AI engine is connected yet. Once an engine is configured, this section is written from your real profile and tailored to the job description you pasted.",
  skills: [
    { category: "Design", items: ["Figma", "Design systems", "Prototyping"] },
    { category: "Research", items: ["User interviews", "Usability testing"] },
    { category: "Collaboration", items: ["Design reviews", "Cross-functional squads"] },
  ],
  experience: [
    {
      title: "Product Designer",
      company: "Example Studio",
      location: "Berlin, DE",
      dates: "2023 – Present",
      bullets: [
        "Sample bullet: shows how your real accomplishments will be phrased — verb first, concrete outcome last.",
        "Sample bullet: mirrors the job description's own keywords where they are true of you.",
      ],
    },
  ],
  projects: [
    {
      name: "Sample Project",
      tech: "The tools you actually used",
      bullets: ["Each project bullet is drawn from your uploaded documents — never invented."],
    },
  ],
  education: [
    {
      degree: "Your degree",
      school: "Your university",
      dates: "20XX – 20XX",
      details: "Pulled from your profile documents.",
    },
  ],
  certifications: [],
};

export const DEMO_COVER = `Dear Hiring Manager,

This is Forume's sample cover letter. When an AI engine is connected, this space holds a 250–350 word letter written from your real background and matched to the specific role — opening with substance, closing with quiet confidence, and never claiming anything you can't back up in an interview.

Until then, it demonstrates the typography and layout your letter will ship with.

Warm regards,
Your Name`;

export const DEMO_KEYWORDS = [
  "product design", "Figma", "design systems", "user research",
  "prototyping", "usability testing", "cross-functional",
];
