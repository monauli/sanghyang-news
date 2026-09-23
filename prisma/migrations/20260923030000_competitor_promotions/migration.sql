CREATE TYPE "PromotionStatus" AS ENUM ('new', 'changed', 'expired');

CREATE TABLE "CompetitorPromotion" (
    "id" UUID NOT NULL,
    "competitorId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "price" DECIMAL(12,2),
    "originalPrice" DECIMAL(12,2),
    "discount" DECIMAL(5,2),
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "imageUrl" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "status" "PromotionStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompetitorPromotion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CompetitorPromotion_competitorId_capturedAt_idx" ON "CompetitorPromotion"("competitorId", "capturedAt");
CREATE INDEX "CompetitorPromotion_status_startsAt_endsAt_idx" ON "CompetitorPromotion"("status", "startsAt", "endsAt");
ALTER TABLE "CompetitorPromotion" ADD CONSTRAINT "CompetitorPromotion_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
