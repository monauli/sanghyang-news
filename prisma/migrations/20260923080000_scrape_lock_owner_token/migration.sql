ALTER TABLE "ScrapeLock" ADD COLUMN "ownerToken" TEXT;

UPDATE "ScrapeLock"
SET "ownerToken" = md5(random()::text || clock_timestamp()::text || "job"::text)
WHERE "ownerToken" IS NULL;

ALTER TABLE "ScrapeLock" ALTER COLUMN "ownerToken" SET NOT NULL;
