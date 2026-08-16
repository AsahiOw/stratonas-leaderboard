CREATE TABLE "XNewsPost" (
    "id" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "media" JSONB NOT NULL,
    "quotedPost" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "XNewsPost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "XNewsSyncState" (
    "account" TEXT NOT NULL,
    "lastSuccessAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "lastPostId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "XNewsSyncState_pkey" PRIMARY KEY ("account")
);

CREATE UNIQUE INDEX "XNewsPost_account_postId_key" ON "XNewsPost"("account", "postId");
CREATE INDEX "XNewsPost_account_publishedAt_idx" ON "XNewsPost"("account", "publishedAt");
