import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';

/** Approved clauses and Shariah rules are a country-wide library: drafters, legal and Shariah reviewers sit in different organisations. */
const libraryScope = (actor: AuthenticatedUser) => (actor.role === 'Super Admin' ? {} : { countryNodeId: actor.countryNodeId });

export interface ContractRetrievalInput {
  contractType: string;
  industry?: string;
  jurisdiction?: string;
  purpose?: string;
}

@Injectable()
export class ContractClauseRetriever {
  constructor(private readonly prisma: PrismaService) {}

  async retrieveClauses(actor: AuthenticatedUser, input: ContractRetrievalInput) {
    const scope = libraryScope(actor);
    const clauses = await this.prisma.contractClause.findMany({
      where: {
        ...scope,
        contractType: input.contractType,
        approvalStatus: 'APPROVED',
        ...(input.industry ? { OR: [{ industry: input.industry }, { industry: null }] } : {}),
        ...(input.jurisdiction ? { jurisdiction: { in: [input.jurisdiction, 'International'] } } : {}),
      },
      include: { template: { select: { templateName: true, industry: true, jurisdiction: true, version: true } } },
      orderBy: [{ riskLevel: 'desc' }, { clauseCategory: 'asc' }],
      take: 25,
    });
    const chunks = await this.prisma.ragChunk.findMany({
      where: {
        document: {
          ...scope,
          status: 'ACTIVE',
          approvalStatus: 'APPROVED',
          contractType: input.contractType,
          ...(input.industry ? { OR: [{ industry: input.industry }, { industry: null }] } : {}),
           ...(input.jurisdiction ? { jurisdiction: { in: [input.jurisdiction, 'International'] } } : {}),
        },
        ...(input.purpose ? { content: { contains: input.purpose, mode: 'insensitive' } } : {}),
      },
      include: { document: { select: { title: true, sourceType: true, authority: true, jurisdiction: true, contractType: true, industry: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return { clauses, sources: chunks, contractType: input.contractType, industry: input.industry, jurisdiction: input.jurisdiction };
  }

  async retrieveShariahRules(actor: AuthenticatedUser, input: ContractRetrievalInput) {
    return this.prisma.shariahRule.findMany({ where: { ...libraryScope(actor), contractType: input.contractType, approvalStatus: 'APPROVED', ...(input.jurisdiction ? { OR: [{ jurisdiction: input.jurisdiction }, { jurisdiction: null }, { jurisdiction: 'International' }] } : {}) }, orderBy: [{ severity: 'desc' }, { ruleName: 'asc' }], take: 50 });
  }

  async validateShariahRules(actor: AuthenticatedUser, input: ContractRetrievalInput, context: Record<string, unknown> = {}) {
    const rules = await this.retrieveShariahRules(actor, input);
    if (!rules.length) return { status: 'REQUIRES_REVIEW', rules: [], reasons: ['No approved Shariah rules are configured for this contract type.'] };
    const results = rules.map((rule) => {
      const logic = rule.validationLogic.toLowerCase();
      const requiredKey = logic.match(/(?:field|context)[:=\s]+([a-zA-Z0-9_]+)/)?.[1];
      const present = requiredKey ? context[requiredKey] !== undefined && context[requiredKey] !== null && context[requiredKey] !== '' : false;
      return { ruleId: rule.id, ruleName: rule.ruleName, severity: rule.severity, status: present ? 'PASS' : 'WARNING', description: rule.description, validationLogic: rule.validationLogic };
    });
    const status = results.some((item) => item.status === 'WARNING' && item.severity === 'HIGH') ? 'REQUIRES_REVIEW' : results.some((item) => item.status === 'WARNING') ? 'WARNING' : 'PASS';
    return { status, rules: results, reasons: results.filter((item) => item.status !== 'PASS').map((item) => item.description) };
  }
}
