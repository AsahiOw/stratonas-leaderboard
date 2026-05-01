ALTER TABLE "RaidBoss"
ADD COLUMN "color" TEXT NOT NULL DEFAULT '#4f8ef7',
ADD COLUMN "color2" TEXT NOT NULL DEFAULT '#7c3aed',
ADD COLUMN "pattern" TEXT NOT NULL DEFAULT 'hex';

UPDATE "RaidBoss" AS boss
SET
  "color" = raid_theme."color",
  "color2" = raid_theme."color2",
  "pattern" = raid_theme."pattern"
FROM (
  SELECT DISTINCT ON ("raidBossId")
    "raidBossId",
    "color",
    "color2",
    "pattern"
  FROM "Raid"
  ORDER BY "raidBossId", "startDate" DESC NULLS LAST
) AS raid_theme
WHERE boss."id" = raid_theme."raidBossId";
