"use client";

import { useState } from "react";
import type { Resume } from "@/lib/types";

/* Structured editor over the resume JSON. Every section supports add / remove /
   reorder of entries; bullets are one-per-line textareas, skill items are
   comma-separated. Cover-letter editing lives on its own result tab. */

const inputCls =
  "w-full rounded-md border border-rule-dark bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink";

type ListKey = "skills" | "experience" | "projects" | "education";

const BLANK: Record<ListKey, () => Resume[ListKey][number]> = {
  skills: () => ({ category: "", items: [] }),
  experience: () => ({ title: "", company: "", location: "", dates: "", bullets: [] }),
  projects: () => ({ name: "", tech: "", bullets: [] }),
  education: () => ({ degree: "", school: "", dates: "", details: "" }),
};

export function ResumeEditor({
  resume,
  onSave,
  onCancel,
}: {
  resume: Resume;
  onSave: (resume: Resume) => void;
  onCancel: () => void;
}) {
  // deep copy so edits never mutate the live result until saved
  const [r, setR] = useState<Resume>(() => JSON.parse(JSON.stringify(resume)));

  const set = (patch: Partial<Resume>) => setR((cur) => ({ ...cur, ...patch }));

  function mutateList<K extends ListKey>(key: K, fn: (list: Resume[K]) => Resume[K]) {
    setR((cur) => ({ ...cur, [key]: fn([...(cur[key] ?? [])] as Resume[K]) }));
  }
  const addTo = (key: ListKey) =>
    mutateList(key, (list) => [...list, BLANK[key]()] as Resume[ListKey]);
  const removeFrom = (key: ListKey, i: number) =>
    mutateList(key, (list) => list.filter((_, idx) => idx !== i) as Resume[ListKey]);
  const move = (key: ListKey, i: number, dir: -1 | 1) =>
    mutateList(key, (list) => {
      const j = i + dir;
      if (j < 0 || j >= list.length) return list;
      const copy = [...list];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy as Resume[ListKey];
    });

  return (
    <div className="space-y-6">
      <Block title="Headline">
        <input className={inputCls} value={r.headline ?? ""} onChange={(e) => set({ headline: e.target.value })} />
      </Block>

      <Block title="Summary">
        <textarea className={inputCls} rows={3} value={r.summary ?? ""} onChange={(e) => set({ summary: e.target.value })} />
      </Block>

      <Block title="Skills — items comma-separated" onAdd={() => addTo("skills")} addLabel="Add skill group">
        {(r.skills ?? []).map((g, i) => (
          <Entry key={i} onUp={() => move("skills", i, -1)} onDown={() => move("skills", i, 1)}
            onRemove={() => removeFrom("skills", i)} first={i === 0} last={i === (r.skills?.length ?? 0) - 1}>
            <div className="grid gap-2 sm:grid-cols-[200px_1fr]">
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
          </Entry>
        ))}
        {(r.skills?.length ?? 0) === 0 && <Empty>No skill groups yet.</Empty>}
      </Block>

      <Block title="Experience — bullets one per line" onAdd={() => addTo("experience")} addLabel="Add role">
        {(r.experience ?? []).map((j, i) => (
          <Entry key={i} onUp={() => move("experience", i, -1)} onDown={() => move("experience", i, 1)}
            onRemove={() => removeFrom("experience", i)} first={i === 0} last={i === (r.experience?.length ?? 0) - 1}>
            <div className="grid gap-2 sm:grid-cols-2">
              <input className={inputCls} value={j.title} placeholder="Title"
                onChange={(e) => updateAt(setR, "experience", i, { title: e.target.value })} />
              <input className={inputCls} value={j.company} placeholder="Company"
                onChange={(e) => updateAt(setR, "experience", i, { company: e.target.value })} />
              <input className={inputCls} value={j.location ?? ""} placeholder="Location"
                onChange={(e) => updateAt(setR, "experience", i, { location: e.target.value })} />
              <input className={inputCls} value={j.dates ?? ""} placeholder="Dates"
                onChange={(e) => updateAt(setR, "experience", i, { dates: e.target.value })} />
            </div>
            <textarea
              className={`${inputCls} mt-2`} rows={4} value={j.bullets.join("\n")}
              placeholder="One bullet per line"
              onChange={(e) =>
                updateAt(setR, "experience", i, { bullets: e.target.value.split("\n").filter((b) => b.trim()) })}
            />
          </Entry>
        ))}
        {(r.experience?.length ?? 0) === 0 && <Empty>No roles yet.</Empty>}
      </Block>

      <Block title="Projects — bullets one per line" onAdd={() => addTo("projects")} addLabel="Add project">
        {(r.projects ?? []).map((p, i) => (
          <Entry key={i} onUp={() => move("projects", i, -1)} onDown={() => move("projects", i, 1)}
            onRemove={() => removeFrom("projects", i)} first={i === 0} last={i === (r.projects?.length ?? 0) - 1}>
            <div className="grid gap-2 sm:grid-cols-2">
              <input className={inputCls} value={p.name} placeholder="Name"
                onChange={(e) => updateAt(setR, "projects", i, { name: e.target.value })} />
              <input className={inputCls} value={p.tech ?? ""} placeholder="Tech"
                onChange={(e) => updateAt(setR, "projects", i, { tech: e.target.value })} />
            </div>
            <textarea
              className={`${inputCls} mt-2`} rows={3} value={p.bullets.join("\n")}
              placeholder="One bullet per line"
              onChange={(e) =>
                updateAt(setR, "projects", i, { bullets: e.target.value.split("\n").filter((b) => b.trim()) })}
            />
          </Entry>
        ))}
        {(r.projects?.length ?? 0) === 0 && <Empty>No projects yet.</Empty>}
      </Block>

      <Block title="Education" onAdd={() => addTo("education")} addLabel="Add education">
        {(r.education ?? []).map((ed, i) => (
          <Entry key={i} onUp={() => move("education", i, -1)} onDown={() => move("education", i, 1)}
            onRemove={() => removeFrom("education", i)} first={i === 0} last={i === (r.education?.length ?? 0) - 1}>
            <div className="grid gap-2 sm:grid-cols-2">
              <input className={inputCls} value={ed.degree} placeholder="Degree"
                onChange={(e) => updateAt(setR, "education", i, { degree: e.target.value })} />
              <input className={inputCls} value={ed.school} placeholder="School"
                onChange={(e) => updateAt(setR, "education", i, { school: e.target.value })} />
              <input className={inputCls} value={ed.dates ?? ""} placeholder="Dates"
                onChange={(e) => updateAt(setR, "education", i, { dates: e.target.value })} />
              <input className={inputCls} value={ed.details ?? ""} placeholder="Details"
                onChange={(e) => updateAt(setR, "education", i, { details: e.target.value })} />
            </div>
          </Entry>
        ))}
        {(r.education?.length ?? 0) === 0 && <Empty>No education yet.</Empty>}
      </Block>

      <Block title="Certifications — one per line">
        <textarea
          className={inputCls} rows={3} value={(r.certifications ?? []).join("\n")}
          onChange={(e) => set({ certifications: e.target.value.split("\n").filter((c) => c.trim()) })}
        />
      </Block>

      <div className="sticky bottom-0 flex justify-end gap-3 border-t border-rule bg-paper/95 pt-4 pb-1 backdrop-blur">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-stone hover:text-ink">
          Discard changes
        </button>
        <button
          onClick={() => onSave(r)}
          className="rounded-md bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-crimson"
        >
          Save &amp; refresh proof
        </button>
      </div>
    </div>
  );
}

