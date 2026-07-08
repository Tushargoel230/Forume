"use client";

import { useState } from "react";
import type { Resume } from "@/lib/types";

/* Structured editor over the resume JSON — same shape as the desktop app's
   edit panel. Bullets are one-per-line textareas; skills are comma-separated. */

const inputCls =
  "w-full rounded-md border border-rule-dark bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink";

export function ResumeEditor({
  resume,
  coverLetter,
  onSave,
  onCancel,
}: {
  resume: Resume;
  coverLetter: string;
  onSave: (resume: Resume, coverLetter: string) => void;
  onCancel: () => void;
}) {
  // deep copy so edits never mutate the live result until saved
  const [r, setR] = useState<Resume>(() => JSON.parse(JSON.stringify(resume)));
  const [cover, setCover] = useState(coverLetter);

  const set = (patch: Partial<Resume>) => setR((cur) => ({ ...cur, ...patch }));

  return (
    <div className="space-y-6">
      <Block title="Headline">
        <input className={inputCls} value={r.headline ?? ""} onChange={(e) => set({ headline: e.target.value })} />
      </Block>

      <Block title="Summary">
        <textarea className={inputCls} rows={3} value={r.summary ?? ""} onChange={(e) => set({ summary: e.target.value })} />
      </Block>

      <Block title="Skills — items comma-separated">
        {(r.skills ?? []).map((g, i) => (
          <div key={i} className="mb-2 grid gap-2 sm:grid-cols-[200px_1fr]">
            <input
              className={inputCls} value={g.category} placeholder="Category"
              onChange={(e) => {
                const skills = [...r.skills];
                skills[i] = { ...g, category: e.target.value };
                set({ skills });
              }}
            />
            <input
              className={inputCls} value={g.items.join(", ")} placeholder="Item, item, item"
              onChange={(e) => {
                const skills = [...r.skills];
                skills[i] = { ...g, items: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) };
                set({ skills });
              }}
            />
          </div>
        ))}
      </Block>

      <Block title="Experience — bullets one per line">
        {(r.experience ?? []).map((j, i) => (
          <div key={i} className="mb-4 rounded-sm border border-rule bg-linen/60 p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <input className={inputCls} value={j.title} placeholder="Title"
                onChange={(e) => updateAt(r, set, "experience", i, { title: e.target.value })} />
              <input className={inputCls} value={j.company} placeholder="Company"
                onChange={(e) => updateAt(r, set, "experience", i, { company: e.target.value })} />
              <input className={inputCls} value={j.location ?? ""} placeholder="Location"
                onChange={(e) => updateAt(r, set, "experience", i, { location: e.target.value })} />
              <input className={inputCls} value={j.dates ?? ""} placeholder="Dates"
                onChange={(e) => updateAt(r, set, "experience", i, { dates: e.target.value })} />
            </div>
            <textarea
              className={`${inputCls} mt-2`} rows={4} value={j.bullets.join("\n")}
              onChange={(e) =>
                updateAt(r, set, "experience", i, { bullets: e.target.value.split("\n").filter((b) => b.trim()) })}
            />
          </div>
        ))}
      </Block>

      {(r.projects?.length ?? 0) > 0 && (
        <Block title="Projects — bullets one per line">
          {r.projects.map((p, i) => (
            <div key={i} className="mb-4 rounded-sm border border-rule bg-linen/60 p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <input className={inputCls} value={p.name} placeholder="Name"
                  onChange={(e) => updateAt(r, set, "projects", i, { name: e.target.value })} />
                <input className={inputCls} value={p.tech ?? ""} placeholder="Tech"
                  onChange={(e) => updateAt(r, set, "projects", i, { tech: e.target.value })} />
              </div>
              <textarea
                className={`${inputCls} mt-2`} rows={3} value={p.bullets.join("\n")}
                onChange={(e) =>
                  updateAt(r, set, "projects", i, { bullets: e.target.value.split("\n").filter((b) => b.trim()) })}
              />
            </div>
          ))}
        </Block>
      )}

      {(r.education?.length ?? 0) > 0 && (
        <Block title="Education">
          {r.education.map((ed, i) => (
            <div key={i} className="mb-2 grid gap-2 sm:grid-cols-2">
              <input className={inputCls} value={ed.degree} placeholder="Degree"
                onChange={(e) => updateAt(r, set, "education", i, { degree: e.target.value })} />
              <input className={inputCls} value={ed.school} placeholder="School"
                onChange={(e) => updateAt(r, set, "education", i, { school: e.target.value })} />
              <input className={inputCls} value={ed.dates ?? ""} placeholder="Dates"
                onChange={(e) => updateAt(r, set, "education", i, { dates: e.target.value })} />
              <input className={inputCls} value={ed.details ?? ""} placeholder="Details"
                onChange={(e) => updateAt(r, set, "education", i, { details: e.target.value })} />
            </div>
          ))}
        </Block>
      )}

      <Block title="Certifications — one per line">
        <textarea
          className={inputCls} rows={3} value={(r.certifications ?? []).join("\n")}
          onChange={(e) => set({ certifications: e.target.value.split("\n").filter((c) => c.trim()) })}
        />
      </Block>

      <Block title="Cover letter">
        <textarea className={inputCls} rows={12} value={cover} onChange={(e) => setCover(e.target.value)} />
      </Block>

      <div className="flex justify-end gap-3 border-t border-rule pt-4">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-stone hover:text-ink">
          Discard changes
        </button>
        <button
          onClick={() => onSave(r, cover)}
          className="rounded-md bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-crimson"
        >
          Save &amp; refresh proof
        </button>
      </div>
    </div>
  );
}

function updateAt<K extends "experience" | "projects" | "education">(
  r: Resume,
  set: (patch: Partial<Resume>) => void,
  key: K,
  index: number,
  patch: Partial<Resume[K][number]>,
) {
  const list = [...(r[key] ?? [])] as Resume[K];
  list[index] = { ...list[index], ...patch };
  set({ [key]: list } as Partial<Resume>);
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-crimson">{title}</h3>
      {children}
    </section>
  );
}
