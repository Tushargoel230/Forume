"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { supabaseBrowser, supabaseConfigured } from "@/lib/supabase";

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const configured = supabaseConfigured();

  async function google() {
    setError("");
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        // makes the email's link land back in the app and complete sign-in
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setStage("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabaseBrowser().auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setBusy(false);
    if (error) setError(error.message);
    else router.push("/app");
  }

  const inputCls =
    "w-full rounded-md border border-rule-dark bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ink";

  return (
    <main className="flex-1 grid place-items-center bg-linen px-6 py-20">
      <div className="w-full max-w-md">
        <Link href="/"><Logo /></Link>
        <div className="mt-6 rounded-sm border border-rule bg-paper p-8 shadow-[0_18px_50px_-24px_rgba(31,33,36,0.35)]">
          {!configured ? (
            <>
              <h1 className="font-display text-3xl mb-2">Accounts are warming up.</h1>
              <p className="text-stone text-sm mb-6">
                Sign-in isn&apos;t configured on this deployment yet — the demo
                has everything, saved in your browser.
              </p>
              <Link
                href="/app"
                className="block rounded-md bg-ink px-5 py-3.5 text-center font-semibold text-paper transition-colors hover:bg-crimson"
              >
                Open the demo
              </Link>
            </>
          ) : stage === "email" ? (
            <>
              <h1 className="font-display text-3xl mb-2">Welcome.</h1>
              <p className="text-stone text-sm mb-7">
                Sign in to keep your profile and applications on every device.
              </p>
              <button
                onClick={google}
                className="mb-5 flex w-full items-center justify-center gap-3 rounded-md border border-rule-dark bg-white px-5 py-3 font-semibold transition-colors hover:border-ink"
              >
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.5 0 6.7 1.2 9.2 3.6l6.8-6.8C35.9 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.4 17.7 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.4 6.9-17.7z" />
                  <path fill="#FBBC05" d="M10.5 28.6a14.5 14.5 0 0 1 0-9.2l-7.9-6.2a24 24 0 0 0 0 21.6l7.9-6.2z" />
                  <path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.5-5.7l-7.7-6c-2.1 1.4-4.8 2.3-7.8 2.3-6.3 0-11.6-4-13.5-9.5l-7.9 6.2C6.5 42.6 14.6 48 24 48z" />
                </svg>
                Continue with Google
              </button>
              <div className="mb-5 flex items-center gap-3 text-xs text-stone">
                <span className="h-px flex-1 bg-rule" /> or <span className="h-px flex-1 bg-rule" />
              </div>
              <form onSubmit={sendCode}>
                <label className="mb-2 block text-sm font-medium" htmlFor="email">Email</label>
                <input
                  id="email" type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" className={inputCls}
                />
                <button
                  disabled={busy}
                  className="mt-4 w-full rounded-md bg-ink px-5 py-3.5 font-semibold text-paper transition-colors hover:bg-crimson disabled:opacity-50"
                >
                  {busy ? "Sending…" : "Email me a sign-in code"}
                </button>
              </form>
              <Link href="/app" className="mt-5 block text-center text-sm text-stone hover:text-ink">
                Just exploring? Try the demo without an account →
              </Link>
            </>
          ) : (
            <form onSubmit={verify}>
              <h1 className="font-display text-3xl mb-2">Check your inbox.</h1>
              <p className="text-stone text-sm mb-7">
                We emailed <b className="text-ink">{email}</b>. Enter the
                six-digit code below — or just click the link in the email.
                It can take a minute; check spam too.
              </p>
              <label className="mb-2 block text-sm font-medium" htmlFor="code">Code</label>
              <input
                id="code" inputMode="numeric" required value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className={`${inputCls} text-center text-lg tracking-[0.4em]`}
              />
              <button
                disabled={busy}
                className="mt-4 w-full rounded-md bg-ink px-5 py-3.5 font-semibold text-paper transition-colors hover:bg-crimson disabled:opacity-50"
              >
                {busy ? "Verifying…" : "Sign in"}
              </button>
              <button
                type="button"
                onClick={() => setStage("email")}
                className="mt-3 w-full text-sm text-stone hover:text-ink"
              >
                Use a different email
              </button>
            </form>
          )}
          {error && (
            <p className="mt-4 rounded-md border border-amber bg-amber/10 px-4 py-3 text-sm">{error}</p>
          )}
        </div>
      </div>
    </main>
  );
}
