import assert from "node:assert/strict";
import { createScrapeLog, type ScrapeLogClient } from "../lib/market/scrape-log";

type Run = {
  id: string;
  sourceId: string;
  job: "news";
  status: "running" | "success" | "partial" | "failed";
  startedAt: Date;
  finishedAt: Date | null;
  recordsDiscovered: number;
  recordsSaved: number;
  duplicates: number;
  errors: number;
};

const runs: Run[] = [];
const errors: Array<Record<string, unknown>> = [];
const sources = new Map([["source-1", { lastRunAt: null as Date | null, lastSuccessAt: null as Date | null, failureCount: 2 }]]);

const log = createScrapeLog({
  scrapeRun: {
    create: async ({ data }: { data: Pick<Run, "sourceId" | "job"> }) => {
      const run: Run = { id: `run-${runs.length + 1}`, ...data, status: "running", startedAt: new Date(), finishedAt: null, recordsDiscovered: 0, recordsSaved: 0, duplicates: 0, errors: 0 };
      runs.push(run);
      return run;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<Run> | { errors: { increment: number } } }) => {
      const run = runs.find((item) => item.id === where.id)!;
      if ("errors" in data && typeof data.errors === "object") run.errors += data.errors.increment;
      else Object.assign(run, data);
      return run;
    },
    findMany: async ({ take }: { take: number }) => [...runs].reverse().slice(0, take),
  },
  scrapeError: {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const error = { id: `error-${errors.length + 1}`, ...data };
      errors.push(error);
      return error;
    },
  },
  source: {
    update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const source = sources.get(where.id)!;
      if (typeof data.failureCount === "object") {
        source.failureCount += (data.failureCount as { increment: number }).increment;
      } else {
        Object.assign(source, data);
      }
      return source;
    },
  },
  $transaction: async (work: (client: unknown) => Promise<unknown>) => work({
    scrapeRun: {
      update: async ({ where, data }: { where: { id: string }; data: { errors: { increment: number } } }) => {
        const run = runs.find((item) => item.id === where.id)!;
        run.errors += data.errors.increment;
        return run;
      },
    },
    scrapeError: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const error = { id: `error-${errors.length + 1}`, ...data };
        errors.push(error);
        return error;
      },
    },
  }),
} as unknown as ScrapeLogClient);

void (async () => {
  const successful = await log.startRun("source-1", "news");
  const completed = await log.finishRun(successful.id, { status: "success", discovered: 8, saved: 6, duplicates: 2, errors: 0 });
  assert.deepEqual({ status: completed.status, discovered: completed.recordsDiscovered, saved: completed.recordsSaved, duplicates: completed.duplicates, errors: completed.errors }, { status: "success", discovered: 8, saved: 6, duplicates: 2, errors: 0 });
  assert.equal(sources.get("source-1")!.failureCount, 0);
  assert.ok(sources.get("source-1")!.lastRunAt);
  assert.ok(sources.get("source-1")!.lastSuccessAt);

  const partial = await log.startRun("source-1", "news");
  const error = await log.recordScrapeError({ runId: partial.id, sourceId: "source-1", stage: "extract", message: `  failed\n${"x".repeat(600)}\u0000` });
  assert.equal(partial.errors, 1);
  const partialCompleted = await log.finishRun(partial.id, { status: "partial", discovered: 4, saved: 3, duplicates: 0, errors: 1 });
  assert.deepEqual({ status: partialCompleted.status, saved: partialCompleted.recordsSaved, errors: partialCompleted.errors }, { status: "partial", saved: 3, errors: 1 });
  assert.equal(errors.length, 1);
  assert.equal(error.message.length, 500);
  assert.ok(!/[\r\n\u0000]/.test(error.message));
  assert.equal(sources.get("source-1")!.failureCount, 1);

  assert.deepEqual((await log.listRecentRuns(1)).map((run) => run.id), [partial.id]);
  console.log("scrape log checks passed");
})();
