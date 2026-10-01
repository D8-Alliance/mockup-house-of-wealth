import { Prisma, PrismaClient, UserRole } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { INITIAL_AUDIT_EVENTS } from '../../src/audit/mockAuditEvents';
import { INITIAL_COUNTRY_NODES } from '../../src/countryNodes/mockCountryNodes';
import { INITIAL_ORGANISATIONS } from '../../src/organisations/mockOrganisations';
import { INITIAL_APP_USERS } from '../../src/users/mockUsers';
import { DEMO_PERSONAS } from '../../src/auth/services/demoPersonas';
import { INITIAL_PROJECTS } from '../../src/data/mockPoolingWorkflowData';
import {
  INITIAL_FUNDING_REQUESTS,
  INITIAL_WEALTH_POOLS
} from '../../src/data/mockPoolingWorkflowDataPart3';

const prisma = new PrismaClient();

type OrganisationSeed = (typeof INITIAL_ORGANISATIONS)[number];
type UserSeed = (typeof INITIAL_APP_USERS)[number];
type ProjectSeed = (typeof INITIAL_PROJECTS)[number];
type PoolSeed = (typeof INITIAL_WEALTH_POOLS)[number];
type FundingSeed = (typeof INITIAL_FUNDING_REQUESTS)[number];

const DEMO_PROJECT = {
  projectId: 'PROJ-DEMO-MYS-AGRI-001',
  projectCode: 'DEMO-MYS-AGRI-2026',
  projectName: 'DEMO | Selangor Precision Agri-Tech & Grain Storage',
  description: 'Synthetic production-like project for end-to-end testing. This is a simulation only and is not a real investment opportunity.',
  organisationId: 'ORG-MYS-P2-CAP',
  countryNodeId: 'CN-MYS',
  sector: 'Agro-Industrial',
  totalProjectCost: 32000000,
  sponsorContribution: 7000000,
  fundingRequired: 25000000,
  proposedShariahContract: 'Musharakah',
  status: 'POOLING',
  projectSponsorId: 'USR-MYS-P2-001',
  createdAt: '2026-06-10T08:00:00Z',
  updatedAt: '2026-09-23T08:00:00Z',
};

