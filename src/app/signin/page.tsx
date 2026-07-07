"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function continueDemo(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter an email address.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      localStorage.setItem("forume-demo-user", trimmedEmail);
      router.push("/app");
    } catch {
      setError("Your browser blocked local storage. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 grid place-items-center px-6 py-20">
      <div className="w-full max-w-md">
        <Link href="/" className="font-bold tracking-[0.18em] text-lg">
          FOR<span className="text-amber">UME</span>
        </Link>
        <div className="mt-6 rounded-sm border border-rule bg-paper p-8 shadow-[0_18px_50px_-24px_rgba(34,39,31,0.35)]">
          <form onSubmit={continueDemo}>
            <h1 className="font-display text-3xl mb-2">Welcome.</h1>
            <p className="text-stone text-sm mb-7">
              Enter an email to continue in demo mode. This avoids the Supabase email throttle while you test the app.
            </p>
            <label className="block text-sm font-medium mb-2" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md border border-rule-dark bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pine"
            />
            <button
              disabled={busy}
              className="mt-5 w-full rounded-md bg-pine px-5 py-3.5 font-semibold text-paper hover:bg-pine-deep transition-colors disabled:opacity-50"
            >
              {busy ? "Continuing…" : "Continue"}
            </button>
          </form>
          {error && (
            <p className="mt-4 rounded-md border border-amber bg-amber/10 px-4 py-3 text-sm">
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
