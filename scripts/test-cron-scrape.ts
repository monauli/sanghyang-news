import assert from "node:assert/strict";
import { NewsRunInProgressError } from "../lib/market/run-news";
import { createCronScrapeHandler } from "../app/api/cron/scrape/route";

const request = (authorization?: string) => new Request("http://localhost/api/cron/scrape", {
  headers: authorization ? { authorization } : undefined,
});

async function main() {
  const run = async () => ({ runId: "run-1", status: "success" });
  const handler = createCronScrapeHandler(run, "cron-secret");
  assert.equal((await handler(request())).status, 401);
  assert.equal((await handler(request("Bearer wrong"))).status, 401);
  const success = await handler(request("Bearer cron-secret"));
  assert.equal(success.status, 200);
  assert.deepEqual(await success.json(), { ok: true, runId: "run-1", status: "success" });

  const locked = await createCronScrapeHandler(async () => { throw new NewsRunInProgressError(); }, "cron-secret")(request("Bearer cron-secret"));
  assert.equal(locked.status, 409);
  assert.deepEqual(await locked.json(), { ok: false, status: "running" });

  const failed = await createCronScrapeHandler(async () => { throw new Error("postgresql://user:password?secret=raw"); }, "cron-secret")(request("Bearer cron-secret"));
  assert.equal(failed.status, 500);
  const body = await failed.json();
  assert.deepEqual(body, { ok: false, status: "failed" });
  assert.ok(!JSON.stringify(body).includes("password"));
  console.log("cron scrape checks passed");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
