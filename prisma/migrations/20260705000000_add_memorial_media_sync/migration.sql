CREATE TABLE "MemorialMediaSyncState" (
    "id" TEXT NOT NULL DEFAULT 'jaymie-memorial-media',
    "status" TEXT NOT NULL DEFAULT 'idle',
    "stage" TEXT NOT NULL DEFAULT 'idle',
    "total" INTEGER NOT NULL DEFAULT 0,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "discovered" INTEGER NOT NULL DEFAULT 0,
    "newVideos" INTEGER NOT NULL DEFAULT 0,
    "downloaded" INTEGER NOT NULL DEFAULT 0,
    "optimized" INTEGER NOT NULL DEFAULT 0,
    "posters" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "currentItem" TEXT,
    "message" TEXT,
    "error" TEXT,
    "lastScheduledRunAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemorialMediaSyncState_pkey" PRIMARY KEY ("id")
);
