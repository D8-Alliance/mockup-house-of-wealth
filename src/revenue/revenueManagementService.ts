import { 
  RevenueTransactionItem, 
  RevenueBillingRecord, 
  SubscriptionRecord, 
  AICreditSaleRecord, 
  PromotionSaleRecord,
  RevenueSummaryMetrics,
  RevenueFilterState
} from './revenueManagementTypes';
import { 
  INITIAL_REVENUE_METRICS_DATA,
  INITIAL_TRANSACTIONS_DATA,
  INITIAL_BILLING_RECORDS_DATA,
  INITIAL_SUBSCRIPTIONS_DATA,
  INITIAL_AI_CREDIT_SALES_DATA,
  INITIAL_PROMOTION_SALES_DATA
} from './revenueManagementData';

class RevenueManagementService {
  private metrics: RevenueSummaryMetrics = { ...INITIAL_REVENUE_METRICS_DATA };
  private transactions: RevenueTransactionItem[] = [...INITIAL_TRANSACTIONS_DATA];
  private billings: RevenueBillingRecord[] = [...INITIAL_BILLING_RECORDS_DATA];
  private subscriptions: SubscriptionRecord[] = [...INITIAL_SUBSCRIPTIONS_DATA];
  private aiCreditSales: AICreditSaleRecord[] = [...INITIAL_AI_CREDIT_SALES_DATA];
  private promotionSales: PromotionSaleRecord[] = [...INITIAL_PROMOTION_SALES_DATA];

  private listeners: Set<() => void> = new Set();

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  public getMetrics(): RevenueSummaryMetrics {
    return this.metrics;
  }

  public getTransactions(role?: string, userEmail?: string, userOrg?: string): RevenueTransactionItem[] {
    let list = [...this.transactions];
    if (role === 'Country Admin') {
      list = list.filter(t => t.country === 'Malaysia');
    } else if (role === 'Project Sponsor' || role === 'Project Manager') {
      list = list.filter(t => t.customerOrg === (userOrg || 'FELDA Technoplant Sdn Bhd'));
    } else if (role === 'Retail Investor' || role === 'HNWI Investor' || role === 'Investor') {
      list = list.filter(t => t.customerEmail === (userEmail || 'ahmad.faiz@gmail.com') || t.userType.includes('Investor'));
    }
    return list;
  }

  public getBillings(role?: string, userEmail?: string, userOrg?: string): RevenueBillingRecord[] {
    let list = [...this.billings];
    if (role === 'Country Admin') {
      list = list.filter(b => b.country === 'Malaysia');
    } else if (role === 'Project Sponsor' || role === 'Project Manager') {
      list = list.filter(b => b.customerOrg === (userOrg || 'FELDA Technoplant Sdn Bhd'));
    } else if (role === 'Retail Investor' || role === 'HNWI Investor') {
      list = list.filter(b => b.customerEmail === (userEmail || 'ahmad.faiz@gmail.com'));
    }
    return list;
  }

  public getSubscriptions(role?: string, userOrg?: string): SubscriptionRecord[] {
    let list = [...this.subscriptions];
    if (role === 'Country Admin') {
      list = list.filter(s => s.country === 'Malaysia');
    } else if (role === 'Project Sponsor') {
      list = list.filter(s => s.subscriberOrg === (userOrg || 'FELDA Technoplant Sdn Bhd'));
    }
    return list;
  }

  public getAICreditSales(role?: string): AICreditSaleRecord[] {
    let list = [...this.aiCreditSales];
    if (role === 'Country Admin') {
      list = list.filter(s => s.country === 'Malaysia');
    }
    return list;
  }

  public getPromotionSales(role?: string, userOrg?: string): PromotionSaleRecord[] {
    let list = [...this.promotionSales];
    if (role === 'Country Admin') {
      list = list.filter(s => s.country === 'Malaysia');
    } else if (role === 'Project Sponsor') {
      list = list.filter(s => s.sponsorOrg === (userOrg || 'FELDA Technoplant Sdn Bhd'));
    }
    return list;
  }

  public issueRefund(transactionId: string): boolean {
    const txn = this.transactions.find(t => t.id === transactionId);
    if (txn && txn.status === 'Paid') {
      txn.status = 'Refunded';
      const billing = this.billings.find(b => b.id === txn.invoiceId || b.invoiceNumber.includes(txn.id));
      if (billing) billing.status = 'Refunded';
      this.metrics.totalRevenueUSD = Math.max(0, this.metrics.totalRevenueUSD - txn.amountUSD);
      this.metrics.totalRevenueMYR = Math.max(0, this.metrics.totalRevenueMYR - txn.amountMYR);
      this.notify();
      return true;
    }
    return false;
  }

  public recordNewTransaction(item: Omit<RevenueTransactionItem, 'id' | 'taxMYR' | 'netMYR'>): RevenueTransactionItem {
    const taxMYR = Number((item.amountMYR * 0.06).toFixed(2));
    const netMYR = Number((item.amountMYR - taxMYR).toFixed(2));
    const newTxn: RevenueTransactionItem = {
      ...item,
      id: `TXN-${Date.now().toString().slice(-6)}`,
      taxMYR,
      netMYR
    };
    this.transactions = [newTxn, ...this.transactions];
    this.metrics.totalRevenueUSD += item.amountUSD;
    this.metrics.totalRevenueMYR += item.amountMYR;
    this.notify();
    return newTxn;
  }
}

export const revenueManagementService = new RevenueManagementService();
