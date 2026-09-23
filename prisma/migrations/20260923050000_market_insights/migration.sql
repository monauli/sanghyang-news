CREATE TYPE "MarketInsightType" AS ENUM ('insight', 'opportunity', 'recommendation');
CREATE TYPE "MarketInsightStatus" AS ENUM ('active', 'archived');
CREATE TABLE "MarketInsight" (
  "id" UUID NOT NULL, "type" "MarketInsightType" NOT NULL, "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL, "evidence" JSONB NOT NULL, "sourceReferences" JSONB NOT NULL, "priority" INTEGER NOT NULL,
  "confidence" INTEGER NOT NULL, "status" "MarketInsightStatus" NOT NULL DEFAULT 'active', "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "MarketInsight_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MarketInsight_type_generatedAt_idx" ON "MarketInsight"("type", "generatedAt");
CREATE INDEX "MarketInsight_status_generatedAt_idx" ON "MarketInsight"("status", "generatedAt");
