import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const DEMO_DAILY_LIMIT = 3;
export const USER_DAILY_LIMIT = 25;

/** Atomic daily counter via the increment_usage() Postgres function.
    Fails open: if the limiter itself is unavailable, generation proceeds. */
export async function withinDailyLimit(identifier: string, limit: number): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return true;
  try {
    const admin = createClient(url, key);
    const { data, error } = await admin.rpc("increment_usage", {
      p_identifier: identifier,
      p_limit: limit,
    });
    if (error) return true;
    return Boolean(data);
  } catch {
    return true;
  }
}

export function clientIpHash(request: Request): string {
  const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}
