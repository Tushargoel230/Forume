import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/* The app is demo-first: it must build and run even with no Supabase env.
   When unconfigured we hand back a client pointed at a placeholder host —
   it never makes a network call in the demo flow, and prerendering stays safe. */
const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "public-placeholder-key";

export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function supabaseBrowser(): SupabaseClient {
  if (!browserClient) {
    if (!supabaseConfigured() && typeof window !== "undefined") {
      console.warn("Supabase is not configured — running in demo-only mode.");
    }
    browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      },
    );
  }
  return browserClient;
}

/** Server-side client acting as the calling user; RLS stays enforced. */
export function supabaseAsUser(accessToken: string): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_KEY,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } },
  );
}
