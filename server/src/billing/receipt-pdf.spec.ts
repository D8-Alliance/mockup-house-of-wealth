import { RECEIPT_AKAD } from './receipt-akad';
import { renderReceiptPdf } from './receipt-pdf';

describe('renderReceiptPdf', () => {
  it('renders a one-page A4 PDF', async () => {
    const pdf = await renderReceiptPdf({
      title: 'Payment receipt',
      receiptNumber: 'HOW-INV-USRMYS9WQ1BJTK-1792136957852',
      issuedAt: '16/10/2026, 3:55:46 PM',
      billedTo: [['Name', 'Amran Zain'], ['Email', 'itmanager@alhidayahgroup.com'], ['Member ID', 'USR-MYS-9WQ1BJTK'], ['Organisation', 'Al Hidayah Group Sdn Bhd']],
      items: [{ description: 'Plus membership (monthly)', amount: 49 }, { description: 'AI credits applied (100 credits)', amount: -10 }],
      currency: 'MYR',
      status: 'Paid',
      akad: RECEIPT_AKAD.MEMBERSHIP,
      payment: [['Method', 'ToyyibPay'], ['ToyyibPay bill', 'if1veumd'], ['Gateway reference', 'TP2610160849326576'], ['FPX fee', 'MYR 1.00, charged by ToyyibPay on top of the total and kept by it']],
      notes: ['Membership and AI credits are platform services.'],
    });
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length).toBe(1);
    if (process.env.RECEIPT_SAMPLE) require('fs').writeFileSync(process.env.RECEIPT_SAMPLE, pdf);
  });
});
