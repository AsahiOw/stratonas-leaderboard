DROP INDEX IF EXISTS "Player_ign_key";

CREATE INDEX IF NOT EXISTS "Player_ign_idx" ON "Player"("ign");
