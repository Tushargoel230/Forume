# Forume — Design Prompt Kit

How to get high-quality UI designs out of Claude (claude.ai artifacts) and bring
them back into the Next.js codebase without them turning generic.

---

## Part A — The reusable brand block (paste this FIRST, every time)

> You are the design lead for **Forume**, a premium web app that turns a person's
> real work history into a tailored, ATS-safe resume + cover letter for every job.
> Audience: young professionals, students, and career changers applying to many
> roles — frustrated, want to feel in control. It must read like a **high-end
> application consultancy**, never a cheap AI tool or a school project.
>
> **Brand identity — a pre-press / print shop.** Applications are treated as
> typeset "proofs." Keep this DNA:
> - **Palette (light base):** linen `#f6f4ef`, paper `#fffefb`, ink `#1f2124`,
>   stone `#6a6d71`, hairline rules `#e5e1d6`. Brand accent: **crimson `#c5283d`**
>   (a registration mark). Amber `#c77e2e` for warnings.
> - **Dark "coal" bands** for hero / CTA / brand panels: coal `#101113`, bone
>   `#ece9e2`, fog `#a7a49b`, warm gold `#c9a227` / `#e6c86e`.
> - **Type:** display serif = **Newsreader** (used with restraint, real italics for
>   emphasis); body/UI = **Public Sans**. Uppercase, wide-tracked "spec labels" for
>   kickers.
> - **Signature devices:** CSS **crop marks** framing proof cards, a rotated rubber
>   **stamp**, thin hairline rules, zero-to-small border radius, generous whitespace.
> - **Motion:** restrained — scroll reveals, one animated element max per view,
>   always honor `prefers-reduced-motion`.
>
> **Hard rules:** honest, calm, editorial. No gradients-as-decoration, no glassmorphism,
> no purple SaaS look, no emoji-as-icons. Light and dark must both be handled.
> Responsive to mobile (~380px). Accessible: visible focus, real contrast.

## Part B — The request block (fill in the blanks, paste AFTER the brand block)

> Design **[WHICH SCREEN — e.g. "the result panel where a finished resume, its ATS
> score, and the fit verdict are shown"]**.
>
> It must contain: **[LIST THE REAL ELEMENTS AND DATA — e.g. "tabs for Resume /
> Cover letter / ATS check / Fit / Edit; a template switcher and a Save-as-PDF
> button; the resume rendered on a white sheet; an ATS gauge showing a 0–100 score;
> a five-band fit meter (Strong→Weak) with 2–4 reasons"]**.
>
> Primary user goal on this screen: **[e.g. "trust the output and export it"]**.
>
> Output ONE self-contained HTML file (inline CSS, no external assets) so it renders
> as an artifact. Use realistic sample content (a robotics engineer named Tushar
> Goel), not lorem ipsum. Show me the hardest part done well: **[e.g. "the fit meter
> and the ATS gauge as beautiful, on-brand data displays"]**. Before coding, give me
> a 3-line design plan (one risk you're taking) so I can react before you build.

### Filled-in example you can paste right now

Brand block above, then:

> Design the **empty/first-run state of the "New application" screen** — what a user
> sees before they've generated anything. Left: a form (Company, Role, Job description
> textarea, Generate button). Right: a "proof area" that previews what they'll get.
> Primary goal: make an empty screen feel inviting and premium, not blank. Output ONE
> self-contained HTML file, realistic sample content, mobile-responsive, light + dark.
> Show the proof-area treatment done beautifully. Give me a 3-line plan first.

---

## Part C — How to use the result in the real app

The artifact Claude gives you is a **static HTML mockup** — a target to build to, not
code you paste in. Recreate it inside the Next.js + Tailwind codebase like this:

1. **Iterate in claude.ai first.** Refine the artifact in that chat until it's right
   ("make the gauge bigger", "tighten the mobile layout"). Cheap to change there.

2. **Identify the screen's real file.** Landing → `src/app/page.tsx`; the app →
   `src/app/app/page.tsx`; sign-in → `src/app/signin/page.tsx`; a resume template →
   `src/components/ResumeSheet.tsx`.

3. **Translate hardcoded hex → design tokens.** The mockup will have raw colors like
   `#c5283d`. In the real app use the Tailwind token instead: `text-crimson`,
   `bg-linen`, `border-rule`, `bg-coal`, `text-gold-soft`, `font-display`. They're
   defined in `src/app/globals.css` (`@theme inline`). This keeps one source of truth
   and makes dark bands / theming work.

4. **Reuse existing pieces, don't recreate them.** Wrap proof cards in the `cropmarks`
   class, verdicts in the `stamp` class, scroll-ins in `<Reveal>`, the wordmark in
   `<Logo />`. Only build new components for genuinely new UI.

5. **Replace sample content with real data/props.** The mockup has fake text; wire the
   real fields — `result.resume`, `result.ats.score`, `result.ats.fit`, `contact`,
   the `TEMPLATES` list — and real handlers (`onFix`, `generate`, `saveEdit`).

6. **Build to a quality floor:** responsive to ~380px, visible keyboard focus,
   `prefers-reduced-motion` respected, works in light and dark.

7. **Verify before committing.** Run the dev server, drive the actual flow in the
   preview, screenshot it, then commit + push (auto-deploys to Vercel). Never ship a
   UI change on a screenshot alone.

**Rule of thumb:** the artifact decides *what it should look like*; the codebase
decides *how it's built* (tokens, components, real data). Keeping those separate is
what stops a redesign from becoming a rewrite.
