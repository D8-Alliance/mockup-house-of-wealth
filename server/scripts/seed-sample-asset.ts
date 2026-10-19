import { Prisma, PrismaClient } from '@prisma/client';
import { AssetDetails, assetIdentityKey } from '../src/assets/asset-checks';
import { newCountryScopedId } from '../src/users/user-identity';

/**
 * Adds a sample asset, as a draft, for an Asset Owner, so the asset screens can be tried on a new
 * database. Its name starts with "[SAMPLE]". The owner then uploads documents and submits it in the app.
 *
 *   npx tsx scripts/seed-sample-asset.ts                      (land, for the only Asset Owner)
 *   npx tsx scripts/seed-sample-asset.ts --type VEHICLE --owner USR-MYS-9WQ1BJTK
 *   npx tsx scripts/seed-sample-asset.ts --remove             (deletes the owner's [SAMPLE] drafts)
 *
 * Options:
 *   --type   LAND (default), VEHICLE, MACHINERY or BUILDING.
 *   --owner  the Asset Owner's Member ID; needed only when there is more than one Asset Owner.
 *   --org    the organisation, when the Asset Owner acts for more than one.
 */
const args = Object.fromEntries(process.argv.slice(2).reduce<[string, string][]>((pairs, value, index, all) => (value.startsWith('--') ? [...pairs, [value.slice(2), all[index + 1]?.startsWith('--') ? '' : all[index + 1] ?? '']] : pairs), []));
const PREFIX = '[SAMPLE]';

const SAMPLES: Record<string, { name: string; location: string; titleReference: string; estimatedValue: number; intendedUse: string; latitude: number; longitude: number; details: AssetDetails }> = {
  LAND: {
    name: `${PREFIX} Kebun sawit Lot 4321, Mukim Semenyih`, location: 'Jalan Sungai Lalang, 43500 Semenyih, Selangor', titleReference: 'GRN 98765, Lot 4321', estimatedValue: 450000, intendedUse: 'IJARAH', latitude: 2.9516, longitude: 101.8433,
    details: { titleType: 'GRN', titleNumber: '98765', lotNumber: '4321', mukim: 'Semenyih', district: 'Hulu Langat', state: 'Selangor', areaValue: 2.5, areaUnit: 'HECTARE', landUseCategory: 'AGRICULTURE', tenure: 'FREEHOLD', ownershipShare: '1/1', malayReserve: false },
  },
  VEHICLE: {
    name: `${PREFIX} Prime mover Volvo FH WTA 5678`, location: 'Depot Pelabuhan Klang, Selangor', titleReference: 'WTA 5678', estimatedValue: 320000, intendedUse: 'IJARAH', latitude: 3.0006, longitude: 101.3925,
    details: { registrationNumber: 'WTA 5678', chassisNumber: 'YV2RT40A9KB123456', engineNumber: 'D13K460-778899', make: 'Volvo', model: 'FH 460', yearOfManufacture: 2020, category: 'PRIME_MOVER', roadTaxExpiry: '2027-06-30', insuranceExpiry: '2027-06-30', inspectionExpiry: '2027-03-31', hirePurchase: false },
  },
  MACHINERY: {
    name: `${PREFIX} Excavator Komatsu PC200-8`, location: 'Tapak projek Bandar Baru Bangi, Selangor', titleReference: 'S/N KMTPC200C55001', estimatedValue: 280000, intendedUse: 'IJARAH', latitude: 2.9643, longitude: 101.7624,
    details: { manufacturer: 'Komatsu', model: 'PC200-8', serialNumber: 'KMTPC200C55001', yearOfManufacture: 2019, purchaseDate: '2019-08-15', operatingHours: 6200, requiresDoshCertificate: false, hirePurchase: false },
  },
  BUILDING: {
    name: `${PREFIX} Rumah kedai 3 tingkat, Kajang`, location: 'No. 12, Jalan Reko 2, 43000 Kajang, Selangor', titleReference: 'GRN 55443, Lot 7788', estimatedValue: 1650000, intendedUse: 'IJARAH', latitude: 2.9935, longitude: 101.7874,
    details: { titleKind: 'INDIVIDUAL', titleNumber: 'GRN 55443', lotNumber: '7788', mukim: 'Kajang', district: 'Hulu Langat', state: 'Selangor', buildingUse: 'COMMERCIAL', floorArea: 4500, floorAreaUnit: 'SQ_FEET', yearCompleted: 2016, completionCertificateNumber: 'CCC-MPKJ-2016-0123', hasTenants: true, tenantActivity: 'Klinik dan farmasi' },
  },
};

