CREATE TABLE "RaidTerrain" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "RaidTerrain_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RaidTerrain_name_key" ON "RaidTerrain"("name");

INSERT INTO "RaidTerrain" ("id", "name") VALUES
    ('raidterrain_urban', 'Urban'),
    ('raidterrain_indoor', 'Indoor'),
    ('raidterrain_outdoor', 'Outdoor')
ON CONFLICT ("name") DO NOTHING;

ALTER TABLE "Raid" ADD COLUMN "terrainId" TEXT;

UPDATE "Raid"
SET "terrainId" = 'raidterrain_urban'
WHERE "terrainId" IS NULL;

ALTER TABLE "Raid" ALTER COLUMN "terrainId" SET NOT NULL;

ALTER TABLE "Raid" ADD CONSTRAINT "Raid_terrainId_fkey" FOREIGN KEY ("terrainId") REFERENCES "RaidTerrain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
