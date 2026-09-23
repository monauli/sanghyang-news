ALTER TABLE "Competitor" ADD COLUMN "googleMapsUrl" TEXT;
ALTER TABLE "Competitor" ADD COLUMN "instagramUrl" TEXT;
ALTER TABLE "Competitor" ADD COLUMN "facebookUrl" TEXT;
ALTER TABLE "Competitor" ADD COLUMN "tiktokUrl" TEXT;

ALTER TABLE "CompetitorPriceSnapshot" ADD COLUMN "roomName" TEXT;
ALTER TABLE "CompetitorPriceSnapshot" ADD COLUMN "packageName" TEXT;
UPDATE "CompetitorPriceSnapshot" SET "roomName" = "roomPackage" WHERE "roomName" IS NULL;
ALTER TABLE "CompetitorPriceSnapshot" DROP COLUMN "roomPackage";
