ALTER TABLE "Student" ADD COLUMN "characterVoice" TEXT;

CREATE TABLE "Recruitment" (
    "id" TEXT NOT NULL,
    "studentId" INTEGER NOT NULL,
    "bannerPath" TEXT NOT NULL,
    "animationPath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recruitment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UpcomingRecruitment" (
    "id" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpcomingRecruitment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UpcomingRecruitmentItem" (
    "upcomingRecruitmentId" TEXT NOT NULL,
    "recruitmentId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UpcomingRecruitmentItem_pkey" PRIMARY KEY ("upcomingRecruitmentId", "recruitmentId")
);

CREATE UNIQUE INDEX "Recruitment_studentId_key" ON "Recruitment"("studentId");

CREATE UNIQUE INDEX "UpcomingRecruitment_dateKey_key" ON "UpcomingRecruitment"("dateKey");

CREATE INDEX "UpcomingRecruitment_dateKey_idx" ON "UpcomingRecruitment"("dateKey");

CREATE INDEX "UpcomingRecruitmentItem_recruitmentId_idx" ON "UpcomingRecruitmentItem"("recruitmentId");

ALTER TABLE "Recruitment" ADD CONSTRAINT "Recruitment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UpcomingRecruitmentItem" ADD CONSTRAINT "UpcomingRecruitmentItem_upcomingRecruitmentId_fkey" FOREIGN KEY ("upcomingRecruitmentId") REFERENCES "UpcomingRecruitment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UpcomingRecruitmentItem" ADD CONSTRAINT "UpcomingRecruitmentItem_recruitmentId_fkey" FOREIGN KEY ("recruitmentId") REFERENCES "Recruitment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
