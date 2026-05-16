ALTER TABLE "Student" ADD COLUMN "familyName" TEXT;
ALTER TABLE "Student" ADD COLUMN "personalName" TEXT;
ALTER TABLE "Student" ADD COLUMN "school" TEXT;
ALTER TABLE "Student" ADD COLUMN "club" TEXT;
ALTER TABLE "Student" ADD COLUMN "schoolYear" TEXT;
ALTER TABLE "Student" ADD COLUMN "characterAge" TEXT;
ALTER TABLE "Student" ADD COLUMN "birthday" TEXT;
ALTER TABLE "Student" ADD COLUMN "birthDay" TEXT;
ALTER TABLE "Student" ADD COLUMN "hobby" TEXT;
ALTER TABLE "Student" ADD COLUMN "heightMetric" TEXT;
ALTER TABLE "Student" ADD COLUMN "weaponType" TEXT;
ALTER TABLE "Student" ADD COLUMN "tacticRole" TEXT;
ALTER TABLE "Student" ADD COLUMN "position" TEXT;
ALTER TABLE "Student" ADD COLUMN "weaponName" TEXT;

CREATE INDEX "Student_birthDay_idx" ON "Student"("birthDay");
