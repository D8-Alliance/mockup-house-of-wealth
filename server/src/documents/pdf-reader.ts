import { PDFParse } from 'pdf-parse';

/**
 * Reads the text layer of uploaded PDFs, on this server. pdf-parse 2 bundles a current pdf.js, which
 * reads the PDFs the old pdf-parse 1.1.1 (pdf.js 1.10) rejected with "bad XRef entry", such as many
 * that pdfkit and some scanners write with compressed streams.
 */
export async function readPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    // No "-- 1 of 3 --" markers between pages: callers match words and numbers in the text.
    const result = await parser.getText({ pageJoiner: '' });
    return result.text.trim();
  } finally {
    await parser.destroy();
  }
}

/** A run of text as pdf.js places it on the page: transform[4] is x, transform[5] is y. */
export interface PdfTextItem {
  str: string;
  width: number;
  transform: number[];
}

interface LoadedDocument {
  numPages: number;
  getPage(pageNumber: number): Promise<{ getTextContent(): Promise<{ items: Array<PdfTextItem | { type: string }> }> }>;
}

/**
 * Each page's text items in page order, for callers that rebuild lines themselves (the knowledge base
 * removes text drawn twice to fake bold). pdf-parse has no public hook for raw items, so this reads the
 * document it has loaded; the version is pinned in package.json for that reason.
 */
export async function readPdfPageItems(buffer: Buffer): Promise<PdfTextItem[][]> {
  const parser = new PDFParse({ data: buffer });
  try {
    await parser.getInfo();
    const doc = (parser as unknown as { doc?: LoadedDocument }).doc;
    if (!doc) throw new Error('The PDF reader did not load the document.');
    const pages: PdfTextItem[][] = [];
    for (let number = 1; number <= doc.numPages; number += 1) {
      const content = await (await doc.getPage(number)).getTextContent();
      // Marked-content markers carry no text.
      pages.push(content.items.filter((item): item is PdfTextItem => 'str' in item));
    }
    return pages;
  } finally {
    await parser.destroy();
  }
}
