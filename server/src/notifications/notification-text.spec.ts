import { inLanguage, notificationLanguage } from './notification-language';
import { NotificationService } from './notification.service';
import { translateServerText } from './ms-text';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));

describe('the language of what is sent out', () => {
  it('follows the account, then the country', () => {
    expect(notificationLanguage({ preferences: { language: 'en' } }, 'CN-MYS')).toBe('en');
    expect(notificationLanguage({ preferences: { language: 'ms' } }, 'CN-SAU')).toBe('ms');
    expect(notificationLanguage({}, 'CN-MYS')).toBe('ms');
    expect(notificationLanguage(null, 'CN-MYS')).toBe('ms');
    expect(notificationLanguage({ preferences: { language: 'fr' } }, 'CN-SAU')).toBe('en');
    expect(notificationLanguage(null, null)).toBe('en');
  });

  it('leaves English as written, and text with no Malay wording', () => {
    expect(inLanguage('Rent received', 'en')).toBe('Rent received');
    expect(inLanguage('Rent received', 'ms')).toBe('Sewa diterima');
    expect(inLanguage('Something nobody translated', 'ms')).toBe('Something nobody translated');
  });
});

describe('Malay wording of what the server writes', () => {
  const unit = 'Tingkat 7, Menara Hidayah';
  const known: Array<[string, RegExp]> = [
    ['Your code to sign CTR-1', /^Kod anda untuk menandatangani CTR-1$/],
    ['Your code to sign CTR-1 (version 2) is 123456. It expires in 10 minutes. If you did not ask for it, do not share it and tell the platform.', /ialah 123456/],
    ['Rent reminder 2', /^Peringatan sewa 2$/],
    ['Rent to confirm (2027-03)', /^Sewa untuk disahkan \(2027-03\)$/],
    ['Rent received (2027-03)', /^Sewa diterima \(2027-03\)$/],
    ['Rent not confirmed (2027-03)', /^Sewa tidak disahkan \(2027-03\)$/],
    ['Statement of account 2027-03', /^Penyata akaun 2027-03$/],
    [`${unit}: Siti Aminah recorded MYR 25,500.00 for 2027-03 (reference IBG-1). Accounts: check the bank and confirm it.`, /Siti Aminah merekodkan MYR 25,500.00 bagi 2027-03 \(rujukan IBG-1\)\. Akaun: semak bank dan sahkan\.$/],
    [`${unit}: MYR 25,500.00 for 2027-03 is received (reference IBG-1).`, /MYR 25,500.00 bagi 2027-03 telah diterima \(rujukan IBG-1\)\.$/],
    [`${unit}: the payment recorded for 2027-03 (reference IBG-1) was not confirmed by Accounts: Not in the bank statement. The month is due again.`, /tidak disahkan oleh Akaun: Not in the bank statement\. Bulan ini perlu dibayar semula\.$/],
    [`${unit}: your statement for 2027-03 is ready on the lease. Outstanding: MYR 25,588.40, of which MYR 25,500.00 is past due.`, /penyata anda bagi 2027-03 sedia di halaman sewaan\. Baki tertunggak: MYR 25,588.40, termasuk MYR 25,500.00 yang telah lewat tarikh\.$/],
    [`${unit}: your statement for 2027-03 is ready on the lease. Nothing is outstanding.`, /sedia di halaman sewaan\. Tiada baki tertunggak\.$/],
    ['You recorded this payment, so someone else must confirm it.', /^Anda yang merekod bayaran ini/],
    ['Lease rejected by Shariah', /ditolak oleh Shariah/],
    ['Legal approval given', /^Kelulusan Legal diberi$/],
    ['Agreement for Shariah review', /semakan Shariah/],
    ['CTR-1 (Ijarah, version 3) is waiting for your legal review.', /versi 3.*semakan Legal/],
    ['The tenant agreed to version 2 of CTR-1. Read it and agree, or draft a revision.', /^Penyewa telah bersetuju/],
    ['The asset owner signed CTR-1. Sign it to complete the agreement.', /^Pemilik aset telah menandatangani/],
    [`${unit}: the rent of MYR 1,000.00 for 2027-03 is unpaid. Send reminder 1 by 2027-03-15 (RC-1).`, /Hantar peringatan 1/],
    [`${unit}: the rent of MYR 1,000.00 for 2027-03 is unpaid. Please pay by 2027-03-15. Reminder letter 2 (RC-1) is on the lease.`, /Surat peringatan 2/],
    ['RC-1: rent for 2027-03 is still unpaid; send reminder 2 (was due 2027-03-15).', /hantar peringatan 2/],
    ['RC-1: rent for 2027-03 is still unpaid; hand it to Legal (was due 2027-03-15).', /serahkan kepada Legal/],
    [`RC-1: ${unit}, rent for 2027-03 (MYR 1,000.00) is unpaid after three reminders. Tenant stopped answering.`, /selepas tiga peringatan\. Tenant stopped answering\.$/],
    ['RC-1: the rent for 2027-03 (MYR 1,000.00) is yours to follow up.', /tindakan susulan anda/],
    [`${unit}: the electricity bill for 2027-03 is MYR 1,450.60 (bill TNB-1). Pay it to the owner's bank account by 2027-04-15.`, /bil elektrik bagi 2027-03/],
    [`${unit}: the owner recorded the water bill for 2027-03 as received (reference IBG-7).`, /bil air bagi 2027-03/],
    [`${unit}: MYR 86,500.00 of the deposits held under LEASE-1 carries over to LEASE-2. Nothing more is to be paid.`, /Tiada bayaran lain/],
    [`${unit}: the lease ends on 2027-12-31, in 30 days. To continue, the tenant asks to renew or the owner offers it in Leasing; otherwise the space is handed back on that day.`, /pemilik menawarkannya di Sewaan/],
    [`Teras Sdn Bhd asks to renew ${unit}, from 2028-01-01 for 12 months at MYR 25,500.00 a month (LEASE-2, renewing LEASE-1).`, /membaharui LEASE-1/],
    ['Felcra: the Q3 2027 performance report is waiting for an auditor.', /S3 2027/],
  ];

  it.each(known)('reads %s in Malay', (text, wording) => {
    expect(translateServerText(text)).toMatch(wording);
  });

  it('keeps a fuller sentence from falling to a general wording', () => {
    expect(translateServerText('Sawit Hub for Ladang Jengka (ENG-1).')).toBe('Sawit Hub untuk Ladang Jengka (ENG-1).');
    expect(translateServerText('RM 5,000 for "Tranche 1" was released to the project.')).toBe('RM 5,000 untuk "Tranche 1" telah dilepaskan kepada projek.');
  });
});

