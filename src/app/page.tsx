import Link from "next/link";

const steps = [
  {
    title: "Tell us your story once",
    body: "Upload old resumes or write down what you've actually done. That becomes your private knowledge base — you never re-explain your career again.",
  },
  {
    title: "Paste the job description",
    body: "Forume reads the role the way a recruiter and an ATS both do: the required skills, the seniority signals, the exact words the software scans for.",
  },
  {
    title: "Ship the proof",
    body: "A tailored resume and cover letter, typeset like a studio made them, scored against ATS checks — and every line traceable to your real experience.",
  },
];

const templates = [
  ["Slate Banner", "Confident dark header. Engineering favorite."],
  ["Minimal Modern", "Air and restraint. Lets the work speak."],
  ["Executive Serif", "Centered small caps. Senior and calm."],
  ["Classic Professional", "Georgia serif. Trusted anywhere."],
  ["Subtle Accent", "A quiet line of color. Warm but precise."],
  ["Dense One-Pager", "Ten years on one page, still readable."],
];

const tiers = [
  {
    name: "Starter",
    price: "Free",
    cadence: "",
    blurb: "See what your experience looks like when it's taken seriously.",
    features: ["1 tailored application", "2 templates", "ATS readiness report"],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Pro",
    price: "€14",
    cadence: "/month",
    blurb: "For an active search. Apply broadly without writing from scratch.",
    features: [
      "Unlimited tailored applications",
      "All 6 templates",
      "One-click ATS auto-fix",
      "Cover letters included",
      "Application history",
    ],
    cta: "Go Pro",
    featured: true,
  },
  {
    name: "Concierge",
    price: "€199",
    cadence: " one-time",
    blurb: "A complete application package for the role you really want.",
    features: [
      "Everything in Pro for 3 months",
      "Human review of your master profile",
      "Interview-ready talking points",
    ],
    cta: "Book Concierge",
    featured: false,
  },
];

const faqs = [
  [
    "Will it invent things about me?",
    "No — that's the point. Forume only writes from the experience you give it. If a job asks for something you haven't done, it reframes what you have honestly instead of fabricating. Your name is on the page; we treat that seriously.",
  ],
  [
    "Will ATS software actually read it?",
    "Every template is single-column, real text — no tables, graphics, or text boxes that break resume parsers. Each application gets a readiness score with the exact keywords found and missing, and one click fixes what's fixable.",
  ],
  [
    "I've been rejected a lot. How is this different?",
    "Most rejections happen before a human reads anything. Forume fights that specific battle: mirroring the job's own language where it's true of you, so your real experience makes it past the software and in front of a person.",
  ],
  [
    "Can I edit what it writes?",
    "Everything. Every bullet, every line of the cover letter, before anything is exported. Forume drafts; you decide.",
  ],
];

function Wordmark() {
  return (
    <span className="font-bold tracking-[0.18em] text-lg">
      FOR<span className="text-amber">UME</span>
    </span>
  );
}

