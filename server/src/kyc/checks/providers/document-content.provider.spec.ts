import { CheckContext } from '../check-types';
import { DocumentTextReader } from '../document-text-reader';
import { addressOnDocument, dateOfBirthOnDocument, datesInText, DocumentContentProvider, idNumberOnDocument, nameOnDocument } from './document-content.provider';

const idCardText = 'MALAYSIA KAD PENGENALAN\nName: AMINAH BINTI YUSOF\n1D No: 900512-10-1234\nWarganegara';
const billText = 'TENAGA NASIONAL\nAccount holder: AMINAH BINTI YUSOF\nNo. 8, Jalan Tun Razak, 50400 Kuala Lumpur\nBill date: 15-09-2026';

describe('document field matching', () => {
  it('finds the applicant name on the document, ignoring bin/binti and one OCR slip', () => {
    expect(nameOnDocument('Aminah binti Yusof', idCardText)).toBe('MATCH');
    expect(nameOnDocument('Aminah Yusof', 'Name: AMlNAH YUSOF')).toBe('MATCH');
    expect(nameOnDocument('Khaled bin Sulaiman', idCardText)).toBe('MISMATCH');
  });

  it('matches ID numbers regardless of dashes and common OCR confusions', () => {
    expect(idNumberOnDocument('900512101234', idCardText)).toBe('MATCH');
    expect(idNumberOnDocument('900512-10-1234', 'IC: 9OO512-1O-1234')).toBe('MATCH');
    expect(idNumberOnDocument('850101-14-5678', idCardText)).toBe('MISMATCH');
  });

  it('reads dates in several formats', () => {
    expect(datesInText('DOB 12/05/1990, issued 2020-01-31, expires 12 MAY 2031').sort()).toEqual(['1990-05-12', '2020-01-31', '2031-05-12']);
  });

  it('reports a date of birth mismatch only when no date on the document matches', () => {
    expect(dateOfBirthOnDocument(new Date('1990-05-12'), 'Born 12-05-1990, expiry 01-01-2031')).toBe('MATCH');
    expect(dateOfBirthOnDocument(new Date('1990-05-12'), 'Born 13-05-1991')).toBe('MISMATCH');
    expect(dateOfBirthOnDocument(new Date('1990-05-12'), 'no dates here')).toBe('NOT_FOUND');
  });

  it('checks the address, requiring the postcode when one was entered', () => {
    expect(addressOnDocument('No. 8, Jalan Tun Razak, 50400 Kuala Lumpur', billText)).toBe('MATCH');
    expect(addressOnDocument('No. 8, Jalan Tun Razak, 50450 Kuala Lumpur', billText)).toBe('MISMATCH');
  });
});

describe('DocumentContentProvider', () => {
  const subject = (overrides: Partial<CheckContext['subject']> = {}): CheckContext['subject'] => ({
    applicationId: 'KYC-1', userId: 'USR-1', countryNodeId: 'CN-MYS', fullName: 'Aminah binti Yusof', dateOfBirth: new Date('1990-05-12'), nationality: 'Malaysian',
    idDocumentType: 'NATIONAL_ID', idDocumentNumber: '900512-10-1234', idDocumentExpiry: null, residentialAddress: 'No. 8, Jalan Tun Razak, 50400 Kuala Lumpur',
    documentTypes: ['ID_FRONT', 'ID_BACK', 'SELFIE', 'PROOF_OF_ADDRESS'],
    loadDocument: async (type) => ({ mimeType: 'application/pdf', content: Buffer.from(type) }),
    ...overrides,
  });
  const reader = (texts: Record<string, string>) => ({ read: async (document: { content: Buffer }) => {
    const text = texts[document.content.toString()] ?? '';
    return { text, method: text ? 'pdf-text' : 'none' };
  } }) as unknown as DocumentTextReader;
  const run = (provider: DocumentContentProvider, s = subject()) => provider.run('DOCUMENT_CONTENT', { subject: s, previous: {}, signal: new AbortController().signal });

  it('passes when the documents agree with the application', async () => {
    const outcome = await run(new DocumentContentProvider(reader({ ID_FRONT: idCardText, ID_BACK: 'Alamat No. 8 Jalan Tun Razak', PROOF_OF_ADDRESS: billText })));
    expect(outcome.status).toBe('PASS');
    expect(outcome.reasons).toEqual([]);
  });

  it('raises a review with one reason per mismatched field', async () => {
    const outcome = await run(new DocumentContentProvider(reader({ ID_FRONT: idCardText, PROOF_OF_ADDRESS: billText })), subject({ fullName: 'Khaled bin Sulaiman', idDocumentNumber: '850101-14-5678' }));
    expect(outcome.status).toBe('REVIEW');
    expect(outcome.reasons).toEqual(expect.arrayContaining([
      'Name on the identity document does not match the application (entered: "Khaled bin Sulaiman")',
      'ID number on the identity document does not match the application (entered: "850101-14-5678")',
      'Name on the proof of address does not match the application (entered: "Khaled bin Sulaiman")',
    ]));
  });

  it('asks for a manual check when a document has no readable text', async () => {
    const outcome = await run(new DocumentContentProvider(reader({ ID_FRONT: idCardText, PROOF_OF_ADDRESS: billText })));
    expect(outcome.status).toBe('REVIEW');
    expect(outcome.reasons).toContain('Could not read any text from the ID card (back) - check it manually');
  });
});
