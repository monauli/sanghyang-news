-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SourceCategory" AS ENUM ('news', 'fnb', 'event', 'competitor', 'review');

-- CreateEnum
CREATE TYPE "ScrapeMethod" AS ENUM ('rss', 'http', 'browser', 'manual');

-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('discovered', 'extracted', 'failed', 'duplicate');

-- CreateEnum
CREATE TYPE "ScrapeJob" AS ENUM ('news');

-- CreateEnum
CREATE TYPE "ScrapeRunStatus" AS ENUM ('running', 'success', 'partial', 'failed');

-- CreateEnum
CREATE TYPE "ScrapeStage" AS ENUM ('fetch', 'parse', 'extract', 'persist');

-- CreateTable
CREATE TABLE "Source" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "category" "SourceCategory" NOT NULL,
    "method" "ScrapeMethod" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "intervalMinutes" INTEGER,
    "lastRunAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "canonicalUrl" TEXT,
    "normalizedTitle" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "description" TEXT,
    "content" TEXT,
    "imageUrl" TEXT,
    "contentHash" TEXT,
    "status" "ArticleStatus" NOT NULL DEFAULT 'discovered',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapeRun" (
    "id" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "job" "ScrapeJob" NOT NULL,
    "status" "ScrapeRunStatus" NOT NULL DEFAULT 'running',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "recordsDiscovered" INTEGER NOT NULL DEFAULT 0,
    "recordsSaved" INTEGER NOT NULL DEFAULT 0,
    "duplicates" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrapeRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapeError" (
    "id" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "url" TEXT,
    "stage" "ScrapeStage" NOT NULL,
    "message" TEXT NOT NULL,
    "statusCode" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrapeError_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapeLock" (
    "job" "ScrapeJob" NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrapeLock_pkey" PRIMARY KEY ("job")
);

-- CreateIndex
CREATE INDEX "Source_category_enabled_idx" ON "Source"("category", "enabled");

-- CreateIndex
CREATE INDEX "Source_enabled_priority_idx" ON "Source"("enabled", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "Source_domain_method_key" ON "Source"("domain", "method");

-- CreateIndex
CREATE UNIQUE INDEX "Article_canonicalUrl_key" ON "Article"("canonicalUrl");

-- CreateIndex
CREATE UNIQUE INDEX "Article_contentHash_key" ON "Article"("contentHash");

-- CreateIndex
CREATE INDEX "Article_sourceId_normalizedTitle_publishedAt_idx" ON "Article"("sourceId", "normalizedTitle", "publishedAt");

-- CreateIndex
CREATE INDEX "Article_sourceId_contentHash_idx" ON "Article"("sourceId", "contentHash");

-- CreateIndex
CREATE INDEX "Article_status_createdAt_idx" ON "Article"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ScrapeRun_sourceId_createdAt_idx" ON "ScrapeRun"("sourceId", "createdAt");

-- CreateIndex
CREATE INDEX "ScrapeRun_status_createdAt_idx" ON "ScrapeRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ScrapeError_runId_createdAt_idx" ON "ScrapeError"("runId", "createdAt");

-- CreateIndex
CREATE INDEX "ScrapeError_sourceId_createdAt_idx" ON "ScrapeError"("sourceId", "createdAt");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrapeRun" ADD CONSTRAINT "ScrapeRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrapeError" ADD CONSTRAINT "ScrapeError_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ScrapeRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrapeError" ADD CONSTRAINT "ScrapeError_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
