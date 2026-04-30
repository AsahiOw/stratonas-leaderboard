-- AlterTable: add isGuildMember flag to Player
ALTER TABLE "Player" ADD COLUMN "isGuildMember" BOOLEAN NOT NULL DEFAULT true;
