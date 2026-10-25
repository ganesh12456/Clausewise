export type Extraction = {
  text: string;
  pages: { page: number; text: string }[];
  coverage: string;
};
interface DocumentExtractor {
  supports(name: string): boolean;
  extract(file: File, progress: (message: string) => void): Promise<Extraction>;
}
const pdfExtractor: DocumentExtractor = {
  supports: (name) => name.endsWith(".pdf"),
  async extract(file, progress) {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const task = pdfjs.getDocument({ data: await file.arrayBuffer() });
    const pdf = await task.promise;
    try {
      if (pdf.numPages > 100)
        throw Error("This agreement exceeds the 100-page limit.");
      let text = "",
        empty = 0;
      const pages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        progress(`Reading page ${i} of ${pdf.numPages}`);
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        let value = "";
        for (const item of content.items)
          if ("str" in item) value += item.str + (item.hasEOL ? "\n" : " ");
        if (!value.trim()) empty++;
        pages.push({ page: i, text: value });
        text += value + "\n\n";
      }
      return {
        text,
        pages,
        coverage: empty
          ? `${empty} of ${pdf.numPages} pages need OCR. Review the original before making a decision.`
          : `Text extracted from all ${pdf.numPages} pages.`,
      };
    } finally {
      await task.destroy();
    }
  },
};
const docxExtractor: DocumentExtractor = {
  supports: (name) => name.endsWith(".docx"),
  async extract(file) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({
      arrayBuffer: await file.arrayBuffer(),
    });
    return {
      text: result.value,
      pages: [{ page: 1, text: result.value }],
      coverage:
        "Word paragraphs extracted. Original page numbers are unavailable.",
    };
  },
};
const textExtractor: DocumentExtractor = {
  supports: (name) => name.endsWith(".txt"),
  async extract(file) {
    const text = await file.text();
    return {
      text,
      pages: [{ page: 1, text }],
      coverage: "Plain text document.",
    };
  },
};
const extractors: DocumentExtractor[] = [
  pdfExtractor,
  docxExtractor,
  textExtractor,
];
export async function extractDocument(
  file: File,
  progress: (message: string) => void,
) {
  if (file.size > 20 * 1024 * 1024)
    throw Error("Each file must be under 20 MB.");
  const extractor = extractors.find((e) => e.supports(file.name.toLowerCase()));
  if (!extractor) throw Error("Choose a PDF, Word (.docx), or text file.");
  const result = await extractor.extract(file, progress);
  if (!result.text.trim())
    throw Error(
      "This file needs OCR before it can be reviewed. Upload a readable version.",
    );
  return result;
}
