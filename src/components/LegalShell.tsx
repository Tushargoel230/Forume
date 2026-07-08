import Link from "next/link";
import { Logo } from "@/components/Logo";

export function LegalShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1 bg-linen text-ink">
      <header className="border-b border-rule bg-linen/90">
        <nav className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link href="/"><Logo /></Link>
          <Link href="/app" className="text-sm font-semibold text-crimson hover:underline">
            Open the app
          </Link>
        </nav>
      </header>
      <article className="mx-auto max-w-3xl px-6 py-16 lg:py-20">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-crimson">The fine print</p>
        <h1 className="font-display mt-3 text-4xl leading-tight sm:text-5xl">{title}</h1>
        <div className="mt-10 border-t border-rule pt-8 space-y-6 leading-relaxed text-stone [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-ink [&_h2]:mt-10 [&_b]:text-ink">
          {children}
        </div>
      </article>
      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-6 px-6 py-8 text-xs text-stone">
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          <Link href="/terms" className="hover:text-ink">Terms</Link>
          <Link href="/imprint" className="hover:text-ink">Imprint</Link>
        </div>
      </footer>
    </main>
  );
}
