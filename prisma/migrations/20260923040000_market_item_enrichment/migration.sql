ALTER TABLE "MarketItem" ADD COLUMN "description" TEXT;
ALTER TABLE "MarketItem" ADD COLUMN "targetAudience" TEXT;
ALTER TABLE "MarketItem" ADD COLUMN "relevanceScore" INTEGER;
ALTER TABLE "MarketItem" ADD CONSTRAINT "MarketItem_relevanceScore_check" CHECK ("relevanceScore" IS NULL OR ("relevanceScore" >= 0 AND "relevanceScore" <= 100));
