CREATE TABLE "RadioTrack" (
    "id" TEXT NOT NULL,
    "youtubeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "displayTitle" TEXT NOT NULL,
    "youtubeUrl" TEXT NOT NULL,
    "audioFileName" TEXT,
    "thumbnailFileName" TEXT,
    "durationSeconds" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'discovered',
    "error" TEXT,
    "publishedAt" TIMESTAMP(3),
    "downloadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RadioTrack_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RadioSyncState" (
    "id" TEXT NOT NULL DEFAULT 'bluearchive-global-radio',
    "status" TEXT NOT NULL DEFAULT 'idle',
    "stage" TEXT NOT NULL DEFAULT 'idle',
    "total" INTEGER NOT NULL DEFAULT 0,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "discovered" INTEGER NOT NULL DEFAULT 0,
    "matched" INTEGER NOT NULL DEFAULT 0,
    "newTracks" INTEGER NOT NULL DEFAULT 0,
    "downloaded" INTEGER NOT NULL DEFAULT 0,
    "thumbnails" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "currentItem" TEXT,
    "message" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RadioSyncState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RadioTrack_youtubeId_key" ON "RadioTrack"("youtubeId");
CREATE INDEX "RadioTrack_status_idx" ON "RadioTrack"("status");
CREATE INDEX "RadioTrack_displayTitle_idx" ON "RadioTrack"("displayTitle");
CREATE INDEX "RadioTrack_publishedAt_idx" ON "RadioTrack"("publishedAt");
