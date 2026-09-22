import assert from "node:assert/strict";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import type { Source } from "../lib/db-types";
import { createRunNews, NewsRunInProgressError } from "../lib/market/run-news";
import { createAdminScrapingHandlers } from "../app/api/admin/scraping/route";
import { createRunDetailsHandler } from "../app/api/admin/scraping/[runId]/route";

const now = new Date("2026-09-22T00:00:00.000Z");
const source = (id: string, domain = `${id}.example.com`): Source => ({
  id,
  name: id,
  domain,
  category: "news",
  method: "rss",
  enabled: true,
  priority: 0,
  intervalMinutes: null,
  lastRunAt: null,
  lastSuccessAt: null,
  failureCount: 0,
  createdAt: now,
  updatedAt: now,
});

function createRunner(
  sources: Source[],
  scrape: (id: string) => Promise<Array<{ title: string; canonicalUrl: string }>>,
  { hasRecentRunningRun = async () => false, recordError }: { hasRecentRunningRun?: (sourceId: string) => Promise<boolean>; recordError?: (error: Record<string, unknown>) => Promise<void> } = {},
) {
  const runs: Array<Record<string, unknown>> = [];
  const errors: Array<Record<string, unknown>> = [];
  const saved: Array<Record<string, unknown>> = [];
  const runner = createRunNews({
    getEnabledSources: async () => sources,
    startRun: async (sourceId) => {
      const run = { id: `run-${runs.length + 1}`, sourceId, status: "running", recordsDiscovered: 0, recordsSaved: 0, duplicates: 0, errors: 0 };
      runs.push(run);
      return run as never;
    },
    finishRun: async (id, result) => {
      const run = runs.find((item) => item.id === id)!;
      Object.assign(run, { status: result.status, recordsDiscovered: result.discovered, recordsSaved: result.saved, duplicates: result.duplicates, errors: result.errors });
      return run as never;
    },
    recordScrapeError: async (error) => {
      errors.push(error);
      await recordError?.(error);
      return error as never;
    },
    saveArticle: async (article) => {
      saved.push(article);
      return { saved: true, duplicate: false, articleId: `article-${saved.length}` };
    },
    scrape: async ({ source: current }) => scrape(current.id),
    hasRecentRunningRun,
  });
  return { runner, runs, errors, saved };
}

async function freePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close((error) => error ? reject(error) : resolve((address as { port: number }).port));
    });
  });
}