export default function Landing() {
  return (
    <main className="flex-1">
      {/* nav */}
      <header className="sticky top-0 z-20 bg-linen/90 backdrop-blur border-b border-rule">
        <nav className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Wordmark />
          <div className="hidden sm:flex items-center gap-8 text-sm text-stone">
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#templates" className="hover:text-ink">Templates</a>
            <a href="#pricing" className="hover:text-ink">Pricing</a>
          </div>
          <Link
            href="/signin"
            className="rounded-md bg-pine px-4 py-2 text-sm font-semibold text-paper hover:bg-pine-deep transition-colors"
          >
            Sign in
          </Link>
        </nav>
      </header>

      {/* hero */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-24 grid gap-14 lg:grid-cols-[1.1fr_0.9fr] items-center">
        <div>
          <p className="text-xs font-bold tracking-[0.25em] text-pine uppercase mb-5">
            Tailored applications, honestly made
          </p>
          <h1 className="font-display text-5xl sm:text-6xl leading-[1.05] tracking-tight">
            The job hunt is brutal.
            <br />
            <em className="text-pine">Your application doesn&apos;t have to be.</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-stone leading-relaxed">
            Forume turns your real experience into a resume and cover letter
            tailored to each job description — typeset like a design studio made
            it, checked against the software recruiters actually use, and honest
            to the letter.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link
              href="/signin"
              className="rounded-md bg-pine px-6 py-3.5 font-semibold text-paper hover:bg-pine-deep transition-colors"
            >
              Start your first application
            </Link>
            <a
              href="#how"
              className="rounded-md border border-rule-dark px-6 py-3.5 font-semibold text-ink hover:border-ink transition-colors"
            >
              See how it works
            </a>
          </div>
          <p className="mt-5 text-sm text-stone">
            Free to try. No credit card. Your data stays yours.
          </p>
        </div>

        {/* proof card */}
        <div className="cropmarks p-5">
          <div className="relative rounded-sm border border-rule bg-paper p-8 shadow-[0_18px_50px_-20px_rgba(34,39,31,0.35)]">
            <div className="h-3 w-36 rounded-full bg-ink/85 mb-2" />
            <div className="h-2 w-24 rounded-full bg-stone/50 mb-6" />
            <div className="h-1.5 w-20 rounded-full bg-pine/70 mb-3" />
            {[92, 78, 86].map((w, i) => (
              <div key={i} className="h-2 rounded-full bg-stone/25 mb-2" style={{ width: `${w}%` }} />
            ))}
            <div className="h-1.5 w-24 rounded-full bg-pine/70 mt-5 mb-3" />
            {[88, 95, 70, 82].map((w, i) => (
              <div key={i} className="h-2 rounded-full bg-stone/25 mb-2" style={{ width: `${w}%` }} />
            ))}
            <div className="stamp absolute -right-3 -bottom-4 bg-paper text-xl shadow-md">
              ATS 100<span className="block text-[0.55rem] tracking-[0.2em]">passes screening</span>
            </div>
          </div>
        </div>
      </section>

      {/* empathy strip */}
      <section className="border-y border-rule bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="font-display text-2xl sm:text-3xl text-center leading-snug">
            Built for people rewriting the same resume at 2am —{" "}
            <em className="text-pine">students, career-changers, and anyone done
            being filtered out by software.</em>
          </p>
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="font-display text-4xl mb-14">
          Three steps. <em className="text-pine">No blank page.</em>
        </h2>
        <div className="grid gap-10 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="border-t-2 border-pine pt-6">
              <p className="text-xs font-bold tracking-[0.25em] text-stone mb-3">
                STEP {i + 1}
              </p>
              <h3 className="font-display text-2xl mb-3">{s.title}</h3>
              <p className="text-stone leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* templates */}
      <section id="templates" className="border-y border-rule bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="font-display text-4xl mb-4">
            Designed, <em className="text-pine">not generated.</em>
          </h2>
          <p className="text-stone max-w-2xl mb-14">
            Six typeset templates — every one single-column, real text, and
            parser-safe. Beautiful to a recruiter, legible to a machine.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map(([name, blurb]) => (
              <div
                key={name}
                className="rounded-sm border border-rule bg-linen p-6 hover:shadow-[0_12px_30px_-14px_rgba(34,39,31,0.3)] transition-shadow"
              >
                <div className="mb-4 h-24 rounded-sm border border-rule bg-paper p-3">
                  <div className="h-2 w-1/2 rounded-full bg-ink/80 mb-2" />
                  <div className="h-1.5 w-1/3 rounded-full bg-pine/60 mb-3" />
                  <div className="h-1.5 w-5/6 rounded-full bg-stone/30 mb-1.5" />
                  <div className="h-1.5 w-4/6 rounded-full bg-stone/30" />
                </div>
                <h3 className="font-semibold">{name}</h3>
                <p className="text-sm text-stone mt-1">{blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* honesty */}
      <section className="mx-auto max-w-6xl px-6 py-24 grid gap-12 lg:grid-cols-2 items-center">
        <div>
          <h2 className="font-display text-4xl mb-6 leading-tight">
            It never invents. <em className="text-pine">That&apos;s a feature.</em>
          </h2>
          <p className="text-stone leading-relaxed mb-4">
            AI resume tools love to hallucinate metrics you can&apos;t defend in an
            interview. Forume works under a hard rule: every employer, date,
            skill, and number must come from the experience you provided. If a
            job asks for something you haven&apos;t done, it reframes what you{" "}
            <em>have</em> done — honestly.
          </p>
          <p className="text-stone leading-relaxed">
            Because the worst outcome isn&apos;t a rejection. It&apos;s an interview you
            can&apos;t back up.
          </p>
        </div>
        <blockquote className="border-l-4 border-amber bg-paper p-8 rounded-sm">
          <p className="font-display text-2xl italic leading-snug">
            &ldquo;Mirror the job&apos;s language where it&apos;s true of you.
            Reframe what&apos;s transferable. Never fabricate.&rdquo;
          </p>
          <footer className="mt-4 text-sm text-stone">
            — the rule every Forume draft is written under
          </footer>
        </blockquote>
      </section>

      {/* pricing */}
      <section id="pricing" className="border-y border-rule bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="font-display text-4xl mb-4">
            Costs less than <em className="text-pine">one more month of searching.</em>
          </h2>
          <p className="text-stone max-w-2xl mb-14">
            A career consultant charges €150 an hour. Forume does the tailoring
            work for every application you send.
          </p>
          <div className="grid gap-6 lg:grid-cols-3">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={`rounded-sm border p-8 flex flex-col ${
                  t.featured
                    ? "border-pine bg-pine text-paper shadow-[0_24px_60px_-24px_rgba(20,56,48,0.7)]"
                    : "border-rule bg-linen"
                }`}
              >
                <h3 className="text-sm font-bold tracking-[0.2em] uppercase mb-4">
                  {t.name}
                </h3>
                <p className="font-display text-5xl">
                  {t.price}
                  <span className={`text-base ${t.featured ? "text-paper/70" : "text-stone"}`}>
                    {t.cadence}
                  </span>
                </p>
                <p className={`mt-3 text-sm leading-relaxed ${t.featured ? "text-paper/80" : "text-stone"}`}>
                  {t.blurb}
                </p>
                <ul className="mt-6 mb-8 space-y-2.5 text-sm flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <span className={t.featured ? "text-amber" : "text-pine"}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signin"
                  className={`rounded-md px-5 py-3 text-center font-semibold transition-colors ${
                    t.featured
                      ? "bg-paper text-pine hover:bg-linen"
                      : "border border-ink text-ink hover:bg-ink hover:text-paper"
                  }`}
                >
                  {t.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-8 text-xs text-stone">
            Launch pricing — subject to change while Forume is in early access.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-24">
        <h2 className="font-display text-4xl mb-12">Fair questions.</h2>
        <div className="space-y-4">
          {faqs.map(([q, a]) => (
            <details key={q} className="group rounded-sm border border-rule bg-paper p-6">
              <summary className="cursor-pointer font-semibold list-none flex justify-between items-center">
                {q}
                <span className="text-stone group-open:rotate-45 transition-transform text-xl leading-none">+</span>
              </summary>
              <p className="mt-4 text-stone leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* footer CTA */}
      <footer className="bg-pine-deep text-paper">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="font-display text-4xl mb-6">
            Your next application, <em className="text-amber">done properly.</em>
          </h2>
          <Link
            href="/signin"
            className="inline-block rounded-md bg-paper px-8 py-4 font-semibold text-pine hover:bg-linen transition-colors"
          >
            Start free
          </Link>
          <p className="mt-12 text-sm text-paper/60">
            <Wordmark /> · Built for people who are done rewriting resumes at 2am.
          </p>
        </div>
      </footer>
    </main>
  );
}
