/**
 * How a deceased member's capital in each pool passes to the recipients the estate officer names, following the
 * faraid certificate, probate or letters of administration and the member's own instructions.
 */

export interface PlanRecipient {
  userId: string;
  /** Share of the deceased's capital in that pool, in percent. */
  sharePct: number;
}

export interface PlanHolding {
  poolId: string;
  recipients: PlanRecipient[];
}

export interface SettlementPlan {
  holdings: PlanHolding[];
  note: string;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Splits `capital` by the recipients' shares, to the cent; the last recipient takes the rounding difference so
 * the parts add up to the capital exactly.
 */
export function splitHolding(capital: number, recipients: PlanRecipient[]): Array<{ userId: string; amount: number }> {
  let given = 0;
  return recipients.map((recipient, index) => {
    const amount = index === recipients.length - 1 ? round2(capital - given) : round2(capital * (recipient.sharePct / 100));
    given = round2(given + amount);
    return { userId: recipient.userId, amount };
  });
}

/**
 * What is wrong with a plan, or an empty list. Every pool the deceased holds must be in it exactly once, shares in
 * each pool must add up to 100%, nobody may appear twice in a pool, and the deceased cannot receive their own estate.
 */
export function planProblems(plan: SettlementPlan, held: string[], deceasedUserId: string): string[] {
  const problems: string[] = [];
  const planned = plan.holdings.map((holding) => holding.poolId);
  for (const poolId of held) if (!planned.includes(poolId)) problems.push(`Pool ${poolId} is held but has no recipients.`);
  for (const poolId of planned) {
    if (!held.includes(poolId)) problems.push(`Pool ${poolId} is not held by the deceased.`);
    if (planned.filter((id) => id === poolId).length > 1) problems.push(`Pool ${poolId} appears more than once.`);
  }
  for (const holding of plan.holdings) {
    if (!holding.recipients.length) problems.push(`Pool ${holding.poolId} has no recipients.`);
    const total = holding.recipients.reduce((sum, recipient) => sum + recipient.sharePct, 0);
    if (Math.abs(total - 100) > 0.01) problems.push(`Shares in pool ${holding.poolId} add up to ${round2(total)}%, not 100%.`);
    if (holding.recipients.some((recipient) => !(recipient.sharePct > 0))) problems.push(`Every share in pool ${holding.poolId} must be above 0%.`);
    const ids = holding.recipients.map((recipient) => recipient.userId);
    if (new Set(ids).size !== ids.length) problems.push(`A recipient appears twice in pool ${holding.poolId}.`);
    if (ids.includes(deceasedUserId)) problems.push('The deceased cannot receive their own estate.');
  }
  return [...new Set(problems)];
}
