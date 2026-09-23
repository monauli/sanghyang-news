CREATE TYPE "MarketItemKind" AS ENUM ('fnb', 'event', 'destination');

CREATE TABLE "MarketItem" (
    "id" UUID NOT NULL,
    "articleId" UUID NOT NULL,
    "kind" "MarketItemKind" NOT NULL,
    "location" TEXT,
    "venue" TEXT,
    "organizer" TEXT,
    "brand" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "tags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MarketItem_articleId_key" ON "MarketItem"("articleId");
CREATE INDEX "MarketItem_kind_location_idx" ON "MarketItem"("kind", "location");
CREATE INDEX "MarketItem_startsAt_idx" ON "MarketItem"("startsAt");
ALTER TABLE "MarketItem" ADD CONSTRAINT "MarketItem_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