function updateAt<K extends "experience" | "projects" | "education">(
  setR: React.Dispatch<React.SetStateAction<Resume>>,
  key: K,
  index: number,
  patch: Partial<Resume[K][number]>,
) {
  setR((cur) => {
    const list = [...(cur[key] ?? [])] as Resume[K];
    list[index] = { ...list[index], ...patch };
    return { ...cur, [key]: list };
  });
}

function Block({
  title, children, onAdd, addLabel,
}: {
  title: string;
  children: React.ReactNode;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-xs font-bold uppercase tracking-[0.22em] text-crimson">{title}</h3>
        {onAdd && (
          <button
            onClick={onAdd}
            className="shrink-0 rounded-md border border-rule-dark bg-white px-2.5 py-1 text-xs font-semibold text-ink hover:border-crimson hover:text-crimson"
          >
            + {addLabel ?? "Add"}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function Entry({
  children, onUp, onDown, onRemove, first, last,
}: {
  children: React.ReactNode;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  first: boolean;
  last: boolean;
}) {
  const ctl =
    "flex h-6 w-6 items-center justify-center rounded border border-rule-dark bg-white text-xs text-stone hover:text-ink disabled:opacity-30 disabled:hover:text-stone";
  return (
    <div className="mb-3 rounded-sm border border-rule bg-linen/60 p-3">
      <div className="mb-2 flex items-center justify-end gap-1.5">
        <button className={ctl} onClick={onUp} disabled={first} title="Move up" aria-label="Move up">↑</button>
        <button className={ctl} onClick={onDown} disabled={last} title="Move down" aria-label="Move down">↓</button>
        <button
          className={`${ctl} hover:border-crimson hover:!text-crimson`}
          onClick={onRemove} title="Remove" aria-label="Remove"
        >
          ✕
        </button>
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-sm border border-dashed border-rule-dark px-3 py-4 text-center text-sm text-stone">{children}</p>;
}
