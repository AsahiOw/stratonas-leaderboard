BEGIN;

-- Password identities remain separate from Discord. Move each affected OAuth
-- identity to a regular member without changing the original administrator.
CREATE TEMP TABLE "_DiscordPasswordSplit" ON COMMIT DROP AS
SELECT a."id" AS "accountId", a."userId" AS "oldUserId",
       a."providerAccountId" AS "discordId", 'discord_split_' || a."id" AS "newUserId"
FROM "Account" a
JOIN "User" u ON u."id" = a."userId"
WHERE a."provider" = 'discord' AND u."passwordHash" IS NOT NULL;

INSERT INTO "User" ("id", "name", "role")
SELECT s."newUserId", COALESCE(p."username", 'Discord member'), 'VIEWER'::"Role"
FROM "_DiscordPasswordSplit" s
LEFT JOIN "Player" p ON p."userID" = s."discordId";

-- Transfer only ownership verified by the Discord ID; raid data and profile
-- settings stay on the same player record.
UPDATE "Player" p SET "ownerId" = s."newUserId"
FROM "_DiscordPasswordSplit" s
WHERE p."ownerId" = s."oldUserId" AND p."userID" = s."discordId";

UPDATE "Account" a SET "userId" = s."newUserId"
FROM "_DiscordPasswordSplit" s WHERE a."id" = s."accountId";

DELETE FROM "Session" WHERE "userId" IN (SELECT "oldUserId" FROM "_DiscordPasswordSplit");

COMMIT;
