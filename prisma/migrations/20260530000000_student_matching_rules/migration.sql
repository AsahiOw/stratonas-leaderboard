-- CreateTable
CREATE TABLE "StudentAlias" (
    "id" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,
    "studentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentMatchRule" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "normalizedPattern" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "normalizedValue" TEXT NOT NULL DEFAULT '',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentMatchRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XlsxImportReviewItem" (
    "id" TEXT NOT NULL,
    "raidId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "rawFavoriteStudent" TEXT,
    "normalizedRawFavoriteStudent" TEXT NOT NULL DEFAULT '',
    "pfpUrl" TEXT,
    "suggestedStudentId" INTEGER,
    "suggestedConfidence" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolvedStudentId" INTEGER,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "XlsxImportReviewItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentAlias_normalizedAlias_key" ON "StudentAlias"("normalizedAlias");

-- CreateIndex
CREATE INDEX "StudentAlias_studentId_idx" ON "StudentAlias"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentMatchRule_type_normalizedPattern_normalizedValue_key" ON "StudentMatchRule"("type", "normalizedPattern", "normalizedValue");

-- CreateIndex
CREATE INDEX "StudentMatchRule_type_enabled_idx" ON "StudentMatchRule"("type", "enabled");

-- CreateIndex
CREATE INDEX "XlsxImportReviewItem_status_createdAt_idx" ON "XlsxImportReviewItem"("status", "createdAt");

-- CreateIndex
CREATE INDEX "XlsxImportReviewItem_raidId_idx" ON "XlsxImportReviewItem"("raidId");

-- CreateIndex
CREATE INDEX "XlsxImportReviewItem_playerId_idx" ON "XlsxImportReviewItem"("playerId");

-- CreateIndex
CREATE INDEX "XlsxImportReviewItem_suggestedStudentId_idx" ON "XlsxImportReviewItem"("suggestedStudentId");

-- CreateIndex
CREATE INDEX "XlsxImportReviewItem_resolvedStudentId_idx" ON "XlsxImportReviewItem"("resolvedStudentId");

-- AddForeignKey
ALTER TABLE "StudentAlias" ADD CONSTRAINT "StudentAlias_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XlsxImportReviewItem" ADD CONSTRAINT "XlsxImportReviewItem_raidId_fkey" FOREIGN KEY ("raidId") REFERENCES "Raid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XlsxImportReviewItem" ADD CONSTRAINT "XlsxImportReviewItem_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XlsxImportReviewItem" ADD CONSTRAINT "XlsxImportReviewItem_suggestedStudentId_fkey" FOREIGN KEY ("suggestedStudentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XlsxImportReviewItem" ADD CONSTRAINT "XlsxImportReviewItem_resolvedStudentId_fkey" FOREIGN KEY ("resolvedStudentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Default matching rules copied from the previous hardcoded matcher.
-- These are conflict-safe so production edits are not overwritten by future deploys.
INSERT INTO "StudentMatchRule" ("id", "type", "pattern", "normalizedPattern", "value", "normalizedValue", "updatedAt")
VALUES
  ('default-variant-prefix-armed-a', 'variant_prefix', 'armed', 'armed', 'A', 'a', CURRENT_TIMESTAMP),
  ('default-variant-prefix-swimsuit-s', 'variant_prefix', 'swimsuit', 'swimsuit', 'S', 's', CURRENT_TIMESTAMP),
  ('default-variant-prefix-maid-m', 'variant_prefix', 'maid', 'maid', 'M', 'm', CURRENT_TIMESTAMP),
  ('default-variant-prefix-new-year-ny', 'variant_prefix', 'new year', 'new year', 'NY', 'ny', CURRENT_TIMESTAMP),
  ('default-variant-prefix-hotspring-hs', 'variant_prefix', 'hotspring', 'hotspring', 'HS', 'hs', CURRENT_TIMESTAMP),
  ('default-variant-prefix-hot-spring-hs', 'variant_prefix', 'hot spring', 'hot spring', 'HS', 'hs', CURRENT_TIMESTAMP),
  ('default-variant-prefix-dress-d', 'variant_prefix', 'dress', 'dress', 'D', 'd', CURRENT_TIMESTAMP),
  ('default-variant-prefix-band-b', 'variant_prefix', 'band', 'band', 'B', 'b', CURRENT_TIMESTAMP),
  ('default-variant-prefix-bunny-b', 'variant_prefix', 'bunny', 'bunny', 'B', 'b', CURRENT_TIMESTAMP),
  ('default-variant-prefix-casual-c', 'variant_prefix', 'casual', 'casual', 'C', 'c', CURRENT_TIMESTAMP),
  ('default-variant-prefix-cheer-squad-c', 'variant_prefix', 'cheer squad', 'cheer squad', 'C', 'c', CURRENT_TIMESTAMP),
  ('default-variant-prefix-pop-idol-i', 'variant_prefix', 'pop idol', 'pop idol', 'I', 'i', CURRENT_TIMESTAMP),
  ('default-variant-prefix-pajamas-p', 'variant_prefix', 'pajamas', 'pajamas', 'P', 'p', CURRENT_TIMESTAMP),
  ('default-variant-prefix-magical-m', 'variant_prefix', 'magical', 'magical', 'M', 'm', CURRENT_TIMESTAMP),
  ('default-variant-prefix-school-u', 'variant_prefix', 'school', 'school', 'U', 'u', CURRENT_TIMESTAMP),
  ('default-variant-prefix-track-t', 'variant_prefix', 'track', 'track', 'T', 't', CURRENT_TIMESTAMP),
  ('default-variant-prefix-camp-c', 'variant_prefix', 'camp', 'camp', 'C', 'c', CURRENT_TIMESTAMP),
  ('default-variant-prefix-idol-i', 'variant_prefix', 'idol', 'idol', 'I', 'i', CURRENT_TIMESTAMP),
  ('default-variant-prefix-pajama-p', 'variant_prefix', 'pajama', 'pajama', 'P', 'p', CURRENT_TIMESTAMP),
  ('default-variant-prefix-uniform-u', 'variant_prefix', 'uniform', 'uniform', 'U', 'u', CURRENT_TIMESTAMP),
  ('default-base-alias-alice-aris', 'base_alias', 'alice', 'alice', 'aris', 'aris', CURRENT_TIMESTAMP),
  ('default-base-alias-arisu-aris', 'base_alias', 'arisu', 'arisu', 'aris', 'aris', CURRENT_TIMESTAMP),
  ('default-base-alias-hoshi-hoshino', 'base_alias', 'hoshi', 'hoshi', 'hoshino', 'hoshino', CURRENT_TIMESTAMP),
  ('default-base-alias-kokonut-kokona', 'base_alias', 'kokonut', 'kokonut', 'kokona', 'kokona', CURRENT_TIMESTAMP),
  ('default-base-alias-shino-hoshino', 'base_alias', 'shino', 'shino', 'hoshino', 'hoshino', CURRENT_TIMESTAMP),
  ('default-variant-alias-battle-armed', 'variant_alias', 'battle', 'battle', 'armed', 'armed', CURRENT_TIMESTAMP),
  ('default-variant-alias-chear-cheer-squad', 'variant_alias', 'chear', 'chear', 'cheer squad', 'cheer squad', CURRENT_TIMESTAMP),
  ('default-variant-alias-cheer-cheer-squad', 'variant_alias', 'cheer', 'cheer', 'cheer squad', 'cheer squad', CURRENT_TIMESTAMP),
  ('default-student-alias-b-hoshi-hoshino-armed', 'student_alias', 'b hoshi', 'b hoshi', 'Hoshino (Armed)', 'hoshino armed', CURRENT_TIMESTAMP),
  ('default-student-alias-b-hoshino-hoshino-armed', 'student_alias', 'b hoshino', 'b hoshino', 'Hoshino (Armed)', 'hoshino armed', CURRENT_TIMESTAMP),
  ('default-student-alias-c-sena-sena-casual', 'student_alias', 'c sena', 'c sena', 'Sena (Casual)', 'sena casual', CURRENT_TIMESTAMP),
  ('default-student-alias-i-sakurako-sakurako-pop-idol', 'student_alias', 'i sakurako', 'i sakurako', 'Sakurako (Pop Idol)', 'sakurako pop idol', CURRENT_TIMESTAMP),
  ('default-student-alias-kuroko-shiroko-terror', 'student_alias', 'kuroko', 'kuroko', 'Shiroko*Terror', 'shiroko terror', CURRENT_TIMESTAMP),
  ('default-student-alias-m-reisa-reisa-magical', 'student_alias', 'm reisa', 'm reisa', 'Reisa (Magical)', 'reisa magical', CURRENT_TIMESTAMP),
  ('default-student-alias-miku-hatsune-miku', 'student_alias', 'miku', 'miku', 'Hatsune Miku', 'hatsune miku', CURRENT_TIMESTAMP),
  ('default-student-alias-p-noa-noa-pajamas', 'student_alias', 'p noa', 'p noa', 'Noa (Pajamas)', 'noa pajamas', CURRENT_TIMESTAMP),
  ('default-student-alias-p-yuuka-yuuka-pajamas', 'student_alias', 'p yuuka', 'p yuuka', 'Yuuka (Pajamas)', 'yuuka pajamas', CURRENT_TIMESTAMP),
  ('default-student-alias-t-shiroko-shiroko-terror', 'student_alias', 't shiroko', 't shiroko', 'Shiroko*Terror', 'shiroko terror', CURRENT_TIMESTAMP),
  ('default-student-alias-u-akane-akane-school', 'student_alias', 'u akane', 'u akane', 'Akane (School)', 'akane school', CURRENT_TIMESTAMP),
  ('default-student-alias-ah-ru-aru', 'student_alias', 'Ah Ru', 'ah ru', 'Aru', 'aru', CURRENT_TIMESTAMP),
  ('default-ignored-token-best', 'ignored_token', 'best', 'best', '', '', CURRENT_TIMESTAMP),
  ('default-ignored-token-chibi', 'ignored_token', 'chibi', 'chibi', '', '', CURRENT_TIMESTAMP),
  ('default-ignored-token-emoji', 'ignored_token', 'emoji', 'emoji', '', '', CURRENT_TIMESTAMP),
  ('default-ignored-token-fav', 'ignored_token', 'fav', 'fav', '', '', CURRENT_TIMESTAMP),
  ('default-ignored-token-favorite', 'ignored_token', 'favorite', 'favorite', '', '', CURRENT_TIMESTAMP),
  ('default-ignored-token-icon', 'ignored_token', 'icon', 'icon', '', '', CURRENT_TIMESTAMP),
  ('default-ignored-token-l2d', 'ignored_token', 'l2d', 'l2d', '', '', CURRENT_TIMESTAMP),
  ('default-ignored-token-love', 'ignored_token', 'love', 'love', '', '', CURRENT_TIMESTAMP),
  ('default-ignored-token-mommy', 'ignored_token', 'mommy', 'mommy', '', '', CURRENT_TIMESTAMP),
  ('default-ignored-token-pfp', 'ignored_token', 'pfp', 'pfp', '', '', CURRENT_TIMESTAMP),
  ('default-ignored-token-profile', 'ignored_token', 'profile', 'profile', '', '', CURRENT_TIMESTAMP),
  ('default-ignored-token-smirk', 'ignored_token', 'smirk', 'smirk', '', '', CURRENT_TIMESTAMP),
  ('default-ignored-token-student', 'ignored_token', 'student', 'student', '', '', CURRENT_TIMESTAMP)
ON CONFLICT ("type", "normalizedPattern", "normalizedValue") DO NOTHING;
