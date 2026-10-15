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
      const parsed = await pdfParse(document.content);
      const text = parsed.text.trim();
      // A scanned PDF has no text layer; it would need page rendering before OCR.
      return { text, method: text ? 'pdf-text' : 'none' };
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
