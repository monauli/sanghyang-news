CREATE TYPE "ReviewSentiment" AS ENUM ('positive', 'neutral', 'negative');

CREATE TABLE "CompetitorReview" (
    "id" UUID NOT NULL,
    "competitorId" UUID NOT NULL,
    "externalId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "rating" DECIMAL(3,2) NOT NULL,
    "reviewDate" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "text" TEXT NOT NULL,
    "sentiment" "ReviewSentiment" NOT NULL,
    "themes" TEXT[] NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompetitorReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompetitorReview_competitorId_source_externalId_key" ON "CompetitorReview"("competitorId", "source", "externalId");
CREATE INDEX "CompetitorReview_competitorId_reviewDate_idx" ON "CompetitorReview"("competitorId", "reviewDate");
CREATE INDEX "CompetitorReview_sentiment_reviewDate_idx" ON "CompetitorReview"("sentiment", "reviewDate");
ALTER TABLE "CompetitorReview" ADD CONSTRAINT "CompetitorReview_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
