CREATE TABLE "MemorialVideoAsset" (
    "id" TEXT NOT NULL,
    "youtubeId" TEXT,
    "title" TEXT NOT NULL,
    "fileName" TEXT,
    "youtubeUrl" TEXT,
    "videoUrl" TEXT,
    "posterUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'discovered',
    "downloadedAt" TIMESTAMP(3),
    "optimizedAt" TIMESTAMP(3),
    "posterGeneratedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemorialVideoAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MemorialVideoAsset_youtubeId_key" ON "MemorialVideoAsset"("youtubeId");
CREATE UNIQUE INDEX "MemorialVideoAsset_fileName_key" ON "MemorialVideoAsset"("fileName");
CREATE INDEX "MemorialVideoAsset_status_idx" ON "MemorialVideoAsset"("status");
CREATE INDEX "MemorialVideoAsset_title_idx" ON "MemorialVideoAsset"("title");
