CREATE TABLE "FeatureModule" (
  "moduleKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FeatureModule_pkey" PRIMARY KEY ("moduleKey")
);

INSERT INTO "FeatureModule" ("moduleKey", "name", "description", "enabled", "updatedAt") VALUES
  ('AI_INTELLIGENCE', 'AI Intelligence', 'AI advisory features and model-assisted analysis', true, CURRENT_TIMESTAMP),
  ('ASSET_REGISTRATION', 'Asset Registration', 'Asset onboarding and verification workflows', true, CURRENT_TIMESTAMP),
  ('CONTRACTS', 'Contracts', 'Contract creation and lifecycle management', true, CURRENT_TIMESTAMP),
  ('DOCUMENT_VAULT', 'Document Vault', 'Document upload, verification, and retrieval', true, CURRENT_TIMESTAMP),
  ('FINANCIAL_LEDGER', 'Financial Ledger', 'Ledger, audit, and financial record access', true, CURRENT_TIMESTAMP),
  ('SECONDARY_MARKET', 'Secondary Market', 'Secondary market and liquidity workflows', true, CURRENT_TIMESTAMP),
  ('SHARIAH_GOVERNANCE', 'Shariah Governance', 'Shariah review and human signoff workflows', true, CURRENT_TIMESTAMP),
  ('WEALTH_POOLING', 'Wealth Pooling', 'Wealth pool, funding, and subscription workflows', true, CURRENT_TIMESTAMP);
