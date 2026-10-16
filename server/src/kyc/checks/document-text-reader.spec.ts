import { extractPdfJpegs } from './document-text-reader';

const jpeg = (size: number) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(size, 1), Buffer.from([0xff, 0xd9])]);
const imageObject = (n: number, body: Buffer, filter = '/DCTDecode', subtype = '/Image') => Buffer.concat([
  Buffer.from(`${n} 0 obj\n<< /Type /XObject /Subtype ${subtype} /Width 10 /Height 10 /Filter ${filter} /Length ${body.length} >>\nstream\r\n`, 'latin1'),
  body,
  Buffer.from('\nendstream\nendobj\n', 'latin1'),
]);

describe('extractPdfJpegs', () => {
  it('finds the JPEG page images of a scanned PDF, largest first', () => {
    const pdf = Buffer.concat([Buffer.from('%PDF-1.4\n'), imageObject(1, jpeg(10)), imageObject(2, jpeg(50)), Buffer.from('%%EOF')]);
    const pages = extractPdfJpegs(pdf);
    expect(pages).toHaveLength(2);
    expect(pages[0].length).toBeGreaterThan(pages[1].length);
    expect(pages[0][0]).toBe(0xff);
    expect(pages[0][pages[0].length - 1]).toBe(0xd9);
  });

  it('ignores streams that are not JPEG images, and keeps at most three pages', () => {
    const notImage = imageObject(1, jpeg(10), '/DCTDecode', '/Form');
    const flate = imageObject(2, Buffer.from('compressed pixels'), '/FlateDecode');
    const many = [3, 4, 5, 6].map((n) => imageObject(n, jpeg(n * 10)));
    const pages = extractPdfJpegs(Buffer.concat([Buffer.from('%PDF-1.4\n'), notImage, flate, ...many]));
    expect(pages).toHaveLength(3);
  });
});