const DEMO_DOCUMENTS = [
  {
    id: 'DEMO-DOC-001',
    fileName: 'DEMO-01-Project-Information-Memorandum.pdf',
    evidenceType: 'project_information',
    title: 'DEMO Project Information Memorandum',
    content: 'DEMO / SIMULATION ONLY. Not a real investment opportunity. Selangor Precision Agri-Tech & Grain Storage is a synthetic MYR 32 million grain handling, cold storage and precision farming project. The proposed funding requirement is MYR 25 million and sponsor contribution is MYR 7 million. All names, figures, registrations, contracts and financial information in this document are fabricated for software testing.',
  },
  {
    id: 'DEMO-DOC-002',
    fileName: 'DEMO-02-Corporate-Profile-and-UBO.pdf',
    evidenceType: 'corporate_kyb',
    title: 'DEMO Corporate Profile, Directors and UBO Declaration',
    content: 'DEMO / SIMULATION ONLY. Synthetic corporate profile for testing. The fictional sponsor is Selangor Precision Agri Storage Sdn. Bhd. Fictional directors, beneficial owners, registration numbers and identity references are placeholders and have no legal effect. KYB status is DEMO_VERIFIED only within the application fixture and has not been checked against any registry.',
  },
  {
    id: 'DEMO-DOC-003',
    fileName: 'DEMO-03-Land-and-Asset-Schedule.pdf',
    evidenceType: 'asset_backing',
    title: 'DEMO Land, Machinery and Asset Schedule',
    content: 'DEMO / SIMULATION ONLY. Synthetic asset schedule covering a fictional 18-acre industrial site, grain silos, dryers, cold rooms and handling machinery. The stated asset values are illustrative only. No title, valuation, charge search or ownership claim in this document is genuine or enforceable.',
  },
  {
    id: 'DEMO-DOC-004',
    fileName: 'DEMO-04-Feasibility-and-Market-Study.pdf',
    evidenceType: 'feasibility',
    title: 'DEMO Feasibility and Market Study',
    content: 'DEMO / SIMULATION ONLY. Synthetic market study for testing. Assumed customers, storage utilisation, commodity throughput, pricing, logistics costs and offtake assumptions are illustrative. No customer, supplier, offtake agreement or market statistic has been independently verified.',
  },
  {
    id: 'DEMO-DOC-005',
    fileName: 'DEMO-05-Five-Year-Financial-Model.pdf',
    evidenceType: 'financial_model',
    title: 'DEMO Five-Year Financial Model',
    content: 'DEMO / SIMULATION ONLY. Synthetic financial model. Illustrative revenue is MYR 14.2 million in Year 1 increasing to MYR 28.6 million in Year 5. Illustrative EBITDA margin ranges from 24% to 31%. These figures are assumptions for testing and are not forecasts, audited results or investment advice.',
  },
  {
    id: 'DEMO-DOC-006',
    fileName: 'DEMO-06-Cashflow-and-Sources-of-Funds.pdf',
    evidenceType: 'cashflow',
    title: 'DEMO Cashflow Forecast and Sources of Funds',
    content: 'DEMO / SIMULATION ONLY. Synthetic cashflow evidence. Construction drawdown is assumed across 18 months. The fictional sponsor contribution is MYR 7 million and requested project funding is MYR 25 million. Bank statements, source-of-funds evidence and independent confirmations do not exist for this simulation.',
  },
  {
    id: 'DEMO-DOC-007',
    fileName: 'DEMO-07-Shariah-Structuring-Memorandum.pdf',
    evidenceType: 'shariah_memo',
    title: 'DEMO Shariah Structuring Memorandum',
    content: 'DEMO / SIMULATION ONLY. Synthetic preliminary memorandum. Musharakah is used as the proposed structure for testing because capital participation, ownership, profit allocation and loss allocation can be modelled. This is not a fatwa, Shariah approval or legal opinion.',
  },
  {
    id: 'DEMO-DOC-008',
    fileName: 'DEMO-08-Risk-and-Due-Diligence-Register.pdf',
    evidenceType: 'due_diligence',
    title: 'DEMO Risk Register and Due Diligence Report',
    content: 'DEMO / SIMULATION ONLY. Synthetic risk register. Key risks include construction delay, commodity price volatility, utilisation shortfall, weather exposure, counterparty default and regulatory approval. All checks are marked DEMO_VERIFIED for testing only and require real-world replacement before any decision.',
  },
  {
    id: 'DEMO-DOC-009',
    fileName: 'DEMO-09-Permits-and-Approvals-Matrix.pdf',
    evidenceType: 'permits',
    title: 'DEMO Permits, Approvals and Compliance Matrix',
    content: 'DEMO / SIMULATION ONLY. Synthetic permits matrix covering planning, environmental, fire safety, food handling and occupational safety approvals. No authority has issued or verified these documents. Statuses are placeholders for workflow testing.',
  },
] as const;

const roleAliases: Record<string, UserRole> = {
  'Audit Officer': UserRole.Auditor,
  'Shariah Advisor': UserRole.Shariah_Advisor
};

function toRole(role: string): UserRole | undefined {
  const alias = roleAliases[role];
  if (alias) return alias;

  const enumValue = role.replace(/[^A-Za-z0-9]+/g, '_') as UserRole;
  return Object.values(UserRole).includes(enumValue) ? enumValue : undefined;
}

