CREATE TABLE "AdminActivity" (
    "id" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'success',
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminActivity_createdAt_idx" ON "AdminActivity"("createdAt");
CREATE INDEX "AdminActivity_actorId_createdAt_idx" ON "AdminActivity"("actorId", "createdAt");
CREATE INDEX "AdminActivity_entityType_createdAt_idx" ON "AdminActivity"("entityType", "createdAt");

ALTER TABLE "AdminActivity" ADD CONSTRAINT "AdminActivity_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
