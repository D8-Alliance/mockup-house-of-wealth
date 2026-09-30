import { chunkPages, chunkText, cleanPages, expandQuery, queryVariants, scoreChunk, undoubleLine } from './rag-text';

describe('rag-text', () => {
  it('undoes lines that were rendered twice back-to-back', () => {
    expect(undoubleLine('2/3 Rounding amounts2/3 Rounding amounts')).toBe('2/3 Rounding amounts');
    expect(undoubleLine('mentsments')).toBe('ments');
    expect(undoubleLine('Musharaka financing.')).toBe('Musharaka financing.');
  });

  it('removes running headers, page numbers, and table-of-contents leaders but keeps page alignment', () => {
    const header = 'Financial Accounting Standard No. (1):';
    const pages = Array.from({ length: 6 }, (_, index) => `${header}\nBody text on page ${index + 1}\n${100 + index}`);
    pages[2] = '';
    pages[3] = `${header}\n3/1 Adequate disclosure .................... (8) 100`;
    const cleaned = cleanPages(pages);
    expect(cleaned).toHaveLength(6);
    expect(cleaned[0]).toBe('Body text on page 1');
    expect(cleaned[2]).toBe('');
    expect(cleaned[3]).toBe('3/1 Adequate disclosure (8) 100');
  });

  it('chunks on line boundaries with overlap and records page ranges and paragraph references', () => {
    const line = (n: number) => `Line ${n} ${'x'.repeat(80)}`;
    const pages = [Array.from({ length: 10 }, (_, i) => line(i)).join('\n'), `${line(10)} (para. 37)\n${line(11)}`];
    const chunks = chunkPages(pages, 400, 100);
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.every((chunk) => chunk.content.length <= 400)).toBe(true);
    // Every chunk starts at a line boundary, never mid-line.
    expect(chunks.every((chunk) => chunk.content.startsWith('Line '))).toBe(true);
    // Consecutive chunks share their boundary line (overlap).
    const lastLineOfFirst = chunks[0].content.split('\n').pop();
    expect(chunks[1].content.startsWith(lastLineOfFirst as string)).toBe(true);
    const last = chunks[chunks.length - 1];
    expect(last.metadata.pageEnd).toBe(2);
    expect(chunks.some((chunk) => chunk.metadata.paragraphRefs.includes('(para. 37)'))).toBe(true);
    expect(chunks[0].metadata.pageStart).toBe(1);
  });

  it('treats pasted text as page-less and splits over-long lines at word boundaries', () => {
    const chunks = chunkText('word '.repeat(600).trim(), 1200, 200);
    expect(chunks.every((chunk) => chunk.metadata.pageStart === null && chunk.content.length <= 1200)).toBe(true);
    expect(chunks.every((chunk) => !chunk.content.startsWith('ord'))).toBe(true);
  });

  it('expands Islamic-finance spelling variants so "Musharakah" finds AAOIFI "Musharaka"', () => {
    const expanded = expandQuery('Musharakah profit allocation');
    expect(queryVariants(expanded)).toEqual(expect.arrayContaining(['musharakah', 'musharaka', 'profit', 'allocation']));
    expect(scoreChunk('Profits and losses resulting from Musharaka contracts are recognized', expandQuery('Musharakah'))).toBeGreaterThan(0);
    expect(scoreChunk('Unrelated text about leasing', expandQuery('Musharakah'))).toBe(0);
  });

  it('ignores English and Malay question words so natural questions keep their meaningful terms', () => {
    expect(expandQuery('What must an Islamic institution disclose about Zakah?').groups.map((group) => group[0])).toEqual(['islamic', 'institution', 'disclose', 'zakah']);
    expect(expandQuery('Apakah yang perlu didedahkan tentang zakat?').groups.map((group) => group[0])).toEqual(['didedahkan', 'zakat']);
  });

  it('ranks chunks that match more query terms higher', () => {
    const query = expandQuery('zakah disclosure');
    const both = scoreChunk('The Zakah base should be disclosed. Disclosure of Zakah.', query);
    const one = scoreChunk('Zakah and charity fund', query);
    expect(both).toBeGreaterThan(one);
  });
});
