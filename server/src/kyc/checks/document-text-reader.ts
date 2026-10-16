import { copyFile, mkdir, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import pdfParse from 'pdf-parse';
import { createWorker, Worker } from 'tesseract.js';

export interface DocumentText {
  text: string;
  /** How the text was obtained; 'none' means nothing readable was found. */
  method: 'pdf-text' | 'ocr' | 'none';
}

const OCR_LANGUAGES = ['eng', 'msa'] as const;
// The OCR worker is expensive to start, so it is kept warm between documents and released when idle.
const IDLE_SHUTDOWN_MS = 120_000;

/**
 * Reads the text of an uploaded KYC document entirely on this server: embedded
 * text for PDFs, Tesseract OCR for JPG/PNG. Language data ships with the npm
 * packages @tesseract.js-data/{eng,msa}, so no network access is needed.
 */
export class DocumentTextReader {
  private worker: Promise<Worker> | null = null;
  private idleTimer: NodeJS.Timeout | undefined;

  async read(document: { mimeType: string; content: Buffer }): Promise<DocumentText> {
    if (document.mimeType === 'application/pdf') {
      const parsed = await pdfParse(document.content).catch(() => null);
      const text = parsed?.text.trim() ?? '';
      if (text) return { text, method: 'pdf-text' };
      // A scanned PDF has no text layer. Scanners and phone apps store each page as a JPEG
      // inside the PDF, so those images are read with OCR instead.
      const pages = extractPdfJpegs(document.content);
      if (!pages.length) return { text: '', method: 'none' };
      const worker = await this.getWorker();
      try {
        const texts: string[] = [];
        for (const page of pages) texts.push((await worker.recognize(page)).data.text.trim());
        const joined = texts.filter(Boolean).join('\n');
        return { text: joined, method: joined ? 'ocr' : 'none' };
      } finally {
        this.scheduleShutdown();
      }
    }
    if (document.mimeType === 'image/png' || document.mimeType === 'image/jpeg') {
      const worker = await this.getWorker();
      try {
        const { data } = await worker.recognize(document.content);
        const text = data.text.trim();
        return { text, method: text ? 'ocr' : 'none' };
      } finally {
        this.scheduleShutdown();
      }
    }
    return { text: '', method: 'none' };
  }

  private getWorker(): Promise<Worker> {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (!this.worker) {
      this.worker = (async () => {
        const langPath = await languageDirectory();
        return createWorker([...OCR_LANGUAGES], 1, { langPath, cachePath: path.join(os.tmpdir(), 'how-tesseract-cache'), gzip: true, logger: () => undefined });
      })().catch((error: unknown) => {
        this.worker = null;
        throw error;
      });
    }
    return this.worker;
  }

  private scheduleShutdown() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      const worker = this.worker;
      this.worker = null;
      void worker?.then((instance) => instance.terminate()).catch(() => undefined);
    }, IDLE_SHUTDOWN_MS);
    this.idleTimer.unref();
  }
}

/**
 * The JPEG page images inside a scanned PDF (image streams with /DCTDecode), largest first, at most
 * `max` of them. Images stored another way (e.g. CCITT fax or JBIG2) are not found and stay unread.
 */
export function extractPdfJpegs(pdf: Buffer, max = 3): Buffer[] {
  const images: Buffer[] = [];
  let from = 0;
  for (;;) {
    const filter = pdf.indexOf('/DCTDecode', from);
    if (filter < 0) break;
    from = filter + 10;
    const objectStart = pdf.lastIndexOf(' obj', filter);
    const streamStart = pdf.indexOf('stream', filter);
    if (streamStart < 0) break;
    const dictionary = pdf.subarray(Math.max(0, objectStart), streamStart).toString('latin1');
    if (!/\/Subtype\s*\/Image/.test(dictionary)) continue;
    let start = streamStart + 'stream'.length;
    if (pdf[start] === 0x0d) start += 1;
    if (pdf[start] === 0x0a) start += 1;
    let end = pdf.indexOf('endstream', start);
    if (end < 0) break;
    const next = end;
    // The end-of-line before "endstream" is not part of the image data.
    while (end > start && (pdf[end - 1] === 0x0a || pdf[end - 1] === 0x0d)) end -= 1;
    const image = pdf.subarray(start, end);
    // A JPEG starts with FF D8 FF; anything else (e.g. a further filter on top) is skipped.
    if (image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff) images.push(Buffer.from(image));
    from = next;
  }
  return images.sort((a, b) => b.length - a.length).slice(0, max);
}

/** Tesseract takes one language directory; the npm data packages each ship their own, so gather them once. */
async function languageDirectory(): Promise<string> {
  const target = path.join(os.tmpdir(), 'how-tesseract-lang');
  await mkdir(target, { recursive: true });
  for (const language of OCR_LANGUAGES) {
    const file = `${language}.traineddata.gz`;
    const destination = path.join(target, file);
    const exists = await stat(destination).then(() => true, () => false);
    if (!exists) {
      const packageDir = path.dirname(require.resolve(`@tesseract.js-data/${language}/package.json`));
      await copyFile(path.join(packageDir, '4.0.0_best_int', file), destination);
    }
  }
  return target;
}
