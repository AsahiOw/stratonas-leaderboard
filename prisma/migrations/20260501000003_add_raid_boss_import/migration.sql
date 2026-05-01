-- AlterTable
ALTER TABLE "RaidBoss" ADD COLUMN "schaleId" INTEGER;

-- CreateTable
CREATE TABLE "RaidBossImportState" (
    "id" TEXT NOT NULL DEFAULT 'schaledb-raid-bosses',
    "status" TEXT NOT NULL DEFAULT 'idle',
    "total" INTEGER NOT NULL DEFAULT 0,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "added" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaidBossImportState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RaidBoss_schaleId_key" ON "RaidBoss"("schaleId");
