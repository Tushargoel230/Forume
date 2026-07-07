import type { Session, SupabaseClient } from "@supabase/supabase-js";

const KEYS = {
  user: "forume-demo-user",
  docs: "forume-demo-docs",
  contact: "forume-demo-contact",
  apps: "forume-demo-applications",
};

function parse<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** After a real sign-in: offer to move browser demo data into the account,
    then clear the demo keys either way (the real account takes over). */
export async function maybeImportDemoData(
  supabase: SupabaseClient,
  session: Session,
): Promise<void> {
  if (typeof window === "undefined") return;

  const docs = parse<{ name: string; content: string }[]>(KEYS.docs) ?? [];
  const contact = parse<Record<string, string>>(KEYS.contact);
  const apps = parse<Record<string, unknown>[]>(KEYS.apps) ?? [];
  const hasData = docs.length > 0 || !!contact || apps.length > 0;

  if (hasData) {
    const wantImport = window.confirm(
      "You have work saved in this browser from the demo. Move it into your account?",
    );
    if (wantImport) {
      try {
        if (docs.length) {
          await supabase.from("documents").insert(
            docs.map((d) => ({
              user_id: session.user.id,
              name: d.name || "Imported document",
              content: d.content ?? "",
            })),
          );
        }
        if (contact) {
          await supabase.from("profiles").upsert({
            user_id: session.user.id,
            name: contact.name ?? "",
            phone: contact.phone ?? "",
            location: contact.location ?? "",
            linkedin: contact.linkedin ?? "",
            website: contact.website ?? "",
            updated_at: new Date().toISOString(),
          });
        }
        if (apps.length) {
          await supabase.from("applications").insert(
            apps
              .filter((a) => typeof a.jd === "string" && a.jd)
              .map((a) => ({
                user_id: session.user.id,
                company: a.company ?? "",
                role: a.role ?? "",
                jd: a.jd,
                resume: a.resume ?? null,
                cover_letter: a.cover_letter ?? null,
                ats: a.ats ?? null,
                template: a.template ?? "slate",
                is_demo: a.is_demo ?? false,
              })),
          );
        }
      } catch (e) {
        console.warn("Demo import failed:", e);
        return; // keep local data so nothing is lost
      }
    }
  }

  for (const key of Object.values(KEYS)) window.localStorage.removeItem(key);
}
