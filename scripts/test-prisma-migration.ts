import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const path = "prisma/migrations/20260922000000_initial_market_intelligence/migration.sql";
assert.ok(existsSync(path), "initial Prisma migration is checked in");

const sql = readFileSync(path, "utf8");
function table(name: string) {
  const match = sql.match(new RegExp(`CREATE TABLE "${name}" \\(([\\s\\S]*?)\\n\\);`));
  assert.ok(match, `${name} table is created`);
  return match[1];
}

for (const [name, columns] of [
  ["Source", [/"enabled" BOOLEAN NOT NULL DEFAULT true/, /"failureCount" INTEGER NOT NULL DEFAULT 0/]],
  ["Article", [/"sourceId" UUID NOT NULL/, /"canonicalUrl" TEXT/, /"contentHash" TEXT/]],
  ["ScrapeRun", [/"sourceId" UUID NOT NULL/, /"job" "ScrapeJob" NOT NULL/, /"status" "ScrapeRunStatus" NOT NULL DEFAULT 'running'/, /"recordsSaved" INTEGER NOT NULL DEFAULT 0/, /"errors" INTEGER NOT NULL DEFAULT 0/]],
  ["ScrapeError", [/"runId" UUID NOT NULL/, /"sourceId" UUID NOT NULL/, /"stage" "ScrapeStage" NOT NULL/]],
  ["ScrapeLock", [/"job" "ScrapeJob" NOT NULL/, /"acquiredAt" TIMESTAMP\(3\) NOT NULL DEFAULT CURRENT_TIMESTAMP/, /CONSTRAINT "ScrapeLock_pkey" PRIMARY KEY \("job"\)/]],
] as const) for (const column of columns) assert.match(table(name), column, `${name} critical field is preserved`);

for (const relation of [
  /ALTER TABLE "Article" ADD CONSTRAINT "Article_sourceId_fkey" FOREIGN KEY \("sourceId"\) REFERENCES "Source"\("id"\)/,
  /ALTER TABLE "ScrapeRun" ADD CONSTRAINT "ScrapeRun_sourceId_fkey" FOREIGN KEY \("sourceId"\) REFERENCES "Source"\("id"\)/,
  /ALTER TABLE "ScrapeError" ADD CONSTRAINT "ScrapeError_runId_fkey" FOREIGN KEY \("runId"\) REFERENCES "ScrapeRun"\("id"\) ON DELETE CASCADE/,
  /ALTER TABLE "ScrapeError" ADD CONSTRAINT "ScrapeError_sourceId_fkey" FOREIGN KEY \("sourceId"\) REFERENCES "Source"\("id"\)/,
]) assert.match(sql, relation, "critical relation is preserved");

assert.match(sql, /CREATE TYPE "ScrapeRunStatus" AS ENUM \('running', 'success', 'partial', 'failed'\)/, "run statuses are preserved");

console.log("initial Prisma migration check passed");
