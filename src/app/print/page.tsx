"use client";

import { useEffect, useState } from "react";
import { ResumeSheet } from "@/components/ResumeSheet";
import { CoverSheet } from "@/components/CoverSheet";
import type { PdfPayload } from "@/lib/types";

/* Headless-only render target for /api/pdf. The engine injects the sheet data
   as window.__FORUME_PDF__ before load; this page renders the real template at
   its design width and flags document readiness once fonts have loaded, so the
   engine can measure the content box and print one page exactly that size.
   Not linked anywhere in the app. */
export default function PrintPage() {
  const [payload, setPayload] = useState<PdfPayload | null>(null);

  useEffect(() => {
    const p = (window as unknown as { __FORUME_PDF__?: PdfPayload }).__FORUME_PDF__;
    if (p) setPayload(p);
  }, []);

  useEffect(() => {
    if (!payload) return;
    let done = false;
    const mark = () => {
      if (done) return;
      done = true;
      document.documentElement.dataset.pdfReady = "1";
    };
    const fonts = (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready;
    Promise.resolve(fonts).then(() =>
      requestAnimationFrame(() => requestAnimationFrame(mark)),
    );
    const t = setTimeout(mark, 4000); // safety net
    return () => clearTimeout(t);
  }, [payload]);

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      {/* no drop shadow/border in the exported file */}
      <style>{`#pdf-target .print-sheet{box-shadow:none!important;border:none!important}`}</style>
      <div id="pdf-target" style={{ width: 794, background: "#fff" }}>
        {payload?.kind === "resume" && (
          <ResumeSheet
            resume={payload.resume}
            contact={payload.contact}
            template={payload.template}
            showPhoto={payload.showPhoto}
          />
        )}
        {payload?.kind === "cover" && (
          <CoverSheet cover={payload.cover} contact={payload.contact} />
        )}
      </div>
    </div>
  );
}
