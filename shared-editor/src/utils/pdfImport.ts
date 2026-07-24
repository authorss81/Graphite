import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export async function extractTextFromPdf(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const parts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const lines: string[] = [];
    let lastY: number | null = null;
    let line = "";
    for (const item of content.items) {
      if ("str" in item) {
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
          lines.push(line);
          line = item.str;
        } else if (lastY !== null && item.transform[0] < lastY) {
          line += " " + item.str;
        } else {
          line += item.str;
        }
        lastY = item.transform[5];
      }
    }
    if (line) lines.push(line);
    parts.push(lines.join("\n"));
  }

  return parts.join("\n\n");
}

export function pdfToMarkdown(text: string, fileName: string): string {
  const lines = text.split("\n").filter((l) => l.trim());
  const header = lines[0] || fileName.replace(/\.pdf$/i, "");
  return `# ${header}\n\n> Imported from ${fileName}\n\n${lines.slice(1).map((l) => l.trim()).join("\n\n")}`;
}
