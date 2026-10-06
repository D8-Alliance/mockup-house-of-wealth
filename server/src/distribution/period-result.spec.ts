import { periodOutcome } from './period-result';

const profit = (net: number, shared = net) => ({ kind: 'PROFIT', netProfit: net, distributableNet: shared });
const loss = (net: number) => ({ kind: 'LOSS', netProfit: net, distributableNet: 0 });
const absorbed = (net: number) => ({ kind: 'ABSORBED', netProfit: net, distributableNet: 0 });

describe('periodOutcome', () => {
  it('shares the whole profit when there is no earlier loss', () => {
    expect(periodOutcome([profit(100)], 80)).toEqual({ unrecoveredLoss: 0, lossOffset: 0, distributableNet: 80 });
  });

  it('recovers an earlier loss from later profit before sharing', () => {
    expect(periodOutcome([loss(-50)], 80)).toEqual({ unrecoveredLoss: 50, lossOffset: 50, distributableNet: 30 });
  });

  it('recovers a loss that came after profit was already shared', () => {
    expect(periodOutcome([profit(100), loss(-50)], 80)).toEqual({ unrecoveredLoss: 50, lossOffset: 50, distributableNet: 30 });
  });

  it('carries the rest of a loss forward when profit only partly covers it', () => {
    const first = periodOutcome([loss(-50)], 30);
    expect(first).toEqual({ unrecoveredLoss: 50, lossOffset: 30, distributableNet: 0 });
    // The 30 was recorded as ABSORBED; 20 of the loss is still unrecovered.
    expect(periodOutcome([loss(-50), absorbed(30)], 25)).toEqual({ unrecoveredLoss: 20, lossOffset: 20, distributableNet: 5 });
  });

  it('is back to normal once the loss is recovered', () => {
    expect(periodOutcome([loss(-50), profit(80, 30)], 20)).toEqual({ unrecoveredLoss: 0, lossOffset: 0, distributableNet: 20 });
  });

  it('never shares anything in a loss period', () => {
    expect(periodOutcome([profit(100)], -40)).toEqual({ unrecoveredLoss: 0, lossOffset: 0, distributableNet: 0 });
  });

  it('treats rows from before offsetting existed as fully shared', () => {
    expect(periodOutcome([{ kind: 'PROFIT', netProfit: 100, distributableNet: null }, loss(-30)], 50)).toEqual({ unrecoveredLoss: 30, lossOffset: 30, distributableNet: 20 });
  });
});
