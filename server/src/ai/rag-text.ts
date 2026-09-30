/**
 * Text preparation for the RAG knowledge base: PDF page extraction without
 * overlay duplicates, cleanup of layout noise, page-aware chunking, and
 * keyword query expansion for Islamic-finance spelling variants.
 */

export interface RagChunkInput {
  chunkIndex: number;
  content: string;
  metadata: { pageStart: number | null; pageEnd: number | null; paragraphRefs: string[] };
}

type PdfTextItem = { str: string; width: number; transform: number[] };
type PdfPageData = { getTextContent: (options: Record<string, boolean>) => Promise<{ items: PdfTextItem[] }> };
type PdfParse = (buffer: Buffer, options?: { pagerender?: (page: PdfPageData) => Promise<string> }) => Promise<{ text: string; numpages: number }>;

/** Bigram Dice similarity (0..1), used to recognise near-identical overlay copies. */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigrams = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i += 1) bigrams.set(a.slice(i, i + 2), (bigrams.get(a.slice(i, i + 2)) || 0) + 1);
  let shared = 0;
  for (let i = 0; i < b.length - 1; i += 1) {
    const pair = b.slice(i, i + 2);
    const available = bigrams.get(pair) || 0;
    if (available > 0) { shared += 1; bigrams.set(pair, available - 1); }
  }
  return (2 * shared) / (a.length + b.length - 2);
}

/**
 * Some PDFs (e.g. AAOIFI standards) draw every line twice at the same position
 * to fake bold type, often one text item per character, and either copy may
 * miss a glyph ("acordance"). pdf-parse's default renderer emits both copies
 * back to back. Items repeating an earlier item's text at (almost) the same
 * position on the line are dropped, multi-character items that overlap and are
 * near-identical keep the more complete copy, and each line is re-ordered by x
 * so glyphs recovered from the second copy land in the right place.
 */
export async function extractPdfPages(pdfParse: PdfParse, buffer: Buffer): Promise<string[]> {
  const pages: string[] = [];
  await pdfParse(buffer, {
    pagerender: async (pageData) => {
      const content = await pageData.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false });
      const lines: string[] = [];
      let parts: Array<{ str: string; x: number; width: number }> = [];
      let lastY: number | undefined;
      const endLine = () => {
        const sorted = [...parts].sort((a, b) => a.x - b.x);
        // A line drawn glyph-by-glyph plus a hidden whole-line text layer: keep the
        // whole-line copy (the glyph layer drops ligatures such as "cc" or "pp").
        const glyphs = sorted.filter((part) => part.str.length <= 1);
        const runs = sorted.filter((part) => part.str.length > 1);
        const glyphText = glyphs.map((part) => part.str).join('').trim();
        const runText = runs.map((part) => part.str).join('').trim();
        const layered = glyphText.length >= 5 && runText.length >= 5
          && glyphText.length >= 0.6 * runText.length && similarity(glyphText, runText) >= 0.7;
        if (sorted.length) lines.push((layered ? runs : sorted).map((part) => part.str).join(''));
        parts = [];
      };
      for (const item of content.items) {
        const x = item.transform[4];
        const y = item.transform[5];
        if (lastY !== undefined && Math.abs(y - lastY) >= 2) endLine();
        lastY = y;
        const str = item.str;
        const tolerance = Math.max(1, 0.5 * (item.width || 0));
        if (parts.some((part) => part.str === str && Math.abs(part.x - x) < tolerance)) continue;
        const overlay = str.trim().length >= 2 ? parts.find((part) => {
          const overlapWidth = Math.min(part.x + part.width, x + item.width) - Math.max(part.x, x);
          const positional = part.width > 0 && item.width > 0
            ? overlapWidth > 0.5 * Math.min(part.width, item.width)
            : Math.abs(part.x - x) < 2;
          return positional && similarity(part.str.trim(), str.trim()) >= 0.8;
        }) : undefined;
        if (overlay) {
          if (str.trim().length > overlay.str.trim().length) overlay.str = str;
        } else {
          parts.push({ str, x, width: item.width });
        }
      }
      endLine();
      const text = lines.join('\n');
      // pdf-parse renders pages sequentially, so push order is page order.
      pages.push(text);
      return text;
    },
  });
  return pages;
}

