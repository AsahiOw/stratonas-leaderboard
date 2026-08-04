DELETE FROM "NewsTranslation" older
USING "NewsTranslation" newer
WHERE older."server" = newer."server"
  AND older."postId" = newer."postId"
  AND (
    older."updatedAt" < newer."updatedAt"
    OR (older."updatedAt" = newer."updatedAt" AND older."id" < newer."id")
  );

DROP INDEX "NewsTranslation_server_postId_sourceFingerprint_key";
DROP INDEX "NewsTranslation_server_postId_idx";

CREATE UNIQUE INDEX "NewsTranslation_server_postId_key" ON "NewsTranslation"("server", "postId");
