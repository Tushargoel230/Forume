/* Recognized top-tier employers. Used two ways:
   - to bias ranking so big-company roles surface higher (without inflating the
     honest resume-match score), and
   - to power the "Top companies" filter (passed to Apify's organizationSearch).
   Not exhaustive — tune freely. Aliases catch the parent/brand variants a job
   feed might use (Alphabet→Google, Facebook→Meta, AWS→Amazon). */

type Company = { name: string; aliases?: string[] };

export const TOP_COMPANIES: Company[] = [
  { name: "NVIDIA" },
  { name: "Apple" },
  { name: "Google", aliases: ["alphabet", "deepmind", "google deepmind"] },
  { name: "Meta", aliases: ["facebook", "instagram", "meta platforms", "reality labs"] },
  { name: "Amazon", aliases: ["aws", "amazon web services"] },
  { name: "Microsoft" },
  { name: "OpenAI" },
  { name: "Anthropic" },
  { name: "Tesla" },
  { name: "Netflix" },
  { name: "Adobe" },
  { name: "Salesforce" },
  { name: "Intel" },
  { name: "AMD", aliases: ["advanced micro devices"] },
  { name: "Qualcomm" },
  { name: "IBM" },
  { name: "Oracle" },
  { name: "SAP" },
  { name: "Spotify" },
  { name: "Uber" },
  { name: "Airbnb" },
  { name: "Stripe" },
  { name: "Databricks" },
  { name: "Snowflake" },
  { name: "Samsung" },
  { name: "Sony" },
  { name: "Siemens" },
  { name: "Bosch" },
  { name: "BMW" },
  { name: "Mercedes-Benz", aliases: ["mercedes", "daimler"] },
  { name: "Boston Dynamics" },
  { name: "Waymo" },
  { name: "Figure", aliases: ["figure ai"] },
  { name: "ByteDance", aliases: ["tiktok"] },
  { name: "LinkedIn" },
  { name: "PayPal" },
  { name: "Palantir" },
  { name: "SpaceX" },
];

/** Org-name list to hand to Apify's organizationSearch for the "Top companies" filter. */
export const TOP_COMPANY_NAMES: string[] = TOP_COMPANIES.map((c) => c.name).filter(Boolean);

function norm(s: string): string {
  return ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
}

// All accepted surface forms, as space-padded tokens for whole-word matching.
const ALIAS_TOKENS: string[] = TOP_COMPANIES.flatMap((c) =>
  [c.name, ...(c.aliases ?? [])].map((a) => norm(a).trim()).filter((a) => a.length > 1),
);

/** True if a posting's company is a recognized top-tier employer. */
export function isTopCompany(company: string): boolean {
  if (!company) return false;
  const n = norm(company);
  return ALIAS_TOKENS.some((a) => n.includes(` ${a} `));
}