/** Fallback for text that still contains a whole line repeated back-to-back ("abcabc" or "abcbc"). */
export function undoubleLine(line: string): string {
  const trimmed = line.trim();
  if (trimmed.length < 6) return line;
  for (let split = Math.floor(trimmed.length / 2) - 1; split <= Math.ceil(trimmed.length / 2) + 1; split += 1) {
    const first = trimmed.slice(0, split);
    const second = trimmed.slice(split);
    if (first.length >= 3 && (second === first || second === first.slice(1))) return first;
  }
  return line;
}

/**
 * Removes layout noise: table-of-contents dot leaders, bare page numbers,
 * running headers/footers repeated on many pages, doubled lines, and blank pages.
 * Returns one entry per original page (blank pages become '') so page numbers stay aligned.
 */
export function cleanPages(rawPages: string[]): string[] {
  const normalise = (line: string) => undoubleLine(line)
    .replace(/\.{4,}|(?:\.\s){4,}/g, ' ')
    .replace(/[ \t ]+/g, ' ')
    .trim();
  const pages = rawPages.map((page) => page.split(/\r?\n/).map(normalise).filter(Boolean));
  const nonEmpty = pages.filter((lines) => lines.length > 0).length;
  const pageCount = new Map<string, number>();
  for (const lines of pages) for (const line of new Set(lines)) pageCount.set(line, (pageCount.get(line) || 0) + 1);
  const isRunningHeader = (line: string) => nonEmpty >= 5 && (pageCount.get(line) || 0) >= Math.max(3, nonEmpty * 0.3);
  return pages.map((lines) => lines
    .filter((line) => !/^\d{1,4}$/.test(line) && !isRunningHeader(line))
    .filter((line, index, all) => index === 0 || line !== all[index - 1])
    .join('\n'));
}

/** Plain text (not PDF) is treated as a single page without page numbers. */
export function chunkText(content: string, size = 1200, overlap = 200): RagChunkInput[] {
  return chunkPages([content], size, overlap).map((chunk) => ({ ...chunk, metadata: { ...chunk.metadata, pageStart: null, pageEnd: null } }));
}

/**
 * Line-aware chunking across pages with overlap. Chunks break on line
 * boundaries (never mid-word unless a single line exceeds the size) and record
 * the page range and any "(para. N)" references they contain.
 */
export function chunkPages(pages: string[], size = 1200, overlap = 200): RagChunkInput[] {
  const lines: Array<{ text: string; page: number }> = [];
  pages.forEach((page, index) => {
    for (const text of page.split('\n')) {
      if (!text.trim()) continue;
      // Split any single line longer than the chunk size into word-bounded pieces.
      if (text.length <= size) { lines.push({ text, page: index + 1 }); continue; }
      let rest = text;
      while (rest.length > size) {
        const cut = rest.lastIndexOf(' ', size) > size / 2 ? rest.lastIndexOf(' ', size) : size;
        lines.push({ text: rest.slice(0, cut), page: index + 1 });
        rest = rest.slice(cut).trimStart();
      }
      if (rest) lines.push({ text: rest, page: index + 1 });
    }
  });

  const chunks: RagChunkInput[] = [];
  let current: typeof lines = [];
  let carriedCount = 0;
  const length = (items: typeof lines) => items.reduce((total, item) => total + item.text.length + 1, 0);
  const flush = () => {
    if (!current.length) return;
    const content = current.map((item) => item.text).join('\n');
    const paragraphRefs = Array.from(new Set((content.match(/\(paras?\.\s*\d+(?:\s*(?:-|to)\s*\d+)?\)/gi) || []).map((ref) => ref.replace(/\s+/g, ' '))));
    chunks.push({ chunkIndex: chunks.length, content, metadata: { pageStart: current[0].page, pageEnd: current[current.length - 1].page, paragraphRefs } });
    // Carry the trailing lines (up to `overlap` characters) into the next chunk.
    const carried: typeof lines = [];
    for (let index = current.length - 1; index >= 0 && length(carried) + current[index].text.length <= overlap; index -= 1) carried.unshift(current[index]);
    current = carried.length === current.length ? [] : carried;
    carriedCount = current.length;
  };
  for (const line of lines) {
    if (current.length > carriedCount && length(current) + line.text.length + 1 > size) flush();
    current.push(line);
  }
  // Only emit the tail if it holds new lines beyond the overlap carried from the last chunk.
  if (current.length > carriedCount) flush();
  return chunks;
}

