CREATE TABLE "NewsTranslation" (
    "id" TEXT NOT NULL,
    "server" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "sourceFingerprint" TEXT NOT NULL,
    "translatedTitle" TEXT NOT NULL,
    "translatedHtml" TEXT NOT NULL,
    "sourceModifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsTranslation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NewsTranslation_server_postId_idx" ON "NewsTranslation"("server", "postId");

CREATE UNIQUE INDEX "NewsTranslation_server_postId_sourceFingerprint_key" ON "NewsTranslation"("server", "postId", "sourceFingerprint");
