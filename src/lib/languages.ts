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
