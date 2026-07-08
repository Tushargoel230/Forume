"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** If Supabase falls back to the Site URL after OAuth (redirect URL not
    allowlisted), the tokens land on the homepage. Forward them to the
    callback so sign-in finishes in the app instead of stranding here. */
export function AuthCatch() {
  const router = useRouter();
  useEffect(() => {
    const { hash, search } = window.location;
    if (/access_token=|refresh_token=/.test(hash) || /[?&]code=/.test(search)) {
      router.replace(`/auth/callback${search}${hash}`);
    }
  }, [router]);
  return null;
}
