-- A build fingerprint can have multiple immutable converted revisions.
DROP INDEX "ChibiAsset_fingerprint_key";
CREATE INDEX "ChibiAsset_fingerprint_createdAt_idx" ON "ChibiAsset"("fingerprint", "createdAt");