async function main() {
  const prisma = new PrismaClient();
  try {
    const owners = await prisma.userRoleAssignment.findMany({ where: { role: 'Asset_Owner', isActive: true, ...(args.owner ? { userId: args.owner.trim() } : {}), ...(args.org ? { organisationId: args.org.trim() } : {}) }, include: { user: { select: { name: true, email: true } }, organisation: { select: { name: true } } } });
    if (!owners.length) throw new Error(args.owner ? `${args.owner} is not an active Asset Owner.` : 'No active Asset Owner found. Provision one first (scripts/provision-user.ts).');
    if (owners.length > 1) {
      const oneUser = new Set(owners.map((owner) => owner.userId)).size === 1;
      console.log(oneUser ? `${owners[0].userId} is Asset Owner for more than one organisation. Run again with --org <organisation ID>:` : 'More than one Asset Owner. Run again with --owner <Member ID> (and --org if needed):');
      for (const owner of owners) console.log(`  ${owner.userId}  ${owner.user.name} <${owner.user.email}>  ${owner.organisationId}  ${owner.organisation.name}`);
      process.exitCode = 1;
      return;
    }
    const owner = owners[0];

    if ('remove' in args) {
      const samples = await prisma.asset.findMany({ where: { ownerUserId: owner.userId, name: { startsWith: PREFIX } }, select: { id: true, status: true } });
      const drafts = samples.filter((asset) => asset.status === 'DRAFT' || asset.status === 'WITHDRAWN');
      await prisma.asset.deleteMany({ where: { id: { in: drafts.map((asset) => asset.id) } } });
      console.log(`Deleted ${drafts.length} sample draft(s).${samples.length > drafts.length ? ` Kept ${samples.length - drafts.length} already submitted or reviewed: withdraw them in the app first.` : ''}`);
      return;
    }

    const type = (args.type || 'LAND').trim().toUpperCase();
    const sample = SAMPLES[type];
    if (!sample) throw new Error(`--type must be one of ${Object.keys(SAMPLES).join(', ')}.`);
    const identityKey = assetIdentityKey(type, sample.details);
    const existing = identityKey ? await prisma.asset.findFirst({ where: { organisationId: owner.organisationId, identityKey, status: { notIn: ['REJECTED', 'WITHDRAWN'] } }, select: { id: true } }) : null;
    if (existing) {
      console.log(`A sample ${type.toLowerCase()} already exists: ${existing.id}. Nothing added.`);
      return;
    }

    const id = newCountryScopedId('ASSET', owner.countryNodeId);
    await prisma.asset.create({
      data: {
        id, organisationId: owner.organisationId, countryNodeId: owner.countryNodeId, ownerUserId: owner.userId, assetType: type,
        name: sample.name, location: sample.location, titleReference: sample.titleReference, description: 'Sample asset for trying the asset screens. Not a real asset.',
        estimatedValue: new Prisma.Decimal(sample.estimatedValue), currency: 'MYR', intendedUse: sample.intendedUse,
        latitude: sample.latitude, longitude: sample.longitude, details: sample.details as Prisma.InputJsonValue, identityKey,
      },
    });
    console.log(`Added ${id} (${type}, draft) for ${owner.user.name} (${owner.userId}), ${owner.organisation.name}.`);
    console.log('Sign in as this Asset Owner, open More > Asset Register, and upload documents to it.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
