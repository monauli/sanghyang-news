ALTER TABLE "MarketInsight" ADD COLUMN "fingerprint" TEXT NOT NULL DEFAULT '';
CREATE INDEX "MarketInsight_fingerprint_status_idx" ON "MarketInsight"("fingerprint", "status");
