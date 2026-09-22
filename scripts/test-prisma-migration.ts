import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const path = "prisma/migrations/20260922000000_initial_market_intelligence/migration.sql";
assert.ok(existsSync(path), "initial Prisma migration is checked in");

const sql = readFileSync(path, "utf8");
for (const table of ["Source", "Article", "ScrapeRun", "ScrapeError", "ScrapeLock"]) {
  assert.match(sql, new RegExp(`CREATE TABLE "${table}"`), `${table} table is created`);
}

console.log("initial Prisma migration check passed");
