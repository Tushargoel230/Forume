import type { Contact } from "@/lib/types";

/* The cover letter as a real, typeset letter — flowing paragraphs (split on
   blank lines), never a <textarea>. Same white sheet as the résumé so it
   exports identically: one content-sized page of selectable text. */
export function CoverSheet({ cover, contact }: { cover: string; contact: Contact }) {
  const blocks = cover
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  const head = [contact.email, contact.phone, contact.location].filter(Boolean);

  return (
    <div className="print-sheet bg-white text-[#1c1e21] text-[13.5px] leading-[1.65]">
      <div className="px-12 py-12">
        <header className="mb-8 border-b border-[#e5e1d6] pb-5">
          <p className="font-display text-[22px] tracking-[0.02em]">{contact.name || "Your Name"}</p>
          {head.length > 0 && <p className="mt-1 text-[12px] text-[#666]">{head.join("  ·  ")}</p>}
        </header>
        {blocks.map((b, i) => (
          <p key={i} className="mb-3 whitespace-pre-line">{b}</p>
        ))}
      </div>
    </div>
  );
}
