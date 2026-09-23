ALTER TABLE "MarketInsight" ADD COLUMN "activeFingerprint" TEXT;
WITH ranked_active AS (
  SELECT "id", "fingerprint", ROW_NUMBER() OVER (
    PARTITION BY "fingerprint" ORDER BY "generatedAt" DESC, "createdAt" DESC, "id" DESC
  ) AS row_number
  FROM "MarketInsight"
  WHERE "status" = 'active'
)
UPDATE "MarketInsight" AS insight
SET "activeFingerprint" = CASE WHEN ranked.row_number = 1 THEN ranked."fingerprint" ELSE NULL END
FROM ranked_active AS ranked
WHERE insight."id" = ranked."id";
CREATE UNIQUE INDEX "MarketInsight_activeFingerprint_key" ON "MarketInsight"("activeFingerprint") WHERE "activeFingerprint" IS NOT NULL AND "status" = 'active';
