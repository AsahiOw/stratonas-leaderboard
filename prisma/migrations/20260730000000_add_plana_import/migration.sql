CREATE TABLE "PlanaImportState" (
    "id" TEXT NOT NULL DEFAULT 'plana-stats',
    "status" TEXT NOT NULL DEFAULT 'idle',
    "stage" TEXT NOT NULL DEFAULT 'idle',
    "mode" TEXT NOT NULL DEFAULT 'new',
    "total" INTEGER NOT NULL DEFAULT 0,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "downloaded" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "currentDataset" TEXT,
    "message" TEXT,
    "error" TEXT,
    "manifestSchemaVersion" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanaImportState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlanaDataset" (
    "id" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "raidType" TEXT NOT NULL,
    "raidDate" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "internalName" TEXT NOT NULL,
    "terrain" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "maxDifficulty" TEXT,
    "armors" JSONB,
    "difficulties" JSONB,
    "startAt" TEXT,
    "endAt" TEXT,
    "manifestSchemaVersion" INTEGER NOT NULL,
    "dbRemotePath" TEXT NOT NULL,
    "parquetRemotePath" TEXT NOT NULL,
    "dbLocalPath" TEXT,
    "parquetLocalPath" TEXT,
    "dbEtag" TEXT,
    "parquetEtag" TEXT,
    "dbBytes" BIGINT,
    "parquetBytes" BIGINT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "downloadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanaDataset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlanaDataset_region_raidType_raidDate_key"
ON "PlanaDataset"("region", "raidType", "raidDate");

CREATE INDEX "PlanaDataset_status_idx" ON "PlanaDataset"("status");

CREATE INDEX "PlanaDataset_raidDate_idx" ON "PlanaDataset"("raidDate");