async function assertUnsupportedMethodReturns405() {
  const port = await freePort();
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", String(port)], {
    cwd: process.cwd(),
    env: { ...process.env, APP_PASSWORD: "admin-scraping-check" },
    stdio: "ignore",
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        const ready = await fetch(`${base}/api/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: "admin-scraping-check" }) });
        if (ready.ok) {
          const response = await fetch(`${base}/api/admin/scraping`, { method: "PUT", headers: { Cookie: ready.headers.get("set-cookie")?.split(";")[0] ?? "" } });
          assert.equal(response.status, 405);
          return;
        }
      } catch {
        // The Next dev server has not finished compiling yet.
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("Next dev server did not become ready");
  } finally {
    child.kill();
    await new Promise((resolve) => child.once("exit", resolve));
  }
}

void (async () => {
  const successful = createRunner([source("source-1")], async () => [{ title: "Market headline", canonicalUrl: "https://example.com/article" }]);
  assert.deepEqual(await successful.runner.runNewsNow(), { runId: "run-1", status: "success" });
  assert.deepEqual(successful.runs[0], { id: "run-1", sourceId: "source-1", status: "success", recordsDiscovered: 1, recordsSaved: 1, duplicates: 0, errors: 0 });
  assert.equal(successful.saved.length, 1);

  const partial = createRunner([source("source-1"), source("source-2")], async (id) => {
    if (id === "source-1") throw new Error("feed unavailable");
    return [{ title: "Second source", canonicalUrl: "https://example.com/second" }];
  });
  assert.deepEqual(await partial.runner.runNewsNow(), { runId: "run-1,run-2", status: "partial" });
  assert.equal(partial.runs[0].status, "failed");
  assert.equal(partial.runs[1].status, "success");
  assert.equal(partial.errors.length, 1);

  const databaseBlocked = createRunner([source("source-1")], async () => [], { hasRecentRunningRun: async () => true });
  await assert.rejects(() => databaseBlocked.runner.runNewsNow(), NewsRunInProgressError);
  assert.equal(databaseBlocked.runs.length, 0);

  const finalizesAfterErrorLogFailure = createRunner(
    [source("source-1")],
    async () => { throw new Error("source failed"); },
    { recordError: async () => { throw new Error("log unavailable"); } },
  );
  assert.deepEqual(await finalizesAfterErrorLogFailure.runner.runNewsNow(), { runId: "run-1", status: "failed" });
  assert.equal(finalizesAfterErrorLogFailure.runs[0].status, "failed");

  let release!: () => void;
  const blocked = createRunner([source("source-1")], async () => await new Promise((resolve) => { release = () => resolve([{ title: "Blocked", canonicalUrl: "https://example.com/blocked" }]); }));
  const firstRun = blocked.runner.runNewsNow();
  await Promise.resolve();
  await assert.rejects(() => blocked.runner.runNewsNow(), NewsRunInProgressError);
  release();
  await firstRun;

  const handlers = createAdminScrapingHandlers({
    runNewsNow: async () => ({ runId: "run-1", status: "success" }),
    getEnabledSources: async () => [source("source-1", "https://user:password@example.com")],
    listRecentRuns: async () => [],
  });
  assert.equal((await handlers.POST(new Request("https://example.com/api/admin/scraping", { method: "POST", body: "not json" }))).status, 400);
  const started = await handlers.POST(new Request("https://example.com/api/admin/scraping", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job: "news" }) }));
  assert.deepEqual(await started.json(), { runId: "run-1", status: "success" });
  const listed = await handlers.GET();
  assert.equal((await listed.json()).sources[0].domain, "https://example.com/");

  const busy = createAdminScrapingHandlers({
    runNewsNow: async () => { throw new NewsRunInProgressError(); },
    getEnabledSources: async () => [],
    listRecentRuns: async () => [],
  });
  assert.equal((await busy.POST(new Request("https://example.com/api/admin/scraping", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job: "news" }) }))).status, 409);

  const details = createRunDetailsHandler({
    getRuns: async () => ([{ ...successful.runs[0], startedAt: now, finishedAt: now, createdAt: now, job: "news", scrapeErrors: [{ id: "error-1", runId: "run-1", sourceId: "source-1", stage: "fetch", message: "postgresql://admin:password@db.example/news?access_token=secret Authorization: Bearer header Cookie: session=abc", statusCode: null, createdAt: now }] }] as never),
  });
  const detail = await details.GET(new Request("https://example.com/api/admin/scraping/run-1"), { params: Promise.resolve({ runId: "run-1" }) });
  const body = await detail.json();
  for (const secret of ["postgresql://", "password", "secret", "Bearer header", "session=abc"]) assert.ok(!JSON.stringify(body).includes(secret));

  const aggregateDetails = createRunDetailsHandler({
    getRuns: async () => ([
      { ...partial.runs[0], startedAt: now, finishedAt: now, createdAt: now, job: "news", scrapeErrors: [] },
      { ...partial.runs[1], startedAt: now, finishedAt: now, createdAt: now, job: "news", scrapeErrors: [] },
    ] as never),
  });
  const aggregate = await aggregateDetails.GET(new Request("https://example.com/api/admin/scraping/run-1,run-2"), { params: Promise.resolve({ runId: "run-1,run-2" }) });
  assert.equal((await aggregate.json()).run.status, "partial");

  await assertUnsupportedMethodReturns405();
  console.log("admin scraping checks passed");
})();
