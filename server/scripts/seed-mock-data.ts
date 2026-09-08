import { Prisma, PrismaClient, UserRole } from '@prisma/client';
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
      update: { name: 'House of Wealth Public (Mock)', countryNodeId: 'CN-MYS', status: 'ACTIVE' },
      create: {
        id: 'ORG-PUBLIC',
        name: 'House of Wealth Public (Mock)',
        countryNodeId: 'CN-MYS',
        status: 'ACTIVE',
      },
    });
    await tx.user.upsert({
      where: { id: 'USR-mock-user' },
      update: {
        idpProvider: 'mock',
        idpSubjectId: 'USR-mock-user',
        email: 'mock@houseofwealth.local',
        name: 'Mock Super Admin',
        isActive: true,
      },
      create: {
        id: 'USR-mock-user',
        idpProvider: 'mock',
        idpSubjectId: 'USR-mock-user',
        email: 'mock@houseofwealth.local',
        name: 'Mock Super Admin',
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

    for (const user of INITIAL_APP_USERS) {
      await tx.user.upsert({
        where: { id: user.userId },
        update: {
          idpProvider: 'mock',
          idpSubjectId: user.userId,
          email: user.email,
          name: user.fullName,
          isActive: user.status === 'ACTIVE',
          profile: user as unknown as Prisma.InputJsonValue,
          updatedAt: date(user.updatedAt)
        },
        create: {
          id: user.userId,
          idpProvider: 'mock',
          idpSubjectId: user.userId,
          email: user.email,
          name: user.fullName,
          isActive: user.status === 'ACTIVE',
          profile: user as unknown as Prisma.InputJsonValue,
          createdAt: date(user.createdAt),
          updatedAt: date(user.updatedAt)
        }
      });
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

      await tx.user.upsert({
        where: { id: persona.userId },
        // Personas that double as INITIAL_APP_USERS keep their seeded profile.
        update: { isActive: persona.status === 'ACTIVE' },
        create: {
          id: persona.userId,
          idpProvider: 'mock',
          idpSubjectId: persona.userId,
          email: persona.email,
          name: persona.name,
          isActive: persona.status === 'ACTIVE'
        }
      });

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
  console.log(`Imported ${INITIAL_PROJECTS.length} projects, ${INITIAL_WEALTH_POOLS.length} pools, ${INITIAL_FUNDING_REQUESTS.length} funding requests, and ${auditEventCount} new audit events.`);
}

seed()
  .catch((error) => {
    console.error('Mock data import failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
