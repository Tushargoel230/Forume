import { NextResponse, type NextRequest } from "next/server";
import { renderPdf } from "@/lib/pdf/engine";
import type { PdfPayload } from "@/lib/types";

// Chromium needs the Node runtime; matches the other generation routes' budget.
export const runtime = "nodejs";
export const maxDuration = 300;

// All PDF generation flows through this one route (résumé + cover, demo +
// signed-in) so the rendering engine stays swappable in src/lib/pdf/engine.ts.
export async function POST(request: NextRequest) {
  let body: PdfPayload;
  try {
    body = (await request.json()) as PdfPayload;
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  if (body?.kind !== "resume" && body?.kind !== "cover") {
    return NextResponse.json({ error: "Unknown export kind." }, { status: 422 });
  }
  if (body.kind === "resume" && !body.resume) {
    return NextResponse.json({ error: "No résumé to export yet." }, { status: 422 });
  }
  if (body.kind === "cover" && !body.cover?.trim()) {
    return NextResponse.json({ error: "No cover letter to export yet." }, { status: 422 });
  }

  try {
    const pdf = await renderPdf(request.nextUrl.origin, body);
    const who = (body.contact?.name || "Forume").trim() || "Forume";
    const label = body.kind === "resume" ? "Resume" : "Cover Letter";
    const file = `${who} - ${label}.pdf`;
    const asciiFallback = file.replace(/[^\x20-\x7E]/g, "_");
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${asciiFallback.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(file)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[pdf]", e);
    return NextResponse.json(
      { error: "Couldn't generate the PDF. Please try again." },
      { status: 500 },
    );
  }
}
