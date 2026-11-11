jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));
import { matchStatement, parseAmount, parseStatementCsv, SubmittedPayout } from './bank-statement-match';
import { DistributionService } from './distribution.service';

describe('bank statement parsing', () => {
  it('reads amounts as banks write them', () => {
    expect(parseAmount('RM 1,234.50')).toBe(1234.5);
    expect(parseAmount('(1,234.50)')).toBe(-1234.5);
    expect(parseAmount('-500')).toBe(-500);
    expect(parseAmount('812.40 DR')).toBe(-812.4);
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('-')).toBeNull();
  });

  it('finds the header under the bank title, and keeps only the debits', () => {
    const csv = [
      'Maybank Islamic Statement,,,,',
      'Account,5641 2233 0012,,,',
      'Tarikh,Keterangan,Debit,Kredit,Baki',
      '01/12/2026,"IBG HOW-PAY-0001 AHMAD, BIN ALI",1500.00,,98500.00',
      '01/12/2026,PROFIT FROM POOL,,250.00,98750.00',
      '02/12/2026,DUITNOW HOW-PAY-0002,"2,000.00",,96750.00',
    ].join('\r\n');
    expect(parseStatementCsv(csv)).toEqual([
      { line: 1, date: '01/12/2026', description: 'IBG HOW-PAY-0001 AHMAD, BIN ALI', amount: 1500 },
      { line: 3, date: '02/12/2026', description: 'DUITNOW HOW-PAY-0002', amount: 2000 },
    ]);
  });

  it('takes the negative lines when there is a single signed amount column, semicolon-separated', () => {
    const csv = 'Date;Description;Amount\n2026-12-01;Transfer A;-300.00\n2026-12-01;Incoming;5000.00\n2026-12-02;Transfer B;-75.5';
    expect(parseStatementCsv(csv).map((line) => [line.description, line.amount])).toEqual([['Transfer A', 300], ['Transfer B', 75.5]]);
  });

  it('refuses a file without recognisable columns', () => {
    expect(() => parseStatementCsv('a,b,c\n1,2,3')).toThrow(/header row/);
  });
});

describe('bank statement matching', () => {
  const line = (n: number, description: string, amount: number) => ({ line: n, date: '2026-12-01', description, amount });
  const payout = (id: string, amount: number, providerReference: string | null = null): SubmittedPayout => ({ id, amount, currency: 'MYR', providerReference });

  it('pairs by transfer reference first, then by an amount unique on both sides', () => {
    const result = matchStatement(
      [line(1, 'IBG HOW PAY 0001 AHMAD', 1500), line(2, 'DUITNOW SITI', 742.1), line(3, 'BANK CHARGE', 0.5)],
      [payout('P1', 1500, 'HOW-PAY-0001'), payout('P2', 742.1, 'X')],
    );
    expect(result.matches.map((match) => [match.payoutId, match.line.line, match.basis])).toEqual([['P1', 1, 'REFERENCE'], ['P2', 2, 'AMOUNT']]);
    expect(result.unmatchedLines.map((item) => item.line)).toEqual([3]);
    expect(result.unmatchedPayoutIds).toEqual([]);
  });

  it('never pairs a reference whose amount differs: it is flagged instead', () => {
    const result = matchStatement([line(1, 'IBG HOW-PAY-0001', 1450)], [payout('P1', 1500, 'HOW-PAY-0001')]);
    expect(result.matches).toEqual([]);
    expect(result.mismatches).toEqual([{ payoutId: 'P1', line: line(1, 'IBG HOW-PAY-0001', 1450), expected: 1500 }]);
  });

  it('leaves repeated amounts without a reference for the officer to decide', () => {
    const result = matchStatement([line(1, 'TRANSFER', 1000), line(2, 'TRANSFER', 1000)], [payout('P1', 1000), payout('P2', 1000)]);
    expect(result.matches).toEqual([]);
    expect(result.ambiguous).toEqual([{ amount: 1000, payoutIds: ['P1', 'P2'], lines: [1, 2] }]);
    expect(result.unmatchedLines).toEqual([]);
    expect(result.unmatchedPayoutIds).toEqual([]);
  });

  it('uses each line once', () => {
    const result = matchStatement([line(1, 'IBG REF-AAAA REF-BBBB', 100)], [payout('P1', 100, 'REF-AAAA'), payout('P2', 100, 'REF-BBBB')]);
    expect(result.matches.map((match) => match.payoutId)).toEqual(['P1']);
    expect(result.unmatchedPayoutIds).toEqual(['P2']);
  });
});

