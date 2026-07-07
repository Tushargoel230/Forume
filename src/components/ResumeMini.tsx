/* Miniature resume previews with real typeset content — used on the landing
   page so templates read as documents, not abstract bars. */

type Variant = "slate" | "modern" | "serif";

const SAMPLE = {
  name: "Amara Osei",
  headline: "Senior Product Designer",
  contact: "amara@osei.design · Amsterdam",
  summary:
    "Product designer shaping research-heavy tools into calm, legible interfaces.",
  sections: [
    {
      title: "Experience",
      lines: [
        ["Product Designer — Fieldnote", "2022 – Now"],
        ["Led redesign of the review flow; task completion up 31%.", ""],
        ["Built the design system used across 4 product teams.", ""],
      ],
    },
    {
      title: "Skills",
      lines: [["Figma · Prototyping · Design systems · Research", ""]],
    },
  ],
};

export function ResumeMini({ variant, className = "" }: { variant: Variant; className?: string }) {
  const slate = variant === "slate";
  const serif = variant === "serif";
  return (
    <div
      className={`overflow-hidden rounded-[3px] bg-white text-[#1d1f22] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.55)] ${
        serif ? "font-display" : ""
      } ${className}`}
      aria-hidden="true"
    >
      <div
        className={
          slate
            ? "bg-[#232629] px-5 py-4 text-white"
            : serif
              ? "px-5 pt-5 pb-2 text-center"
              : "px-5 pt-5 pb-2"
        }
      >
        <p
          className={
            slate
              ? "text-[13px] font-bold uppercase tracking-[0.18em]"
              : serif
                ? "text-[15px] tracking-[0.14em] uppercase"
                : "text-[16px] font-light tracking-wide"
          }
        >
          {SAMPLE.name}
        </p>
        <p className={`text-[9px] ${slate ? "text-white/60" : "text-[#777]"} ${serif ? "italic" : ""}`}>
          {SAMPLE.headline} · {SAMPLE.contact}
        </p>
      </div>
      <div className="px-5 pb-5 pt-2 text-[8.5px] leading-[1.5]">
        <p className="text-[#444]">{SAMPLE.summary}</p>
        {SAMPLE.sections.map((s) => (
          <div key={s.title} className="mt-2.5">
            <p
              className={`text-[7.5px] font-bold uppercase tracking-[0.2em] pb-0.5 mb-1 border-b ${
                slate
                  ? "border-[#232629]"
                  : serif
                    ? "border-[#cfc4b8] text-[#7a2e2e] text-center"
                    : "border-[#ddd] text-[#8a6d1f]"
              }`}
            >
              {s.title}
            </p>
            {s.lines.map(([left, right], i) => (
              <p key={i} className="flex justify-between gap-3">
                <span className={i === 0 && s.title === "Experience" ? "font-semibold" : "text-[#555]"}>
                  {left}
                </span>
                {right && <span className="text-[#888] whitespace-nowrap">{right}</span>}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
