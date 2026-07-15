import { supabaseAsUser } from "@/lib/supabase";

type AdminCheck = { ok: true } | { ok: false; status: number; error: string };

/** Verifies the bearer token belongs to the one founder email in ADMIN_EMAIL.
    No roles table — a single-founder product doesn't need one yet. */
export async function requireAdmin(request: Request): Promise<AdminCheck> {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false, status: 401, error: "Not signed in." };

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return { ok: false, status: 503, error: "Admin access is not configured." };

  const { data, error } = await supabaseAsUser(token).auth.getUser(token);
  // Emails are case-insensitive; compare normalized so a stray capital or
  // trailing space in ADMIN_EMAIL (or the provider's casing) doesn't lock the founder out.
  const norm = (e?: string | null) => (e ?? "").trim().toLowerCase();
  if (error || !data.user || norm(data.user.email) !== norm(adminEmail)) {
    return { ok: false, status: 403, error: "Not authorized." };
  }
  return { ok: true };
}