describe('DistributionService bank statement', () => {
  const officer = { userId: 'USR-OPS', idpSubjectId: 'USR-OPS', email: 'ops@example.test', name: 'Ops', role: 'Settlement Officer', countryNodeId: 'CN-MYS', organisationId: 'ORG-WPM', assignedRoles: ['Settlement Officer'] } as never;
  const submitted = [
    { id: 'P1', amount: { toString: () => '1500' }, currency: 'MYR', providerReference: 'HOW-PAY-0001', beneficiaryUserId: 'USR-A', submittedAt: new Date('2026-12-01'), allocation: { distribution: { periodName: 'Q4 2026' } } },
    { id: 'P2', amount: { toString: () => '742.10' }, currency: 'MYR', providerReference: null, beneficiaryUserId: 'USR-B', submittedAt: new Date('2026-12-01'), allocation: { distribution: { periodName: 'Q4 2026' } } },
  ];
  const setup = () => {
    const prisma = {
      payoutInstruction: { findMany: jest.fn(async () => submitted) },
      user: { findMany: jest.fn(async () => [{ id: 'USR-A', name: 'Ahmad' }, { id: 'USR-B', name: 'Siti' }]) },
    };
    const audit = { recordActor: jest.fn(async () => undefined) };
    const service = new DistributionService(prisma as never, {} as never, audit as never);
    return { service, prisma, audit };
  };

  it('pairs the statement with sent payouts in that currency, without settling anything', async () => {
    const { service, prisma, audit } = setup();
    const result = await service.matchBankStatement(officer, { csv: 'Date,Description,Debit\n2026-12-02,IBG HOW-PAY-0001,1500.00\n2026-12-02,DUITNOW SITI,742.10', currency: 'myr' });
    expect(prisma.payoutInstruction.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: 'SUBMITTED', currency: 'MYR' }) }));
    expect(result.matches.map((match) => [match.payoutId, match.basis, match.payout.beneficiaryName])).toEqual([['P1', 'REFERENCE', 'Ahmad'], ['P2', 'AMOUNT', 'Siti']]);
    expect(audit.recordActor).toHaveBeenCalledWith(officer, expect.objectContaining({ action: 'payout.statement_matched' }));
  });

  it('settles the ticked payouts one by one and reports any that could not be settled', async () => {
    const { service, audit } = setup();
    const settle = jest.spyOn(service, 'settlePayout').mockResolvedValueOnce({} as never).mockRejectedValueOnce(new Error('Only submitted payouts can be settled.'));
    const result = await service.settleFromStatement(officer, { items: [{ payoutId: 'P1', line: 1 }, { payoutId: 'P2', line: 2 }], statementName: 'dec-2026.csv' });
    expect(settle).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ settled: ['P1'], failed: [{ payoutId: 'P2', reason: 'Only submitted payouts can be settled.' }] });
    expect(audit.recordActor).toHaveBeenCalledWith(officer, expect.objectContaining({ action: 'payout.statement_settled', metadata: expect.objectContaining({ statementName: 'dec-2026.csv' }) }));
  });

  it('is for settlement operators only', async () => {
    const { service } = setup();
    await expect(service.matchBankStatement({ ...(officer as object), role: 'Retail Investor' } as never, { csv: 'x', currency: 'MYR' })).rejects.toThrow(/settlement operators/);
  });
});
