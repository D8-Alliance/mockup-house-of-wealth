import { InvestmentOrder, InvestorSuitabilityProfile } from './investmentTypes';
import { INITIAL_INVESTMENT_ORDERS, INITIAL_INVESTOR_PROFILES } from '../data/mockPoolingWorkflowDataPart3';
import { poolService } from '../pooling/poolService';
import { auditLogger } from '../audit/auditLogger';
import { notificationService } from '../notifications/notificationService';
import { generateNumericId } from '../utils/id';

class InvestmentService {
  private orders: InvestmentOrder[] = [...INITIAL_INVESTMENT_ORDERS];
  private suitabilityProfiles: InvestorSuitabilityProfile[] = [...INITIAL_INVESTOR_PROFILES];

  public getAllOrders(): InvestmentOrder[] {
    return [...this.orders];
  }

  public getOrdersByInvestor(investorId: string): InvestmentOrder[] {
    return this.orders.filter(o => o.investorId === investorId);
  }

  public getOrdersByPool(poolId: string): InvestmentOrder[] {
    return this.orders.filter(o => o.poolId === poolId);
  }

  public getSuitabilityProfile(investorId: string): InvestorSuitabilityProfile {
    let profile = this.suitabilityProfiles.find(p => p.investorId === investorId);
    if (!profile) {
      profile = {
        investorId,
        investorName: 'Investor User',
        investorType: 'HNWI Investor',
        riskProfile: 'Balanced',
        experienceLevel: 'Intermediate',
        investmentObjective: 'Income Generation',
        eligibilityPassed: true,
        evaluatedAt: new Date().toISOString()
      };
      this.suitabilityProfiles.push(profile);
    }
    return profile;
  }

  public createInvestmentOrder(
    poolId: string, 
    investorId: string, 
    investorName: string, 
    amount: number, 
    userId: string, 
    userRole: string
  ): InvestmentOrder {
    const pool = poolService.getPoolById(poolId);
    if (!pool) throw new Error('Pool not found');

    if (amount <= 0) {
      throw new Error('Validation Error: Investment amount must be greater than zero.');
    }

    if (pool.minimumInvestment && amount < pool.minimumInvestment) {
      throw new Error(`Validation Error: Minimum investment ticket for this pool is ${pool.minimumInvestment.toLocaleString()} ${pool.currency}.`);
    }

    if (pool.maximumInvestment && amount > pool.maximumInvestment) {
      throw new Error(`Validation Error: Maximum investment limit per investor for this pool is ${pool.maximumInvestment.toLocaleString()} ${pool.currency}.`);
    }

    const newId = generateNumericId('INV-ORD', 6);

    const newOrder: InvestmentOrder = {
      investmentId: newId,
      investorId,
      investorName,
      investorType: 'HNWI Investor',
      poolId,
      poolName: pool.poolName,
      organisationId: pool.organisationId,
      countryNodeId: pool.countryNodeId,
      amount,
      currency: pool.currency,
      contractType: pool.investmentStructure,
      indicativeReturnRate: pool.indicativeExpectedReturn,
      status: 'CONFIRMED',
      paymentReference: `PAY-DEMO-${Math.floor(10000 + Math.random() * 90000)}`,
      createdAt: new Date().toISOString()
    };

    this.orders.unshift(newOrder);

    auditLogger.logEvent({
      userId,
      organisationId: pool.organisationId,
      countryNodeId: pool.countryNodeId,
      role: userRole,
      action: 'investment_create',
      resourceType: 'investment',
      resourceId: newId,
      result: 'Success',
      metadata: { poolId, amount, currency: pool.currency }
    });

    notificationService.notify(
      'Investment Order Placed',
      `Investment order for ${amount.toLocaleString()} ${pool.currency} in "${pool.poolName}" placed successfully.`,
      'info',
      'investment',
      newId
    );

    return newOrder;
  }

  public settleInvestmentOrder(investmentId: string, userId: string, userRole: string): InvestmentOrder {
    const order = this.orders.find(o => o.investmentId === investmentId);
    if (!order) throw new Error('Investment order not found');

    order.status = 'SETTLED';
    order.settledAt = new Date().toISOString();

    const pool = poolService.getPoolById(order.poolId);
    if (pool) {
      pool.amountRaised += order.amount;
      pool.investorCount += 1;
      if (pool.amountRaised >= pool.targetAmount) {
        pool.status = 'FULLY_FUNDED';
        notificationService.notify(
          'Pool Target Capital Reached',
          `Pool "${pool.poolName}" is FULLY FUNDED ($${pool.amountRaised.toLocaleString()} ${pool.currency}).`,
          'success',
          'pool',
          pool.poolId
        );
      }
    }

    auditLogger.logEvent({
      userId,
      organisationId: order.organisationId,
      countryNodeId: order.countryNodeId,
      role: userRole,
      action: 'investment_settle',
      resourceType: 'investment',
      resourceId: investmentId,
      result: 'Success',
      metadata: { amount: order.amount }
    });

    notificationService.notify(
      'Investment Settled',
      `Investment order ${investmentId} settled successfully. Capital allocated to ${order.poolName}.`,
      'success',
      'investment',
      investmentId
    );

    return order;
  }
}

export const investmentService = new InvestmentService();
