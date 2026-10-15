import { isSimulatedBillingMethod, isSimulatedTopUp, simulatedPaymentsAllowed } from './membership.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));
jest.mock('./toyyibpay.service', () => ({ ToyyibPayService: class {} }));
jest.mock('../financial/financial-ledger.service', () => ({ FinancialLedgerService: class {}, toyyibPayCashAccount: jest.fn() }));

describe('simulated payments', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });

  it('are allowed outside production, and in production only with ALLOW_SIMULATED_PAYMENTS=true', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.ALLOW_SIMULATED_PAYMENTS;
    expect(simulatedPaymentsAllowed()).toBe(true);
    process.env.NODE_ENV = 'production';
    expect(simulatedPaymentsAllowed()).toBe(false);
    process.env.ALLOW_SIMULATED_PAYMENTS = 'true';
    expect(simulatedPaymentsAllowed()).toBe(true);
  });

  it('marks top-ups not settled through ToyyibPay as simulated', () => {
    expect(isSimulatedTopUp({ type: 'TOP_UP', reference: 'TOYYIBPAY-PAY-1' })).toBe(false);
    expect(isSimulatedTopUp({ type: 'TOP_UP', reference: 'AI-TOPUP-1759000000000' })).toBe(true);
    expect(isSimulatedTopUp({ type: 'TOP_UP', reference: null })).toBe(true);
    expect(isSimulatedTopUp({ type: 'CONSUMPTION', reference: null })).toBe(false);
  });

  it('does not mark plans paid entirely with AI credits as simulated', () => {
    expect(isSimulatedBillingMethod('120 AI credits')).toBe(false);
    expect(isSimulatedBillingMethod('None (Free Plan)')).toBe(false);
    expect(isSimulatedBillingMethod('Demo card (no charge) + 50 AI credits')).toBe(true);
    expect(isSimulatedBillingMethod('Simulated Card (•••• 4242)')).toBe(true);
  });
});