/** Spelling variants used across AAOIFI, BNM, and regional documents. */
const TERM_VARIANTS: string[][] = [
  ['musharakah', 'musharaka', 'musyarakah', 'musharkah'],
  ['mudarabah', 'mudaraba', 'mudharabah', 'mudarib', 'mudharib'],
  ['murabahah', 'murabaha'],
  ['ijarah', 'ijara', 'ijarah muntahia bittamleek'],
  ['istisna', "istisna'a", 'istisna’a', 'istisnaa', 'istisna`a'],
  ['wakalah', 'wakala', 'wakil'],
  ['salam'],
  ['sukuk', 'sukuks'],
  ['zakah', 'zakat'],
  ['takaful'],
  ['qard', 'qardh', 'qard hasan', 'qard al-hasan'],
  ['riba'],
  ['gharar'],
  ['shariah', 'sharia', "shari'a", 'shari’a', 'syariah', 'shar`i', 'shari`a'],
  ['waqf', 'wakaf'],
  ['tawarruq'],
];

const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'was', 'were', 'which', 'what', 'into', 'about', 'dan', 'yang', 'untuk', 'dengan', 'dalam', 'atau', 'rules', 'rule']);

export interface ExpandedQuery {
  /** Each group is satisfied by any of its variants (all lower-case). */
  groups: string[][];
  phrase: string;
}

export function expandQuery(query: string): ExpandedQuery {
  const phrase = query.trim().toLowerCase();
  const tokens = phrase.split(/[^\p{L}\p{N}'’`-]+/u).filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
  const groups: string[][] = [];
  for (const token of Array.from(new Set(tokens))) {
    const family = TERM_VARIANTS.find((variants) => variants.some((variant) => variant === token || (variant.length >= 5 && token.startsWith(variant))));
    const group = family ? Array.from(new Set([token, ...family])) : [token];
    if (!groups.some((existing) => existing.join('|') === group.join('|'))) groups.push(group);
  }
  return { groups: groups.length ? groups : [[phrase]], phrase };
}

/** All variants, for the database pre-filter (OR of case-insensitive contains). */
export function queryVariants(expanded: ExpandedQuery): string[] {
  return Array.from(new Set(expanded.groups.flat())).slice(0, 40);
}

/**
 * Relevance score: fraction of query terms matched (dominant), term frequency
 * (log-damped), and a bonus when the exact phrase appears. 0 means no match.
 */
export function scoreChunk(content: string, expanded: ExpandedQuery): number {
  const text = content.toLowerCase();
  let matchedGroups = 0;
  let frequency = 0;
  for (const group of expanded.groups) {
    const hits = group.reduce((total, variant) => total + countOccurrences(text, variant), 0);
    if (hits > 0) { matchedGroups += 1; frequency += Math.log2(1 + hits); }
  }
  if (!matchedGroups) return 0;
  const coverage = matchedGroups / expanded.groups.length;
  const phraseBonus = expanded.groups.length > 1 && text.includes(expanded.phrase) ? 0.5 : 0;
  return Number((coverage * 2 + frequency * 0.1 + phraseBonus).toFixed(4));
}

function countOccurrences(text: string, needle: string): number {
  let count = 0;
  for (let index = text.indexOf(needle); index !== -1; index = text.indexOf(needle, index + needle.length)) count += 1;
  return count;
}
