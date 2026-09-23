ALTER TABLE "FeatureModule" ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'ACTIVE';

INSERT INTO "FeatureModule" ("moduleKey", "name", "description", "mode", "enabled", "updatedAt") VALUES
  ('KYC_VERIFICATION', 'KYC Verification', 'Individual identity verification and review', 'MANUAL_REVIEW', true, CURRENT_TIMESTAMP),
  ('KYB_VERIFICATION', 'KYB Verification', 'Corporate identity and beneficial ownership review', 'MANUAL_REVIEW', true, CURRENT_TIMESTAMP);
