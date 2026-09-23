ALTER TABLE "CompetitorPriceSnapshot" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'IDR';
ALTER TABLE "CompetitorPriceSnapshot" ADD COLUMN "guests" INTEGER NOT NULL DEFAULT 2;

CREATE TABLE "SanghyangPriceSnapshot" (
    "id" UUID NOT NULL,
    "roomName" TEXT NOT NULL,
    "packageName" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "originalPrice" DECIMAL(12,2),
    "discount" DECIMAL(5,2),
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "guests" INTEGER NOT NULL DEFAULT 2,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SanghyangPriceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SanghyangPriceSnapshot_roomName_checkIn_checkOut_guests_idx"
  ON "SanghyangPriceSnapshot"("roomName", "checkIn", "checkOut", "guests");
CREATE INDEX "SanghyangPriceSnapshot_observedAt_idx"
  ON "SanghyangPriceSnapshot"("observedAt");
