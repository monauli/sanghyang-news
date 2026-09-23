CREATE TABLE "Competitor" (
    "id" UUID NOT NULL, "name" TEXT NOT NULL, "websiteUrl" TEXT, "location" TEXT, "bookingUrl" TEXT, "socialUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true, "notes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CompetitorPriceSnapshot" (
    "id" UUID NOT NULL, "competitorId" UUID NOT NULL, "roomPackage" TEXT NOT NULL, "price" DECIMAL(12,2) NOT NULL,
    "originalPrice" DECIMAL(12,2), "discount" DECIMAL(5,2), "checkIn" TIMESTAMP(3), "checkOut" TIMESTAMP(3), "source" TEXT NOT NULL, "sourceUrl" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompetitorPriceSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Competitor_active_name_idx" ON "Competitor"("active", "name");
CREATE INDEX "CompetitorPriceSnapshot_competitorId_observedAt_idx" ON "CompetitorPriceSnapshot"("competitorId", "observedAt");
CREATE INDEX "CompetitorPriceSnapshot_source_observedAt_idx" ON "CompetitorPriceSnapshot"("source", "observedAt");
ALTER TABLE "CompetitorPriceSnapshot" ADD CONSTRAINT "CompetitorPriceSnapshot_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
