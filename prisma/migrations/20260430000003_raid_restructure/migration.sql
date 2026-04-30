-- CreateTable: RaidBoss
CREATE TABLE "RaidBoss" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "image" TEXT,

    CONSTRAINT "RaidBoss_pkey" PRIMARY KEY ("id")
);

-- CreateTable: RaidType
CREATE TABLE "RaidType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "RaidType_pkey" PRIMARY KEY ("id")
);

-- CreateTable: RaidServer
CREATE TABLE "RaidServer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "RaidServer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RaidBoss_name_key" ON "RaidBoss"("name");
CREATE UNIQUE INDEX "RaidType_name_key" ON "RaidType"("name");
CREATE UNIQUE INDEX "RaidServer_name_key" ON "RaidServer"("name");

-- Seed lookup tables with fixed IDs
INSERT INTO "RaidType" ("id", "name") VALUES
    ('raidtype_total_assault', 'Total Assault'),
    ('raidtype_grand_assault', 'Grand Assault');

INSERT INTO "RaidServer" ("id", "name") VALUES
    ('raidserver_global', 'Global'),
    ('raidserver_japan',  'Japan');

-- Migrate RaidBoss from existing distinct Raid names + descriptions
INSERT INTO "RaidBoss" ("id", "name", "description", "image")
SELECT
    'rb_' || md5("name"),
    "name",
    COALESCE("desc", ''),
    NULL
FROM (
    SELECT DISTINCT "name", MAX("desc") AS "desc"
    FROM "Raid"
    GROUP BY "name"
) t;

-- Add new FK columns to Raid (nullable first for migration)
ALTER TABLE "Raid" ADD COLUMN "raidBossId" TEXT;
ALTER TABLE "Raid" ADD COLUMN "typeId"     TEXT;
ALTER TABLE "Raid" ADD COLUMN "serverId"   TEXT;
ALTER TABLE "Raid" ADD COLUMN "seasonInt"  INTEGER;

-- Populate FK columns from existing data
UPDATE "Raid" SET
    "raidBossId" = 'rb_' || md5("name"),
    "typeId"     = 'raidtype_total_assault',
    "serverId"   = CASE WHEN "server" = 'GLOBAL' THEN 'raidserver_global' ELSE 'raidserver_japan' END,
    "seasonInt"  = COALESCE(
        NULLIF(REGEXP_REPLACE(COALESCE("season", ''), '\D+', '', 'g'), '')::INTEGER,
        1
    );

-- Make FK columns NOT NULL
ALTER TABLE "Raid" ALTER COLUMN "raidBossId" SET NOT NULL;
ALTER TABLE "Raid" ALTER COLUMN "typeId"     SET NOT NULL;
ALTER TABLE "Raid" ALTER COLUMN "serverId"   SET NOT NULL;
ALTER TABLE "Raid" ALTER COLUMN "seasonInt"  SET NOT NULL;

-- Drop old columns from Raid
ALTER TABLE "Raid" DROP COLUMN "name";
ALTER TABLE "Raid" DROP COLUMN "episode";
ALTER TABLE "Raid" DROP COLUMN "desc";
ALTER TABLE "Raid" DROP COLUMN "server";
ALTER TABLE "Raid" DROP COLUMN "season";

-- Rename seasonInt -> season
ALTER TABLE "Raid" RENAME COLUMN "seasonInt" TO "season";

-- Add foreign key constraints
ALTER TABLE "Raid" ADD CONSTRAINT "Raid_raidBossId_fkey" FOREIGN KEY ("raidBossId") REFERENCES "RaidBoss"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Raid" ADD CONSTRAINT "Raid_typeId_fkey"     FOREIGN KEY ("typeId")     REFERENCES "RaidType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Raid" ADD CONSTRAINT "Raid_serverId_fkey"   FOREIGN KEY ("serverId")   REFERENCES "RaidServer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old Server enum
DROP TYPE "Server";
