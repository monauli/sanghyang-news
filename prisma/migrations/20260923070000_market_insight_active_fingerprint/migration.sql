ALTER TABLE "MarketInsight" ADD COLUMN "activeFingerprint" TEXT;
UPDATE "MarketInsight" SET "activeFingerprint" = "fingerprint" WHERE "status" = 'active';
CREATE UNIQUE INDEX "MarketInsight_activeFingerprint_key" ON "MarketInsight"("activeFingerprint") WHERE "activeFingerprint" IS NOT NULL;
