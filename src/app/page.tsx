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
    <main className="noir flex-1 font-body">
      <div className="noir-grain" aria-hidden="true" />

      {/* nav */}
      <header className="sticky top-0 z-40 border-b border-hairline bg-coal/85 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo light />
          <div className="hidden items-center gap-9 text-sm text-fog sm:flex">
            <a href="#story" className="transition-colors hover:text-bone">Why</a>
            <a href="#how" className="transition-colors hover:text-bone">How</a>
            <a href="#templates" className="transition-colors hover:text-bone">Templates</a>
            <a href="#access" className="transition-colors hover:text-bone">Access</a>
          </div>
          <Link
            href="/app"
            className="rounded-sm border border-gold/60 px-4 py-2 text-sm font-semibold text-gold transition-colors hover:bg-gold hover:text-coal"
          >
            Try the demo
          </Link>
        </nav>
      </header>

      {/* hero */}
      <section className="hero-glow relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-25">
          <Image
            src="/hero-papers.png"
            alt=""
            fill
            priority
            className="object-cover object-right"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-coal via-coal/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-coal to-transparent" />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 pb-28 pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:pt-32">
          <div>
            <p className="rise text-xs font-bold uppercase tracking-[0.3em] text-gold" style={{ "--rise-delay": "0.05s" } as React.CSSProperties}>
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
                className="rounded-sm bg-gold px-7 py-3.5 font-semibold text-coal transition-colors hover:bg-gold-soft"
              >
                Try the demo
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
            <span className="stamp absolute -bottom-1 right-6 bg-coal/80 text-2xl text-gold backdrop-blur-sm">
              ATS 100
              <span className="block text-[0.5rem] tracking-[0.24em]">passes screening</span>
            </span>
          </div>
        </div>
      </section>

      {/* story — sticky narrative */}
      <section id="story" className="border-t border-hairline">
        <div className="mx-auto grid max-w-6xl gap-14 px-6 py-28 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <Reveal>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">The story</p>
              <h2 className="mt-5 font-display text-4xl leading-tight sm:text-5xl">
                Job hunting is a writing job
                <em className="text-gold-soft"> nobody applied for.</em>
              </h2>
              <div className="relative mt-10 hidden overflow-hidden rounded-sm lg:block">
                <Image
                  src="/story-paper.png"
                  alt=""
                  width={520}
                  height={347}
                  className="rounded-sm opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-coal/60 to-transparent" />
              </div>
            </Reveal>
          </div>
          <div className="flex flex-col gap-24 pt-4 lg:gap-40 lg:pt-24">
            {story.map((s, i) => (
              <Reveal key={s.title} delay={0.08 * i}>
                <div className="border-l border-gold/40 pl-8">
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-fog">{s.kicker}</p>
                  <h3 className="mt-4 font-display text-3xl text-bone">{s.title}</h3>
                  <p className="mt-4 max-w-md leading-relaxed text-fog">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="border-t border-hairline bg-graphite">
        <div className="mx-auto max-w-6xl px-6 py-28">
          <Reveal>
            <h2 className="font-display text-4xl sm:text-5xl">
              Three steps. <em className="text-gold-soft">No blank page.</em>
            </h2>
          </Reveal>
          <div className="mt-16 grid gap-px overflow-hidden rounded-sm border border-hairline bg-hairline md:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={0.1 * i} className="bg-graphite">
                <div className="group h-full bg-smoke/40 p-9 transition-colors duration-300 hover:bg-smoke">
                  <p className="font-display text-5xl italic text-gold/50 transition-colors duration-300 group-hover:text-gold">
                    {s.n}
                  </p>
                  <h3 className="mt-6 text-lg font-semibold text-bone">{s.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-fog">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* proof */}
      <section className="border-t border-hairline">
        <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 py-28 lg:grid-cols-2">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">The proof</p>
            <h2 className="mt-5 font-display text-4xl leading-tight sm:text-5xl">
              Checked before <em className="text-gold-soft">you send.</em>
            </h2>
            <p className="mt-6 max-w-md leading-relaxed text-fog">
              Every application is scored against the checks resume parsers
              actually run — and against one rule software can&apos;t enforce:
              nothing on the page that isn&apos;t true.
            </p>
            <ul className="mt-9 space-y-4">
              {checks.map((c) => (
                <li key={c} className="flex items-start gap-3.5 text-sm text-bone">
                  <span className="mt-0.5 text-gold">—</span>
                  {c}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="cropmarks p-6">
              <div className="rounded-sm border border-hairline bg-smoke/50 p-10 text-center">
                <svg viewBox="0 0 120 70" className="mx-auto w-56" aria-hidden="true">
                  <path d="M 12 62 A 48 48 0 0 1 108 62" fill="none" stroke="#2b2e35" strokeWidth="7" strokeLinecap="round" />
                  <path d="M 12 62 A 48 48 0 0 1 108 62" fill="none" stroke="#c9a227" strokeWidth="7" strokeLinecap="round" className="arc-path" />
                </svg>
                <p className="-mt-8 font-display text-6xl text-bone">100</p>
                <p className="mt-2 text-[0.65rem] font-bold uppercase tracking-[0.3em] text-gold">
                  ATS readiness
                </p>
                <p className="mt-6 border-t border-hairline pt-5 text-sm text-fog">
                  Keyword coverage, section structure, parser safety —
                  reported line by line, fixable in one click.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* templates */}
      <section id="templates" className="border-t border-hairline bg-graphite">
        <div className="mx-auto max-w-6xl px-6 py-28">
          <Reveal>
            <h2 className="font-display text-4xl sm:text-5xl">
              Typeset, <em className="text-gold-soft">not templated.</em>
            </h2>
            <p className="mt-5 max-w-xl text-fog">
              Every layout is single-column, real text — beautiful to a
              recruiter, legible to a machine.
            </p>
          </Reveal>
          <div className="mt-16 grid gap-10 md:grid-cols-3">
            {(
              [
                ["slate", "Slate Banner", "Confident dark header."],
                ["serif", "Executive Serif", "Centered small caps, senior calm."],
                ["modern", "Minimal Modern", "Air, restraint, hierarchy."],
              ] as const
            ).map(([variant, name, blurb], i) => (
              <Reveal key={name} delay={0.1 * i}>
                <div className="group">
                  <div className="transition-transform duration-500 ease-out group-hover:-translate-y-2">
                    <ResumeMini variant={variant} />
                  </div>
                  <div className="mt-5 flex items-baseline justify-between border-t border-hairline pt-4">
                    <p className="font-semibold text-bone">{name}</p>
                    <p className="text-xs text-fog">{blurb}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* access */}
      <section id="access" className="border-t border-hairline">
        <div className="mx-auto max-w-6xl px-6 py-28">
          <Reveal>
            <h2 className="font-display text-4xl sm:text-5xl">Access.</h2>
          </Reveal>
          <div className="mt-14 grid gap-px overflow-hidden rounded-sm border border-hairline bg-hairline md:grid-cols-3">
            {tiers.map((t, i) => (
              <Reveal key={t.name} delay={0.08 * i} className="bg-coal">
                <div className={`flex h-full flex-col p-9 ${t.featured ? "bg-smoke" : "bg-graphite/60"}`}>
                  <p className={`text-xs font-bold uppercase tracking-[0.28em] ${t.featured ? "text-gold" : "text-fog"}`}>
                    {t.name}
                  </p>
                  <p className="mt-5 font-display text-5xl text-bone">
                    {t.price}
                    {t.name === "Pro" && <span className="text-lg text-fog">/mo</span>}
                  </p>
                  <p className="mb-8 mt-4 flex-1 text-sm leading-relaxed text-fog">{t.note}</p>
                  <Link
                    href="/app"
                    className={`rounded-sm px-5 py-3 text-center text-sm font-semibold transition-colors ${
                      t.featured
                        ? "bg-gold text-coal hover:bg-gold-soft"
                        : "border border-hairline text-bone hover:border-fog"
                    }`}
                  >
                    {t.featured ? "Start with Pro" : "Begin"}
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-xs text-fog/60">Early-access pricing, subject to change.</p>
        </div>
      </section>

      {/* final CTA */}
      <section className="border-t border-hairline">
        <div className="hero-glow mx-auto max-w-6xl px-6 py-32 text-center">
          <Reveal>
            <h2 className="font-display text-4xl leading-tight sm:text-6xl">
              Ready when <em className="text-gold-soft">you are.</em>
            </h2>
            <p className="mx-auto mt-6 max-w-md text-fog">
              Open the demo, paste a job you want, and watch your experience
              take the right shape.
            </p>
            <Link
              href="/app"
              className="mt-10 inline-block rounded-sm bg-gold px-9 py-4 font-semibold text-coal transition-colors hover:bg-gold-soft"
            >
              Start your first application
            </Link>
          </Reveal>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-12 sm:flex-row sm:justify-between">
          <Logo light />
          <p className="text-xs text-fog/60">
            Honest by design — Forume never invents what you didn&apos;t do.
          </p>
        </div>
      </footer>
    </main>
  );
}
