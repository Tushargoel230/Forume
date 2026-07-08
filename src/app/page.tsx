import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ResumeMini } from "@/components/ResumeMini";
import { Reveal } from "@/components/Reveal";

const story = [
  {
    kicker: "The problem",
    title: "You've rewritten it a hundred times.",
    body: "Every posting wants a different version of you. So you reshape the same document at 2am, again, and send it into silence.",
  },
  {
    kicker: "The filter",
    title: "Software reads it first.",
    body: "Before a person sees a word, a parser has already voted. Most applications are declined by machines that never understood them.",
  },
  {
    kicker: "The turn",
    title: "Forume changes the order.",
    body: "Tell your story once. For every role, Forume tailors it — mirroring the job's language where it's true of you, and never inventing what isn't.",
  },
];

const steps = [
  {
    n: "01",
    title: "Tell us your story once",
    body: "Your experience, projects, and wins become a private knowledge base.",
  },
  {
    n: "02",
    title: "Paste the job description",
    body: "Forume reads it like a recruiter and an ATS — skills, signals, exact terms.",
  },
  {
    n: "03",
    title: "Ship the proof",
    body: "A tailored resume and letter, typeset and scored. Every line traceable to you.",
  },
];

const checks = [
  "Single-column, parser-safe typography",
  "The job's exact keywords — where they're true of you",
  "No invented employers, dates, or numbers",
  "Readiness scored before you send",
];

const tiers = [
  {
    name: "Starter",
    price: "Free",
    note: "One tailored application. See the difference.",
    featured: false,
  },
  {
    name: "Pro",
    price: "€14",
    note: "Unlimited applications, all templates, auto-fix.",
    featured: true,
  },
  {
    name: "Concierge",
    price: "€199",
    note: "Human review and interview preparation, one-time.",
    featured: false,
  },
];

