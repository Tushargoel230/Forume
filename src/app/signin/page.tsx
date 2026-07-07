"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignIn() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const fallbackEmail = window.localStorage.getItem("forume-demo-user")?.trim() || "demo@forume.app";
      window.localStorage.setItem("forume-demo-user", fallbackEmail);
    }
    router.replace("/app");
  }, [router]);

  return (
    <main className="flex-1 grid place-items-center px-6 py-20">
      <div className="rounded-sm border border-rule bg-paper px-8 py-6 shadow-[0_18px_50px_-24px_rgba(34,39,31,0.35)] text-center">
        <p className="font-display text-2xl">Opening the demo…</p>
        <p className="mt-2 text-sm text-stone">You will be redirected to the app shortly.</p>
      </div>
    </main>
  );
}
