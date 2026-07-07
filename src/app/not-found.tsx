import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="flex-1 grid place-items-center bg-linen px-6 py-24 text-center">
      <div>
        <Logo />
        <p className="stamp mx-auto mt-10 block w-fit bg-paper text-3xl text-crimson">
          404
          <span className="block text-[0.55rem] tracking-[0.24em]">page not found</span>
        </p>
        <p className="mt-8 text-stone">This page didn&apos;t make it past screening.</p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-md bg-ink px-6 py-3 font-semibold text-paper transition-colors hover:bg-crimson"
        >
          Back to Forume
        </Link>
      </div>
    </main>
  );
}