function date(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

async function ensureOrganisations(tx: Prisma.TransactionClient): Promise<void> {
  const organisations = new Map<string, OrganisationSeed>();

  for (const organisation of INITIAL_ORGANISATIONS) {
    organisations.set(organisation.organisationId, organisation);
  }

  const references = [
    ...INITIAL_APP_USERS.map((user) => ({ id: user.organisationId, countryNodeId: user.countryNodeId })),
    ...INITIAL_PROJECTS.map((project) => ({ id: project.organisationId, countryNodeId: project.countryNodeId })),
    ...INITIAL_WEALTH_POOLS.map((pool) => ({ id: pool.organisationId, countryNodeId: pool.countryNodeId })),
    ...INITIAL_FUNDING_REQUESTS.map((request) => ({ id: request.organisationId, countryNodeId: request.countryNodeId })),
    ...INITIAL_AUDIT_EVENTS.map((event) => ({ id: event.organisationId, countryNodeId: event.countryNodeId }))
  ];

  for (const reference of references) {
    if (!organisations.has(reference.id)) {
      organisations.set(reference.id, {
        organisationId: reference.id,
        legalName: reference.id,
        displayName: reference.id,
        registrationNumber: `MOCK-${reference.id}`,
        organisationType: 'Other',
        countryNodeId: reference.countryNodeId,
        address: 'Imported from frontend mock data',
        contactEmail: `admin+${reference.id.toLowerCase()}@example.invalid`,
        contactPhone: '',
        website: '',
        logoUrl: '',
        industry: 'Imported mock data',
        description: 'Placeholder created for a frontend mock-data reference.',
        status: 'ACTIVE',
        verificationStatus: 'PENDING',
        activeUsersCount: 0,
        activeProjectsCount: 0,
        activeAssetsCount: 0,
        activePoolsCount: 0,
        documents: [],
        reviewComments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'seed-mock-data',
        updatedBy: 'seed-mock-data'
      } as OrganisationSeed);
    }
  }

  for (const organisation of organisations.values()) {
    await tx.organisation.upsert({
      where: { id: organisation.organisationId },
      update: {
        name: organisation.displayName || organisation.legalName,
        countryNodeId: organisation.countryNodeId,
        status: organisation.status
      },
      create: {
        id: organisation.organisationId,
        name: organisation.displayName || organisation.legalName,
        countryNodeId: organisation.countryNodeId,
        status: organisation.status,
        createdAt: date(organisation.createdAt),
        updatedAt: date(organisation.updatedAt)
      }
    });
  }
}

async function seed(): Promise<void> {
  let roleAssignmentCount = 0;
  let auditEventCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const country of INITIAL_COUNTRY_NODES) {
      await tx.countryNode.upsert({
        where: { code: country.countryNodeId },
        update: {
          name: country.countryName,
          currency: country.currency,
          timezone: country.timezone,
          regulatoryProfile: country.regulatoryProfile,
          status: country.status,
          verificationStatus: country.verificationStatus,
          activeOrganisationsCount: country.activeOrganisationsCount,
          activeUsersCount: country.activeUsersCount,
          activeProjectsCount: country.activeProjectsCount,
          activePoolsCount: country.activePoolsCount,
          flagUrl: country.flagUrl
        },
        create: {
          code: country.countryNodeId,
          name: country.countryName,
          currency: country.currency,
          timezone: country.timezone,
          regulatoryProfile: country.regulatoryProfile,
          status: country.status,
          verificationStatus: country.verificationStatus,
          activeOrganisationsCount: country.activeOrganisationsCount,
          activeUsersCount: country.activeUsersCount,
          activeProjectsCount: country.activeProjectsCount,
          activePoolsCount: country.activePoolsCount,
          flagUrl: country.flagUrl,
          createdAt: date(country.createdAt),
          updatedAt: date(country.updatedAt)
        }
      });
    }

    await ensureOrganisations(tx);

    // Canonical mock-mode super admin: lets a bare mock token
    // (header { "mock": "mock-user" }) resolve to a provisioned, known tenant.
    // Role resolution stays fully DB-authoritative regardless.
    await tx.organisation.upsert({
      where: { id: 'ORG-PUBLIC' },
      update: { name: 'Wealth Pooling Public (Mock)', countryNodeId: 'CN-MYS', status: 'ACTIVE' },
      create: {
        id: 'ORG-PUBLIC',
        name: 'Wealth Pooling Public (Mock)',
        countryNodeId: 'CN-MYS',
        status: 'ACTIVE',
      },
    });
    await tx.user.upsert({
      where: { id: 'USR-mock-user' },
      update: {
        idpProvider: 'mock',
        idpSubjectId: 'USR-mock-user',
        email: 'admin.demo@wealthpooling.my',
        name: 'Dr. Farid Hakim',
        isActive: true,
      },
      create: {
        id: 'USR-mock-user',
        idpProvider: 'mock',
        idpSubjectId: 'USR-mock-user',
        email: 'admin.demo@wealthpooling.my',
        name: 'Dr. Farid Hakim',
        isActive: true,
      },
    });
    await tx.userRoleAssignment.upsert({
      where: {
        userId_role_organisationId_countryNodeId: {
          userId: 'USR-mock-user',
          role: UserRole.Super_Admin,
          organisationId: 'ORG-PUBLIC',
          countryNodeId: 'CN-MYS',
        },
      },
      update: { isActive: true, assignedBy: 'USR-mock-user' },
      create: {
        userId: 'USR-mock-user',
        role: UserRole.Super_Admin,
        organisationId: 'ORG-PUBLIC',
        countryNodeId: 'CN-MYS',
        assignedBy: 'USR-mock-user',
        isActive: true,
      },
    });

    // Free all legacy email values first. This avoids collisions when an old
    // local fixture assigned an email to a different user id.
    for (const user of INITIAL_APP_USERS) {
      const existingUser = await tx.user.findUnique({ where: { id: user.userId }, select: { id: true, email: true } });
      if (existingUser && existingUser.email !== user.email) {
        await tx.user.update({ where: { id: user.userId }, data: { email: `${user.userId}.${randomUUID()}@invalid` } });
      }
      const emailOwner = await tx.user.findUnique({ where: { email: user.email }, select: { id: true } });
      if (emailOwner) {
        await tx.user.updateMany({ where: { email: user.email }, data: { email: `${emailOwner.id}.${randomUUID()}@invalid` } });
      }
    }

    for (const user of INITIAL_APP_USERS) {
      const existingUser = await tx.user.findUnique({ where: { id: user.userId }, select: { id: true } });
      const userData = {
        idpProvider: 'mock',
        idpSubjectId: user.userId,
        email: user.email,
        name: user.fullName,
        isActive: user.status === 'ACTIVE',
        profile: user as unknown as Prisma.InputJsonValue,
        updatedAt: date(user.updatedAt),
      };
      if (existingUser) {
        // Keep the seed deterministic when reconciling legacy local users.
        if (await tx.user.findUnique({ where: { email: user.email }, select: { id: true } })) {
          await tx.user.updateMany({ where: { email: user.email }, data: { email: `${user.userId}.${randomUUID()}@invalid` } });
        }
        await tx.user.update({ where: { id: user.userId }, data: userData });
      } else {
        await tx.user.create({
          data: { ...userData, id: user.userId, createdAt: date(user.createdAt) },
        });
      }
    }

    const fallbackAssigner = INITIAL_APP_USERS[0]?.userId;
    if (!fallbackAssigner) throw new Error('No mock users are available for role assignments.');

    for (const user of INITIAL_APP_USERS) {
      for (const rawRole of user.assignedRoles) {
        const role = toRole(rawRole);
        if (!role) {
          console.warn(`Skipping unsupported role '${rawRole}' for ${user.userId}.`);
          continue;
        }

        await tx.userRoleAssignment.upsert({
          where: {
            userId_role_organisationId_countryNodeId: {
              userId: user.userId,
              role,
              organisationId: user.organisationId,
              countryNodeId: user.countryNodeId
            }
          },
          update: { isActive: true, assignedBy: fallbackAssigner },
          create: {
            userId: user.userId,
            role,
            organisationId: user.organisationId,
            countryNodeId: user.countryNodeId,
            assignedBy: fallbackAssigner,
            assignedAt: date(user.createdAt),
            isActive: true
          }
        });
        roleAssignmentCount += 1;
      }
    }

    // DEMO-mode sign-in issues a session for one of these personas, and the
    // mock identity path resolves that persona against this table. Without a
    // row here the backend rejects the caller as unprovisioned.
    const personaAssignedAt = new Date('2026-01-01T00:00:00.000Z');
    for (const [personaKey, persona] of Object.entries(DEMO_PERSONAS)) {
      // The public Guest has no backend identity by design.
      if (!persona.userId.startsWith('USR-')) continue;

      const [organisation, countryNode, emailOwner] = await Promise.all([
        tx.organisation.findUnique({ where: { id: persona.organisationId } }),
        tx.countryNode.findUnique({ where: { code: persona.countryNodeId } }),
        tx.user.findUnique({ where: { email: persona.email } })
      ]);

      if (!organisation || !countryNode) {
        console.warn(`Skipping demo persona '${personaKey}': ${persona.organisationId} / ${persona.countryNodeId} is not seeded.`);
        continue;
      }
      if (emailOwner && emailOwner.id !== persona.userId) {
        console.warn(`Skipping demo persona '${personaKey}': ${persona.email} already belongs to ${emailOwner.id}.`);
        continue;
      }

      const personaUser = await tx.user.findFirst({ where: { OR: [{ id: persona.userId }, { email: persona.email }, { idpSubjectId: persona.userId }] }, select: { id: true } });
      if (personaUser) {
        await tx.user.update({ where: { id: personaUser.id }, data: { isActive: persona.status === 'ACTIVE' } });
      } else {
        await tx.user.create({
          data: {
            id: persona.userId,
            idpProvider: 'mock',
            idpSubjectId: persona.userId,
            email: persona.email,
            name: persona.name,
            isActive: persona.status === 'ACTIVE'
          }
        });
      }

      // The API resolves the effective role as the earliest active assignment,
      // so stagger assignedAt to make the persona's activeRole win that sort.
      const orderedRoles = [
        persona.activeRole,
        ...persona.assignedRoles.filter((assigned) => assigned !== persona.activeRole)
      ];

      for (const [index, rawRole] of orderedRoles.entries()) {
        const role = toRole(rawRole);
        if (!role) {
          console.warn(`Skipping unsupported role '${rawRole}' for demo persona '${personaKey}'.`);
          continue;
        }

        const assignedAt = new Date(personaAssignedAt.getTime() + index * 1000);
        await tx.userRoleAssignment.upsert({
          where: {
            userId_role_organisationId_countryNodeId: {
              userId: persona.userId,
              role,
              organisationId: persona.organisationId,
              countryNodeId: persona.countryNodeId
            }
          },
          update: { isActive: true, assignedBy: fallbackAssigner, assignedAt },
          create: {
            userId: persona.userId,
            role,
            organisationId: persona.organisationId,
            countryNodeId: persona.countryNodeId,
            assignedBy: fallbackAssigner,
            assignedAt,
            isActive: true
          }
        });
        roleAssignmentCount += 1;
      }
    }

    for (const project of INITIAL_PROJECTS as ProjectSeed[]) {
      await tx.project.upsert({
        where: { projectId: project.projectId },
        update: {
          projectCode: project.projectCode,
          projectName: project.projectName,
          description: project.description,
          organisationId: project.organisationId,
          countryNodeId: project.countryNodeId,
          sector: project.sector,
          totalProjectCost: project.totalProjectCost,
          sponsorContribution: project.sponsorContribution,
          fundingRequired: project.fundingRequired,
          proposedShariahContract: project.proposedShariahContract,
          status: project.status,
          projectSponsorId: project.projectSponsorId,
          updatedAt: date(project.updatedAt)
        },
        create: {
          projectId: project.projectId,
          projectCode: project.projectCode,
          projectName: project.projectName,
          description: project.description,
          organisationId: project.organisationId,
          countryNodeId: project.countryNodeId,
          sector: project.sector,
          totalProjectCost: project.totalProjectCost,
          sponsorContribution: project.sponsorContribution,
          fundingRequired: project.fundingRequired,
          proposedShariahContract: project.proposedShariahContract,
          status: project.status,
          projectSponsorId: project.projectSponsorId,
          createdAt: date(project.createdAt),
          updatedAt: date(project.updatedAt)
        }
      });
    }

    // Remove the superseded incomplete mock project so the complete demo fixture
    // is the only Selangor precision-agri project presented for testing.
    await tx.project.deleteMany({ where: { projectId: 'PROJ-MYS-P2-004' } });

    await tx.project.upsert({
      where: { projectId: DEMO_PROJECT.projectId },
      update: DEMO_PROJECT,
      create: DEMO_PROJECT,
    });

    for (const demoDocument of DEMO_DOCUMENTS) {
      const contentBuffer = Buffer.from(demoDocument.content, 'utf8');
      await tx.projectDocument.upsert({
        where: { id: demoDocument.id },
        update: {
          projectId: DEMO_PROJECT.projectId,
          organisationId: DEMO_PROJECT.organisationId,
          countryNodeId: DEMO_PROJECT.countryNodeId,
          uploadedBy: DEMO_PROJECT.projectSponsorId,
          fileName: demoDocument.fileName,
          mimeType: 'application/pdf',
          fileSize: contentBuffer.byteLength,
          fileContent: contentBuffer,
          extractedText: demoDocument.content,
          extractionStatus: 'EXTRACTED',
          extractionError: null,
        },
        create: {
          id: demoDocument.id,
          projectId: DEMO_PROJECT.projectId,
          organisationId: DEMO_PROJECT.organisationId,
          countryNodeId: DEMO_PROJECT.countryNodeId,
          uploadedBy: DEMO_PROJECT.projectSponsorId,
          fileName: demoDocument.fileName,
          mimeType: 'application/pdf',
          fileSize: contentBuffer.byteLength,
          fileContent: contentBuffer,
          extractedText: demoDocument.content,
          extractionStatus: 'EXTRACTED',
        },
      });

      const contentHash = createHash('sha256').update(demoDocument.content).digest('hex');
      const chunks = [{ chunkIndex: 0, content: demoDocument.content }];
      await tx.ragDocument.upsert({
        where: { id: `RAG-${demoDocument.id}` },
        update: {
          scope: 'PROJECT',
          scopeKey: DEMO_PROJECT.projectId,
          projectId: DEMO_PROJECT.projectId,
          organisationId: DEMO_PROJECT.organisationId,
          countryNodeId: DEMO_PROJECT.countryNodeId,
          uploadedBy: DEMO_PROJECT.projectSponsorId,
          title: demoDocument.title,
          sourceType: 'DEMO_PROJECT_EVIDENCE',
          contentHash,
          status: 'ACTIVE',
          metadata: { evidenceType: demoDocument.evidenceType, verificationStatus: 'DEMO_VERIFIED', simulationOnly: true },
          chunks: { deleteMany: {}, create: chunks },
        },
        create: {
          id: `RAG-${demoDocument.id}`,
          // PROJECT scope keys on the project id (see ragScopeKey in src/ai/rag-scope.ts).
          scope: 'PROJECT',
          scopeKey: DEMO_PROJECT.projectId,
          projectId: DEMO_PROJECT.projectId,
          organisationId: DEMO_PROJECT.organisationId,
          countryNodeId: DEMO_PROJECT.countryNodeId,
          uploadedBy: DEMO_PROJECT.projectSponsorId,
          title: demoDocument.title,
          sourceType: 'DEMO_PROJECT_EVIDENCE',
          contentHash,
          status: 'ACTIVE',
          metadata: { evidenceType: demoDocument.evidenceType, verificationStatus: 'DEMO_VERIFIED', simulationOnly: true },
          chunks: { create: chunks },
        },
      });
    }

    for (const pool of INITIAL_WEALTH_POOLS as PoolSeed[]) {
      await tx.wealthPool.upsert({
        where: { poolId: pool.poolId },
        update: {
          poolName: pool.poolName,
          currency: pool.currency,
          investmentStructure: pool.investmentStructure,
          indicativeExpectedReturn: pool.indicativeExpectedReturn,
          status: pool.status,
          projectId: pool.projectId,
          organisationId: pool.organisationId,
          countryNodeId: pool.countryNodeId,
          updatedAt: date(pool.updatedAt)
        },
        create: {
          poolId: pool.poolId,
          poolName: pool.poolName,
          currency: pool.currency,
          investmentStructure: pool.investmentStructure,
          indicativeExpectedReturn: pool.indicativeExpectedReturn,
          status: pool.status,
          projectId: pool.projectId,
          organisationId: pool.organisationId,
          countryNodeId: pool.countryNodeId,
          createdAt: date(pool.createdAt),
          updatedAt: date(pool.updatedAt)
        }
      });
    }

    for (const request of INITIAL_FUNDING_REQUESTS as FundingSeed[]) {
      await tx.fundingRequest.upsert({
        where: { fundingRequestId: request.id },
        update: {
          projectId: request.projectId,
          poolId: request.poolId,
          organisationId: request.organisationId,
          countryNodeId: request.countryNodeId,
          requestedAmount: request.requestedAmount,
          currency: 'USD',
          purpose: request.purpose,
          status: request.status,
          requestedBy: request.requestedBy,
          requestedAt: date(request.requestedAt),
          approvedBy: request.approvedBy,
          approvedAt: request.approvedAt ? date(request.approvedAt) : null,
          disbursedAt: request.disbursedAt ? date(request.disbursedAt) : null,
          updatedAt: date(request.requestedAt)
        },
        create: {
          fundingRequestId: request.id,
          projectId: request.projectId,
          poolId: request.poolId,
          organisationId: request.organisationId,
          countryNodeId: request.countryNodeId,
          requestedAmount: request.requestedAmount,
          currency: 'USD',
          purpose: request.purpose,
          status: request.status,
          requestedBy: request.requestedBy,
          requestedAt: date(request.requestedAt),
          approvedBy: request.approvedBy,
          approvedAt: request.approvedAt ? date(request.approvedAt) : null,
          disbursedAt: request.disbursedAt ? date(request.disbursedAt) : null,
          createdAt: date(request.requestedAt),
          updatedAt: date(request.requestedAt)
        }
      });
    }

    for (const event of INITIAL_AUDIT_EVENTS) {
      const existingEvent = await tx.auditEvent.findUnique({
        where: { id: event.eventId },
        select: { id: true }
      });

      if (existingEvent) continue;

      await tx.auditEvent.create({
        data: {
          id: event.eventId,
          userId: event.userId,
          action: event.action,
          resourceType: event.resourceType,
          resourceId: event.resourceId,
          organisationId: event.organisationId,
          countryNodeId: event.countryNodeId,
          result: event.result,
          metadata: { ...event.metadata, userName: event.userName, role: event.role },
          createdAt: date(event.timestamp)
        }
      });
      auditEventCount += 1;
    }
  });

  console.log(`Imported ${INITIAL_COUNTRY_NODES.length} country nodes.`);
  console.log(`Imported ${INITIAL_ORGANISATIONS.length} declared organisations plus referenced placeholders.`);
  console.log(`Imported ${INITIAL_APP_USERS.length} users and ${roleAssignmentCount} role assignments.`);
  console.log(`Imported ${INITIAL_PROJECTS.length + 1} projects (${DEMO_DOCUMENTS.length} synthetic demo documents), ${INITIAL_WEALTH_POOLS.length} pools, ${INITIAL_FUNDING_REQUESTS.length} funding requests, and ${auditEventCount} new audit events.`);
}

seed()
  .catch((error) => {
    console.error('Mock data import failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