export default function Landing() {
  return (
    <main className="flex-1 bg-linen text-ink">
      {/* nav */}
      <header className="sticky top-0 z-40 border-b border-rule bg-linen/90 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo />
          <div className="hidden items-center gap-9 text-sm text-stone sm:flex">
            <a href="#story" className="transition-colors hover:text-ink">Why</a>
            <a href="#how" className="transition-colors hover:text-ink">How</a>
            <a href="#templates" className="transition-colors hover:text-ink">Templates</a>
            <a href="#access" className="transition-colors hover:text-ink">Access</a>
          </div>
          <Link
            href="/app"
            className="rounded-sm bg-crimson px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-[#a31f31]"
          >
            Let&apos;s start
          </Link>
        </nav>
      </header>

      {/* hero — cinematic dark band */}
      <section className="hero-glow relative overflow-hidden bg-coal text-bone">
        <div className="pointer-events-none absolute inset-0">
          <Image
            src="/hero-papers.png"
            alt=""
            fill
            priority
            className="object-cover object-right opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-coal via-coal/80 to-coal/30" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-coal to-transparent" />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 pb-24 pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:pt-28">
          <div>
            <p className="rise text-xs font-bold uppercase tracking-[0.3em] text-gold-soft" style={{ "--rise-delay": "0.05s" } as React.CSSProperties}>
              Forume — tailored applications
            </p>
            <h1
              className="rise mt-6 font-display text-5xl leading-[1.04] tracking-tight sm:text-7xl"
              style={{ "--rise-delay": "0.15s" } as React.CSSProperties}
            >
              Your experience,
              <br />
              <em className="text-gold-soft">made undeniable.</em>
            </h1>
            <p
              className="rise mt-7 max-w-md text-lg leading-relaxed text-fog"
              style={{ "--rise-delay": "0.3s" } as React.CSSProperties}
            >
              Forume tailors your real story to every job — past the software,
              in front of the person, honest to the letter.
            </p>
            <div className="rise mt-10 flex flex-wrap gap-4" style={{ "--rise-delay": "0.45s" } as React.CSSProperties}>
              <Link
                href="/app"
                className="rounded-sm bg-crimson px-7 py-3.5 font-semibold text-paper transition-colors hover:bg-[#a31f31]"
              >
                Let&apos;s start
              </Link>
              <a
                href="#story"
                className="rounded-sm border border-hairline px-7 py-3.5 font-semibold text-bone transition-colors hover:border-fog"
              >
                Why it works
              </a>
            </div>
            <p className="rise mt-6 text-sm text-fog/70" style={{ "--rise-delay": "0.55s" } as React.CSSProperties}>
              No sign-up. No credit card. Two minutes.
            </p>
          </div>

          {/* layered card composition */}
          <div className="rise relative mx-auto h-[420px] w-full max-w-[400px]" style={{ "--rise-delay": "0.4s" } as React.CSSProperties}>
            <div className="drift absolute left-0 top-10 w-[76%]" style={{ "--tilt": "-5deg", "--drift-delay": "0.8s" } as React.CSSProperties}>
              <ResumeMini variant="modern" className="opacity-80" />
            </div>
            <div className="drift absolute right-0 top-0 w-[80%]" style={{ "--tilt": "2.5deg" } as React.CSSProperties}>
              <ResumeMini variant="slate" />
            </div>
            <span className="stamp absolute -bottom-1 right-6 bg-coal/80 text-2xl text-gold-soft backdrop-blur-sm">
              ATS 100
              <span className="block text-[0.5rem] tracking-[0.24em]">passes screening</span>
            </span>
          </div>
        </div>
      </section>

      {/* story — sticky narrative */}
      <section id="story">
        <div className="mx-auto grid max-w-6xl gap-14 px-6 py-24 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <Reveal>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-crimson">The story</p>
              <h2 className="mt-5 font-display text-4xl leading-tight sm:text-5xl">
                Job hunting is a writing job
                <em className="text-crimson"> nobody applied for.</em>
              </h2>
              <div className="relative mt-10 hidden overflow-hidden rounded-sm border border-rule lg:block">
                <Image
                  src="/story-paper.png"
                  alt=""
                  width={520}
                  height={347}
                  className="rounded-sm"
                />
              </div>
            </Reveal>
          </div>
          <div className="flex flex-col gap-20 pt-4 lg:gap-36 lg:pt-24">
            {story.map((s, i) => (
              <Reveal key={s.title} delay={0.08 * i}>
                <div className="border-l-2 border-crimson/50 pl-8">
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-stone">{s.kicker}</p>
                  <h3 className="mt-4 font-display text-3xl">{s.title}</h3>
                  <p className="mt-4 max-w-md leading-relaxed text-stone">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="border-y border-rule bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Reveal>
            <h2 className="font-display text-4xl sm:text-5xl">
              Three steps. <em className="text-crimson">No blank page.</em>
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={0.1 * i}>
                <div className="group h-full rounded-sm border border-rule bg-linen p-8 transition-shadow duration-300 hover:shadow-[0_16px_40px_-18px_rgba(31,33,36,0.3)]">
                  <p className="font-display text-5xl italic text-crimson/40 transition-colors duration-300 group-hover:text-crimson">
                    {s.n}
                  </p>
                  <h3 className="mt-6 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-stone">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* proof */}
      <section>
        <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 py-24 lg:grid-cols-2">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-crimson">The proof</p>
            <h2 className="mt-5 font-display text-4xl leading-tight sm:text-5xl">
              Checked before <em className="text-crimson">you send.</em>
            </h2>
            <p className="mt-6 max-w-md leading-relaxed text-stone">
              Every application is scored against the checks resume parsers
              actually run — and against one rule software can&apos;t enforce:
              nothing on the page that isn&apos;t true.
            </p>
            <ul className="mt-9 space-y-4">
              {checks.map((c) => (
                <li key={c} className="flex items-start gap-3.5 text-sm">
                  <span className="mt-0.5 text-crimson">—</span>
                  {c}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="cropmarks p-6">
              <div className="rounded-sm border border-rule bg-paper p-10 text-center shadow-[0_20px_50px_-24px_rgba(31,33,36,0.35)]">
                <svg viewBox="0 0 120 70" className="mx-auto w-56" aria-hidden="true">
                  <path d="M 12 62 A 48 48 0 0 1 108 62" fill="none" stroke="#e5e1d6" strokeWidth="7" strokeLinecap="round" />
                  <path d="M 12 62 A 48 48 0 0 1 108 62" fill="none" stroke="#c5283d" strokeWidth="7" strokeLinecap="round" className="arc-path" />
                </svg>
                <p className="-mt-8 font-display text-6xl">100</p>
                <p className="mt-2 text-[0.65rem] font-bold uppercase tracking-[0.3em] text-crimson">
                  ATS readiness
                </p>
                <p className="mt-6 border-t border-rule pt-5 text-sm text-stone">
                  Keyword coverage, section structure, parser safety —
                  reported line by line, fixable in one click.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* templates */}
      <section id="templates" className="border-y border-rule bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Reveal>
            <h2 className="font-display text-4xl sm:text-5xl">
              Typeset, <em className="text-crimson">not templated.</em>
            </h2>
            <p className="mt-5 max-w-xl text-stone">
              Every layout is single-column, real text — beautiful to a
              recruiter, legible to a machine.
            </p>
          </Reveal>
          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {(
              [
                ["slate", "Slate Banner", "Confident dark header."],
                ["serif", "Executive Serif", "Centered small caps, senior calm."],
                ["modern", "Minimal Modern", "Air, restraint, hierarchy."],
              ] as const
            ).map(([variant, name, blurb], i) => (
              <Reveal key={name} delay={0.1 * i}>
                <div className="group">
                  <div className="rounded-sm border border-rule transition-transform duration-500 ease-out group-hover:-translate-y-2">
                    <ResumeMini variant={variant} />
                  </div>
                  <div className="mt-5 flex items-baseline justify-between border-t border-rule pt-4">
                    <p className="font-semibold">{name}</p>
                    <p className="text-xs text-stone">{blurb}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* access */}
      <section id="access">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Reveal>
            <h2 className="font-display text-4xl sm:text-5xl">Access.</h2>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {tiers.map((t, i) => (
              <Reveal key={t.name} delay={0.08 * i}>
                <div
                  className={`flex h-full flex-col rounded-sm border p-8 ${
                    t.featured
                      ? "border-ink bg-ink text-paper shadow-[0_24px_60px_-24px_rgba(16,17,19,0.6)]"
                      : "border-rule bg-paper"
                  }`}
                >
                  <p className={`text-xs font-bold uppercase tracking-[0.28em] ${t.featured ? "text-gold-soft" : "text-crimson"}`}>
                    {t.name}
                  </p>
                  <p className="mt-5 font-display text-5xl">
                    {t.price}
                    {t.name === "Pro" && <span className={`text-lg ${t.featured ? "text-paper/60" : "text-stone"}`}>/mo</span>}
                  </p>
                  <p className={`mb-8 mt-4 flex-1 text-sm leading-relaxed ${t.featured ? "text-paper/70" : "text-stone"}`}>
                    {t.note}
                  </p>
                  <Link
                    href="/app"
                    className={`rounded-sm px-5 py-3 text-center text-sm font-semibold transition-colors ${
                      t.featured
                        ? "bg-crimson text-paper hover:bg-[#a31f31]"
                        : "border border-ink hover:bg-ink hover:text-paper"
                    }`}
                  >
                    {t.featured ? "Start with Pro" : "Begin"}
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-xs text-stone/70">
            Early access: everything is free while we build. Listed prices show
            where Forume is headed.
          </p>
        </div>
      </section>

      {/* final CTA — dark band */}
      <section className="hero-glow bg-coal text-bone">
        <div className="mx-auto max-w-6xl px-6 py-28 text-center">
          <Reveal>
            <h2 className="font-display text-4xl leading-tight sm:text-6xl">
              Ready when <em className="text-gold-soft">you are.</em>
            </h2>
            <p className="mx-auto mt-6 max-w-md text-fog">
              Open the app, paste a job you want, and watch your experience
              take the right shape.
            </p>
            <Link
              href="/app"
              className="mt-10 inline-block rounded-sm bg-crimson px-9 py-4 font-semibold text-paper transition-colors hover:bg-[#a31f31]"
            >
              Start your first application
            </Link>
          </Reveal>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t border-rule bg-linen">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-12 sm:flex-row sm:justify-between">
          <Logo />
          <p className="text-xs text-stone">
            Honest by design — Forume never invents what you didn&apos;t do.
          </p>
          <nav className="flex gap-5 text-xs text-stone">
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
            <Link href="/imprint" className="hover:text-ink">Imprint</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
