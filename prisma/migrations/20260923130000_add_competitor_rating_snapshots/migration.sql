ALTER TABLE "Competitor"
  ADD COLUMN "rating" DECIMAL(3,2),
  ADD COLUMN "reviewCount" INTEGER,
  ADD COLUMN "ratingSource" TEXT,
  ADD COLUMN "ratingSourceUrl" TEXT,
  ADD COLUMN "ratingObservedAt" TIMESTAMP(3);
