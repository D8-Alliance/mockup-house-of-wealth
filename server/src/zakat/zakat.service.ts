import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { CalculateZakatDto } from './zakat.dto';
import { ToyyibPayService } from '../membership/toyyibpay.service';
import { FinancialLedgerService } from '../financial/financial-ledger.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const DEFAULT_NISAB_THRESHOLD = 6120;
const ZAKAT_RATE = 0.025;

@Injectable()
export class ZakatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly toyyibPay: ToyyibPayService,
    private readonly ledger: FinancialLedgerService,
  ) {}

  async calculate(actor: AuthenticatedUser, input: CalculateZakatDto) {
    const currency = input.currency ?? 'USD';
    const nisabThreshold = input.nisabThreshold ?? DEFAULT_NISAB_THRESHOLD;
    const netWealth = Math.max(0, input.investedCapital + input.liquidCash - input.debtsOwed);
    const zakatDue = netWealth >= nisabThreshold ? Math.round(netWealth * ZAKAT_RATE * 100) / 100 : 0;

    const calculation = await this.prisma.zakatCalculation.create({
      data: {
        userId: actor.userId,
        currency,
        investedCapital: new Prisma.Decimal(input.investedCapital),
        liquidCash: new Prisma.Decimal(input.liquidCash),
        debtsOwed: new Prisma.Decimal(input.debtsOwed),
        nisabThreshold: new Prisma.Decimal(nisabThreshold),
        zakatRate: new Prisma.Decimal(ZAKAT_RATE),
        netWealth: new Prisma.Decimal(netWealth),
        zakatDue: new Prisma.Decimal(zakatDue),
      },
    });

    await this.audit.recordActor(actor, {
      action: 'zakat.calculate',
      resourceType: 'ZakatCalculation',
      resourceId: calculation.id,
      countryNodeId: actor.countryNodeId,
      organisationId: actor.organisationId,
      metadata: { currency, netWealth, zakatDue },
    });

    return this.toResponse(calculation);
  }

  async latest(actor: AuthenticatedUser) {
    const calculation = await this.prisma.zakatCalculation.findFirst({
      where: { userId: actor.userId },
      orderBy: { createdAt: 'desc' },
    });
    return calculation ? this.toResponse(calculation) : null;
  }

  async createPaymentBill(actor: AuthenticatedUser, calculationId: string) {
    const calculation = await this.prisma.zakatCalculation.findFirst({ where: { id: calculationId, userId: actor.userId } });
    if (!calculation) throw new NotFoundException('Zakat calculation not found.');
    const amount = Number(calculation.zakatDue);
    if (amount <= 0) throw new BadRequestException('There is no zakat amount due for this calculation.');
    if (calculation.currency !== 'MYR') throw new BadRequestException('ToyyibPay zakat payment requires a MYR calculation.');
    const gateway = await this.ledger.ensureAccount(actor, { accountCode: 'SYSTEM-TOYYIBPAY-CASH-MYR', accountType: 'ASSET', ownerType: 'SYSTEM', ownerId: 'TOYYIBPAY', organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, currency: 'MYR' });
    const zakatAccount = await this.ledger.ensureAccount(actor, { accountCode: `ORG-${actor.organisationId}-ZAKAT-PAYABLE-MYR`, accountType: 'LIABILITY', ownerType: 'ORGANISATION', ownerId: actor.organisationId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, currency: 'MYR' });
    return this.toyyibPay.createBill(actor, { productType: 'ZAKAT_PAYMENT', productId: calculation.id, description: `Zakat payment ${calculation.id}`, amountMYR: amount, metadata: { calculationId: calculation.id, amount, currency: 'MYR', gatewayAccountId: gateway.id, zakatAccountId: zakatAccount.id } });
  }

  private toResponse(calculation: any) {
    return {
      id: calculation.id,
      userId: calculation.userId,
      currency: calculation.currency,
      investedCapital: Number(calculation.investedCapital),
      liquidCash: Number(calculation.liquidCash),
      debtsOwed: Number(calculation.debtsOwed),
      nisabThreshold: Number(calculation.nisabThreshold),
      zakatRate: Number(calculation.zakatRate),
      netWealth: Number(calculation.netWealth),
      zakatDue: Number(calculation.zakatDue),
      createdAt: calculation.createdAt,
    };
  }
}
