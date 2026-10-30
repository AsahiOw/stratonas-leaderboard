ALTER TYPE "Role" ADD VALUE 'MANAGER';
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;
-- Accounts created through the original credentials flow remain administrators.
UPDATE "User" SET "role" = 'ADMIN' WHERE "passwordHash" IS NOT NULL;
ALTER TABLE "Player" ADD COLUMN "ownerId" TEXT;
CREATE UNIQUE INDEX "Player_ownerId_key" ON "Player"("ownerId");
ALTER TABLE "Player" ADD CONSTRAINT "Player_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
