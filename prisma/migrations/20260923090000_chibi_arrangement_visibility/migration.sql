-- Preserve imported source arrangement separately from per-character admin edits.
ALTER TABLE "ChibiAsset"
ADD COLUMN "arrangementDefault" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "StudentChibiBinding"
ADD COLUMN "arrangementOverride" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "catalogVisible" BOOLEAN NOT NULL DEFAULT true;
