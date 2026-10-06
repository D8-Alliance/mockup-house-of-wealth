import { BadRequestException } from '@nestjs/common';
import { localMidnight, resolvePeriod } from './statement-period';
import { renderStatementCsv, renderStatementPdf } from './statement-render';
import { Statement } from './statements.service';

describe('resolvePeriod', () => {
  const now = new Date('2026-10-06T03:00:00Z');

  it('uses local midnight in the country time zone (GMT+8 for Malaysia)', () => {
    const period = resolvePeriod({ from: '2026-07-01', to: '2026-09-30' }, 'CN-MYS', now);
    expect(period.start.toISOString()).toBe('2026-06-30T16:00:00.000Z');
    expect(period.end.toISOString()).toBe('2026-09-30T16:00:00.000Z');
    expect(period.timezone).toBe('Asia/Kuala_Lumpur');
  });

  it('defaults to the year to date', () => {
    expect(resolvePeriod({}, 'CN-MYS', now)).toMatchObject({ from: '2026-01-01', to: '2026-10-06' });
  });

  it('rejects malformed, impossible or reversed dates', () => {
    expect(() => resolvePeriod({ from: '2026-02-30' }, 'CN-MYS', now)).toThrow(BadRequestException);
    expect(() => resolvePeriod({ from: '06/10/2026' }, 'CN-MYS', now)).toThrow(BadRequestException);
    expect(() => resolvePeriod({ from: '2026-10-01', to: '2026-09-01' }, 'CN-MYS', now)).toThrow(/must not be after/);
  });

  it('handles a zone with daylight saving time', () => {
    // Cairo switches to summer time in late April; midnight is 21:00 UTC in summer and 22:00 UTC in winter.
    expect(localMidnight('2026-07-01', 'Africa/Cairo').toISOString()).toBe('2026-06-30T21:00:00.000Z');
    expect(localMidnight('2026-01-01', 'Africa/Cairo').toISOString()).toBe('2025-12-31T22:00:00.000Z');
  });
});

const statement: Statement = {
  kind: 'INVESTOR', title: 'Investor Statement', reference: 'HOW-STMT-INV-X', generatedAt: '2026-10-06 11:00', period: { from: '2026-01-01', to: '2026-10-06', timezone: 'Asia/Kuala_Lumpur' },
  subject: [['Investor', 'Aminah, "Ali"']], summary: [['Capital held at period end', '1000.00']],
  sections: [{ title: 'Holdings', columns: ['Pool', 'Capital'], rows: [['=HYPERLINK("x")', '1000.00'], ['Solar, Phase 2', '-5.00']] }, { title: 'Distributions', columns: ['Date'], rows: [], note: 'No distributions in this period.' }],
  notes: ['Not tax advice.'],
};

describe('statement rendering', () => {
  it('writes CSV with quoting and neutralises spreadsheet formulas', () => {
    const csv = renderStatementCsv(statement);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('Investor,"Aminah, ""Ali"""');
    expect(csv).toContain(`"'=HYPERLINK(""x"")",1000.00`);
    expect(csv).toContain('"Solar, Phase 2",-5.00');
    expect(csv).toContain('No distributions in this period.');
  });

  it('produces a PDF document', async () => {
    const pdf = await renderStatementPdf(statement);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1000);
    // One page only: the footer must not spill onto a blank extra page.
    expect((pdf.toString('latin1').match(/\/Type \/Page[^s]/g) || []).length).toBe(1);
  });
});
