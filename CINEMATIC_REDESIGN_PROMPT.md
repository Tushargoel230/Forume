# Forume — Cinematic Redesign Master Prompt

One long prompt, modeled on the "Aurum & Noir" brief style, pinned to Forume's
real subject and real features so the result can't drift into generic
watch-brand or purple-SaaS territory. Paste the whole thing as one message.

---

Build me an award-winning cinematic "scroll-scrub" redesign of **Forume's
landing page** — a real, already-shipped product (not a concept) that turns a
person's real work history into a tailored, ATS-safe resume and cover letter
for every job they apply to, written by an AI engine that is only allowed to
use facts from their own documents. The site must feel like a **high-end
application consultancy** — quiet, expensive, precise — never an AI tool, a
template, or a school project. This replaces the existing landing page inside
a working Next.js 16 + Tailwind v4 codebase; keep all real functionality (the
"Let's start" link into the actual app, the pricing section, legal links)
intact — this is a redesign, not a static mockup.

**VISUALS — generate with the Higgsfield MCP.** Use the most cinematic model
available, dark/editorial grade, 4K. Forume's world is the **pre-press print
shop**: typeset proofs, crop marks, letterpress, ink, registration marks —
never watches, jewelry, or tech-abstract. Generate a hero image first, then
animate it so every clip shares the same proof sheet and the same brushed-slate
surface it rests on. All clips 16:9, 5–10 seconds, no audio:

1. **HERO ORBIT** — a slow, perfectly smooth dolly/turntable around a stack of
   typeset resume proofs floating in a near-black void: crisp black ink on warm
   cream paper, a single crimson registration mark glowing at the corner, faint
   gold foil edge-lighting, drifting paper-dust and ink-mist particles.
2. **MACRO FLY-THROUGH** — an extreme close-up glide across the proof's surface:
   letterpress impression in the serif type, the grain of the paper, a crimson
   crop-mark hairline, light rippling across the ink as it catches a raking key
   light.
3. **EXPLODED ASSEMBLY** — the finished proof assembling itself from floating
   fragments: bullet points, skill tags, keyword chips, an ATS checkmark, a
   crimson stamp — converging and snapping into one typeset sheet.
4. **ATMOSPHERE** — the finished proof resting alone on dark brushed slate, thin
   smoke drifting through a single warm spotlight, the crimson stamp catching
   the light last.

**WEBSITE.**

- Scroll-scrub the **hero orbit** as a canvas frame sequence (the Apple-style
  effect where scrolling rotates/reveals the proof), Lenis smooth scroll, text
  reveals pinned to scroll position. Respect `prefers-reduced-motion` by
  freezing on the first frame and disabling pinning.
- **Sections**, in order:
  1. **Cinematic hero** — "FORUME" tracking in over the scroll-scrubbed proof
     orbit, one line of copy: *"Your experience, made undeniable."*
  2. **"Software reads it first."** story section — pinned text against the
     macro fly-through clip: the honest premise (a parser filters before a
     human ever sees the page) and the turn (Forume changes the order — tell
     your story once, it's tailored honestly for every role).
  3. **Macro / craft section** — scrubbing the macro clip, copy about the one
     non-negotiable rule: nothing on the page that isn't true. No invented
     employers, dates, or numbers — ever.
  4. **Exploded engineering section** with real spec callouts (not fictional
     ones): **6 hand-set typeset templates** (Onyx, Air, Century, Scarlet,
     Regent, Folio), **ATS readiness scored** (keyword coverage + parser-safety
     checks, shown as the existing animated score arc), **honest fit verdict**
     (five bands, Strong fit → Not a fit yet, with the real reasons behind it —
     not a percentage), **one-click auto-fix** that weaves missing keywords in
     only where they're true.
  5. **Template gallery** — the six templates shown as real typeset proofs
     (reuse `ResumeMini`/`ResumeSheet`), not abstract color swatches.
  6. **Access section** — the real pricing tiers (Starter free / Pro €14 /
     Concierge €199), framed honestly: *"Free while we grow — no card, no
     catch."* This is a real signup, not a waitlist.
  7. **Final CTA** — the atmosphere clip behind a single line and the real
     "Let's start" link into the app.
- **Design — reuse Forume's existing tokens, do not invent a new palette:**
  off-black **coal** `#101113` bands with **bone** `#ece9e2` text and warm
  **gold** `#c9a227`/`#e6c86e` accents for the cinematic sections; the existing
  **crimson** `#c5283d` stays the one brand accent that appears in every
  section (the stamp, the registration mark, one CTA). Display font
  **Newsreader** (serif, used with restraint, real italics for emphasis)
  paired with **Public Sans**. Signature devices: CSS crop marks framing proof
  cards, the rotated stamp component, thin hairline rules, uppercase
  wide-tracked spec-label kickers. Copy tone: quiet, honest, very few words —
  never salesy, never "results-driven" language.
- Fully responsive to mobile (~380px): the frame-sequence scroll-scrub must
  degrade gracefully (fewer frames or a static hero) rather than break.
  Visible keyboard focus throughout.
- **Launch it on localhost via the preview tools and verify every scroll
  animation, pin, and reveal actually fires in the real browser — screenshots
  and console/network checks, not just a code read — before telling me it's
  done.**

---

## Before you paste this

- **Higgsfield credits are tight** (roughly 4 left at last check, ~2/image) —
  four full animated clips likely isn't affordable in one pass. Either
  generate the hero orbit stills first and ask before spending more, or scope
  it down to one hero clip + static macro/atmosphere images.
- This is a **redesign of the real landing page**, not a new artifact — it
  should replace `src/app/page.tsx` and reuse existing components
  (`ResumeMini`, `ResumeSheet`, `Reveal`, `Logo`) wherever possible, not
  rebuild them from scratch.
- Read `DESIGN_BRIEF.md` alongside this — same brand rules, same
  token-reuse workflow for bringing anything back into the codebase cleanly.
