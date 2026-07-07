/* Client-side text extraction for uploaded documents.
   PDF via pdfjs-dist, DOCX via mammoth — no server involved. */

const MIN_CHARS = 100;

export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  let text: string;

  if (name.endsWith(".pdf")) {
    text = await fromPdf(file);
  } else if (name.endsWith(".docx")) {
    text = await fromDocx(file);
  } else if (name.endsWith(".txt") || name.endsWith(".md")) {
    text = await file.text();
  } else {
    throw new Error("Unsupported file type — use PDF, DOCX, TXT, or MD.");
  }

  const cleaned = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (cleaned.length < MIN_CHARS) {
    throw new Error(
      "Almost no text found in this file — it may be a scanned image. " +
        "Open it, select all, copy, and paste the text as a note instead.",
    );
  }
  return cleaned;
}

async function fromPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" "),
    );
  }
  await doc.cleanup();
  return pages.join("\n\n");
}

async function fromDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}
