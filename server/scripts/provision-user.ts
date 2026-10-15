import { PrismaClient, UserRole as PrismaUserRole } from '@prisma/client';
import { USER_ROLES } from '../src/policy/permissions';
import { newUserId, personalOrganisationId, userTypeForRoles } from '../src/users/user-identity';

/**
 * Opens an account for someone who already has a Keycloak user, following the registration
 * standard (Member ID USR-<country>-XXXXXXXX, fixed home country, user type from the role).
 * Until self sign-up exists (phase 3), the administrator runs this after creating the user in
 * Keycloak:
 *
 *   npx tsx scripts/provision-user.ts --keycloak-id <ID from Keycloak> --role "Asset Owner" \
 *     --country CN-MYS --org-name "Al Hidayah Group Sdn Bhd"
 *
 * Options:
 *   --keycloak-id  the user's ID in Keycloak (Users > the user > ID). Required.
 *   --role         one role, e.g. "Asset Owner", "Retail Investor", "Project Sponsor". Required.
 *   --country      country node, e.g. CN-MYS. Required; it never changes afterwards.
 *   --org-id       join an existing organisation (same country), e.g. ORG-FELDA-MYS; or
 *   --org-name     create a new organisation for an institution with this name.
 *                  An individual (Retail or HNWI Investor) gets a private organisation; neither is needed.
 * Name and email are copied from Keycloak at the user's first sign-in; --email and --name only fill them in until then.
 */
const args = Object.fromEntries(process.argv.slice(2).reduce<[string, string][]>((pairs, value, index, all) => (value.startsWith('--') ? [...pairs, [value.slice(2), all[index + 1] ?? '']] : pairs), []));

async function main() {
  const keycloakId = args['keycloak-id']?.trim();
  const role = args.role?.trim();
  const country = args.country?.trim();
  if (!keycloakId || !role || !country) throw new Error('Required: --keycloak-id, --role and --country. See the comment at the top of this script.');
  if (!/^[0-9a-f-]{36}$/i.test(keycloakId)) throw new Error('--keycloak-id must be the user ID from Keycloak (36 characters, e.g. 219e2fce-3ed3-46e5-9f88-a023eacc504f).');
  if (!(USER_ROLES as readonly string[]).includes(role)) throw new Error(`Unknown role "${role}". Use the name as shown in the app, e.g. "Asset Owner".`);
  if (role === 'Super Admin') throw new Error('The platform has one Super Admin, set up at installation. It cannot be given here.');

  const prisma = new PrismaClient();
  try {
    const node = await prisma.countryNode.findUnique({ where: { code: country } });
    if (!node || node.status !== 'ACTIVE') throw new Error(`Country node ${country} does not exist or is not active.`);
    const linked = await prisma.user.findFirst({ where: { idpSubjectId: keycloakId }, select: { id: true } });
    if (linked) throw new Error(`This Keycloak user already has an account: ${linked.id}. Nothing was changed.`);
    const email = (args.email?.trim() || `${keycloakId}@pending.invalid`).toLowerCase();
    if (args.email && (await prisma.user.findUnique({ where: { email } }))) throw new Error(`Another account already uses ${email}.`);

    const userId = newUserId(country);
    const userType = userTypeForRoles([role]);
    let organisationId: string;
    let organisationName: string;
    let createOrganisation = false;
    if (args['org-id']) {
      const org = await prisma.organisation.findUnique({ where: { id: args['org-id'].trim() } });
      if (!org) throw new Error(`Organisation ${args['org-id']} does not exist.`);
      if (org.countryNodeId !== country) throw new Error(`Organisation ${org.id} belongs to ${org.countryNodeId}, not ${country}.`);
      if (org.status !== 'ACTIVE') throw new Error(`Organisation ${org.id} is not active.`);
      organisationId = org.id;
      organisationName = org.name;
    } else if (userType === 'INDIVIDUAL') {
      organisationId = personalOrganisationId(userId);
      organisationName = `${args.name?.trim() || 'Individual'} (individual)`;
      createOrganisation = true;
    } else {
      if (!args['org-name']?.trim()) throw new Error(`"${role}" acts for an organisation: give --org-id of an existing one, or --org-name to create it.`);
      organisationId = userId.replace(/^USR-/, 'ORG-');
      organisationName = args['org-name'].trim();
      createOrganisation = true;
    }

    await prisma.$transaction(async (tx) => {
      if (createOrganisation) await tx.organisation.create({ data: { id: organisationId, name: organisationName, countryNodeId: country } });
      await tx.user.create({ data: { id: userId, idpProvider: 'keycloak', idpSubjectId: keycloakId, email, name: args.name?.trim() || email, isActive: true, userType, homeCountryNodeId: country } });
      await tx.userRoleAssignment.create({ data: { userId, role: role.replace(/ /g, '_') as PrismaUserRole, organisationId, countryNodeId: country, assignedBy: 'PROVISIONING' } });
    });

    console.log('Account opened:');
    console.log(`  Member ID     ${userId}`);
    console.log(`  Type          ${userType}`);
    console.log(`  Role          ${role}`);
    console.log(`  Organisation  ${organisationName} (${organisationId})${createOrganisation ? ' - new' : ''}`);
    console.log(`  Country       ${country} (fixed)`);
    console.log('\nThe user can now sign in. Their name and email are taken from Keycloak at that first sign-in.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
