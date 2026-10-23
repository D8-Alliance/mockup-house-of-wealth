/** An amount in the project's currency, e.g. "RM 1,200,000". */
export const formatProjectMoney = (amount: number, currency = 'MYR') => {
  try {
    return new Intl.NumberFormat('en-MY', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString()}`;
  }
};
