ALTER TABLE "ChibiAsset"
  ADD COLUMN "coreFingerprint" TEXT,
  ADD COLUMN "coreFingerprintSchemaVersion" INTEGER;

ALTER TABLE "ChibiImportItem"
  ADD COLUMN "processingTiming" JSONB;

CREATE INDEX "ChibiAsset_coreFingerprint_coreFingerprintSchemaVersion_createdAt_idx"
  ON "ChibiAsset"("coreFingerprint", "coreFingerprintSchemaVersion", "createdAt");
