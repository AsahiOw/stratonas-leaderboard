-- CreateTable
CREATE TABLE "ChibiAsset" (
    "id" TEXT NOT NULL,
    "sourceIdentity" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "dependencyFingerprint" TEXT NOT NULL,
    "exporterVersion" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "clips" JSONB NOT NULL DEFAULT '[]',
    "materials" JSONB NOT NULL DEFAULT '{}',
    "validation" JSONB NOT NULL DEFAULT '{}',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChibiAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentChibiBinding" (
    "studentId" INTEGER NOT NULL,
    "assetId" TEXT,
    "sourceIdentity" TEXT,
    "identityPath" TEXT,
    "profile" JSONB NOT NULL DEFAULT '{}',
    "provenance" TEXT NOT NULL DEFAULT 'automatic',
    "overrides" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'unavailable',
    "diagnostic" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentChibiBinding_pkey" PRIMARY KEY ("studentId")
);

-- CreateTable
CREATE TABLE "ChibiImportJob" (
    "id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "requesterId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "stage" TEXT NOT NULL DEFAULT 'queued',
    "total" INTEGER NOT NULL DEFAULT 0,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "imported" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "reused" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "unavailable" INTEGER NOT NULL DEFAULT 0,
    "reviewRequired" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "selection" JSONB NOT NULL DEFAULT '[]',
    "candidate" JSONB,
    "leaseToken" TEXT,
    "workerId" TEXT,
    "heartbeatAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChibiImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChibiImportItem" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "studentId" INTEGER NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'queued',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sourceIdentity" TEXT,
    "candidates" JSONB NOT NULL DEFAULT '[]',
    "fingerprint" TEXT,
    "diagnostic" TEXT,
    "assetId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChibiImportItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChibiWorkerState" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "lastHeartbeat" TIMESTAMP(3) NOT NULL,
    "ready" BOOLEAN NOT NULL DEFAULT false,
    "details" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "ChibiWorkerState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChibiSourceCandidate" (
    "id" TEXT NOT NULL,
    "sourceIdentity" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "conflict" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChibiSourceCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChibiAsset_fingerprint_key" ON "ChibiAsset"("fingerprint");

-- CreateIndex
CREATE INDEX "ChibiAsset_sourceIdentity_idx" ON "ChibiAsset"("sourceIdentity");

-- CreateIndex
CREATE INDEX "StudentChibiBinding_assetId_idx" ON "StudentChibiBinding"("assetId");

-- CreateIndex
CREATE INDEX "StudentChibiBinding_status_idx" ON "StudentChibiBinding"("status");

-- CreateIndex
CREATE INDEX "ChibiImportJob_status_createdAt_idx" ON "ChibiImportJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ChibiImportItem_studentId_status_idx" ON "ChibiImportItem"("studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ChibiImportItem_jobId_studentId_key" ON "ChibiImportItem"("jobId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ChibiSourceCandidate_sourceIdentity_key" ON "ChibiSourceCandidate"("sourceIdentity");

-- AddForeignKey
ALTER TABLE "StudentChibiBinding" ADD CONSTRAINT "StudentChibiBinding_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentChibiBinding" ADD CONSTRAINT "StudentChibiBinding_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ChibiAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChibiImportItem" ADD CONSTRAINT "ChibiImportItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ChibiImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChibiImportItem" ADD CONSTRAINT "ChibiImportItem_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChibiImportItem" ADD CONSTRAINT "ChibiImportItem_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ChibiAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
