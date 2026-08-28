CREATE TABLE "MaintenanceJobRun" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MaintenanceJobRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MaintenanceSchedulerLock" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "holder" TEXT,
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MaintenanceSchedulerLock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MaintenanceJobRun_jobId_scheduledAt_key" ON "MaintenanceJobRun"("jobId", "scheduledAt");
CREATE INDEX "MaintenanceJobRun_status_scheduledAt_idx" ON "MaintenanceJobRun"("status", "scheduledAt");
