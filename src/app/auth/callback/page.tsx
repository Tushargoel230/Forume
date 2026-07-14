"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";
import { Logo } from "@/components/Logo";

function CallbackCard({ message, spinning = true }: { message: string; spinning?: boolean }) {
  return (
    <main className="flex-1 grid place-items-center px-6 py-20">
      <div className="w-full max-w-md rounded-sm border border-rule bg-paper p-8 text-center shadow-[0_18px_50px_-24px_rgba(34,39,31,0.35)]">
        <div className="mb-5 flex justify-center"><Logo /></div>
        {spinning && (
          <div className="mx-auto mb-4 h-6 w-6 animate-spin rounded-full border-2 border-rule-dark border-t-crimson" />
        )}
        <p className="font-display text-2xl mb-2">Finishing sign-in</p>
        <p className="text-sm text-stone">{message}</p>
      </div>
    </main>
  );
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Finishing sign-in…");

  useEffect(() => {
    const finishSignIn = async () => {
      const supabase = supabaseBrowser();
      try {
        const code = searchParams.get("code");
        const accessToken = searchParams.get("access_token");
        const refreshToken = searchParams.get("refresh_token");
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const hashAccessToken = hashParams.get("access_token");
        const hashRefreshToken = hashParams.get("refresh_token");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken || refreshToken || hashAccessToken || hashRefreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken ?? hashAccessToken ?? "",
            refresh_token: refreshToken ?? hashRefreshToken ?? "",
          });
          if (error) throw error;
        } else {
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          if (!data.session) throw new Error("No active session was found.");
        }

        router.replace("/app");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Sign-in could not be completed.");
      }
    };

    void finishSignIn();
  }, [router, searchParams]);

  const errored = message !== "Finishing sign-in…";
  return <CallbackCard message={message} spinning={!errored} />;
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<CallbackCard message="Preparing your session…" />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
