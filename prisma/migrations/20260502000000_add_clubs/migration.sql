CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Club_name_key" ON "Club"("name");

ALTER TABLE "Player" ADD COLUMN "clubId" TEXT;

INSERT INTO "Club" ("id", "name")
SELECT
    'club_' || substr(md5(trim("club")), 1, 24),
    trim("club")
FROM (
    SELECT DISTINCT "club"
    FROM "Player"
    WHERE "club" IS NOT NULL
      AND trim("club") <> ''
      AND lower(trim("club")) <> 'guest'
) AS existing_clubs
ON CONFLICT ("name") DO NOTHING;

UPDATE "Player" AS p
SET "clubId" = c."id"
FROM "Club" AS c
WHERE p."clubId" IS NULL
  AND p."club" IS NOT NULL
  AND trim(p."club") = c."name";

CREATE INDEX "Player_clubId_idx" ON "Player"("clubId");

ALTER TABLE "Player" ADD CONSTRAINT "Player_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;