describe('sending a queued notification', () => {
  const row = { id: 'O1', dedupeKey: 'k', recipientUserId: 'U1', organisationId: 'ORG', countryNodeId: 'CN-MYS', type: 'ASSET_LEASE', title: 'Rent received', message: 'Tingkat 7: the owner recorded MYR 1,000.00 for 2027-03 as received (reference IBG-1).', resourceType: null, resourceId: null, channels: 'IN_APP,EMAIL', deliveredChannels: '', attempts: 0, createdAt: new Date() };
  const run = async (profile: unknown) => {
    const prisma = {
      notificationOutbox: { findMany: jest.fn().mockResolvedValue([row]), updateMany: jest.fn().mockResolvedValue({ count: 1 }), update: jest.fn() },
      user: { findUnique: jest.fn().mockResolvedValue({ email: 'a@b.my', profile }) },
      notification: { upsert: jest.fn() },
    };
    const delivery = { deliverEach: jest.fn().mockResolvedValue([{ channel: 'EMAIL', outcome: 'SENT' }]) };
    await new NotificationService(prisma as never, {} as never, delivery as never).processOutbox();
    return { sent: delivery.deliverEach.mock.calls[0][0], kept: prisma.notification.upsert.mock.calls[0][0].create };
  };

  it("emails it in the recipient's language and keeps the record in English", async () => {
    const { sent, kept } = await run({ preferences: { language: 'ms' } });
    expect(sent).toMatchObject({ title: 'Sewa diterima', message: 'Tingkat 7: pemilik merekodkan MYR 1,000.00 bagi 2027-03 sebagai diterima (rujukan IBG-1).' });
    expect(kept).toMatchObject({ title: 'Rent received', message: row.message });
  });

  it('leaves it in English for someone who chose English', async () => {
    const { sent } = await run({ preferences: { language: 'en' } });
    expect(sent).toMatchObject({ title: 'Rent received', message: row.message });
  });
});

describe('Malay wording of the checks on the Reviews screens', () => {
  it.each([
    ['Name on the identity document does not match the application (entered: "Ali bin Abu")', 'Nama pada dokumen pengenalan tidak sepadan dengan permohonan (diisi: "Ali bin Abu")'],
    ['Address could not be found on the proof of address', 'Alamat tidak dijumpai pada bukti alamat'],
    ['Could not read any text from the ID card (front) - check it manually', 'Tiada teks dapat dibaca daripada kad pengenalan (depan): semak secara manual'],
    ['DOCUMENT_CONTENT: needs review (Possible photo of a screen; Applicant is under 18)', 'DOCUMENT_CONTENT: perlu disemak (Mungkin gambar skrin; Pemohon berumur bawah 18 tahun)'],
    ['LIVENESS: score 0.31 far below 0.36', 'LIVENESS: skor 0.31 jauh di bawah 0.36'],
    ['No blanks left in the text', 'Tiada ruang kosong dalam teks'],
    ['Still to fill: [Tenant name].', 'Masih perlu diisi: [Tenant name].'],
    ['2 text checks failed: No blanks left in the text, Lessor keeps ownership', '2 semakan teks gagal: Tiada ruang kosong dalam teks, Pemberi sewa kekal sebagai pemilik'],
    ['the AI scan found 1 serious gap', 'imbasan AI menemui 1 jurang serius'],
  ])('reads %s', (text, malay) => {
    expect(translateServerText(text)).toBe(malay);
  });
});
