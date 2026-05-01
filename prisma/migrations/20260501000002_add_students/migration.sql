-- CreateTable
CREATE TABLE "Student" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentImportState" (
    "id" TEXT NOT NULL DEFAULT 'schaledb-students',
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

    CONSTRAINT "StudentImportState_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Player" ADD COLUMN "favouriteStudentId" INTEGER;

-- CreateIndex
CREATE INDEX "Student_name_idx" ON "Student"("name");

-- CreateIndex
CREATE INDEX "Player_favouriteStudentId_idx" ON "Player"("favouriteStudentId");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_favouriteStudentId_fkey" FOREIGN KEY ("favouriteStudentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
