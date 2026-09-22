import type { ScrapeError, ScrapeRun } from "@/lib/db-types";
import { sanitizeScrapeError } from "@/lib/market/scrape-log";
import { publicRun } from "../route";

type RunDetails = ScrapeRun & { scrapeErrors: ScrapeError[] };

function publicError(error: ScrapeError) {
  return {
    id: error.id, runId: error.runId, sourceId: error.sourceId,
    url: error.url ? sanitizeScrapeError(error.url).replace(/(https?:\/\/)[^\s/@]+@/gi, "$1[redacted]@") : null,
    stage: error.stage, message: sanitizeScrapeError(error.message), statusCode: error.statusCode, createdAt: error.createdAt,
  };
}

async function getRuns(runIds: string[]): Promise<RunDetails[]> {
  const { db } = await import("@/lib/db");
  return db.scrapeRun.findMany({ where: { id: { in: runIds } }, include: { scrapeErrors: true } });
}

function aggregateRun(id: string, runs: RunDetails[]) {
  const first = runs[0];
  const status = runs.every((run) => run.status === "success") ? "success"
    : runs.some((run) => run.status === "running") ? "running"
    : runs.some((run) => run.status !== "failed") ? "partial" : "failed";
  return {
    ...publicRun(first), id, sourceId: runs.length === 1 ? first.sourceId : null,
    sourceIds: runs.map((run) => run.sourceId), status,
    startedAt: new Date(Math.min(...runs.map((run) => run.startedAt.getTime()))),
    finishedAt: runs.some((run) => !run.finishedAt) ? null : new Date(Math.max(...runs.map((run) => run.finishedAt!.getTime()))),
    recordsDiscovered: runs.reduce((total, run) => total + run.recordsDiscovered, 0),
    recordsSaved: runs.reduce((total, run) => total + run.recordsSaved, 0),
    duplicates: runs.reduce((total, run) => total + run.duplicates, 0),
    errors: runs.reduce((total, run) => total + run.errors, 0),
  };
}

export function createRunDetailsHandler({ getRuns: find = getRuns }: { getRuns?: (runIds: string[]) => Promise<RunDetails[]> } = {}) {
  return {
    async GET(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
      const { runId } = await params;
      const runIds = [...new Set(runId.split(",").filter(Boolean))];
      const runs = await find(runIds);
      if (!runIds.length || runs.length !== runIds.length) return Response.json({ error: "Scrape run not found." }, { status: 404 });
      return Response.json({ run: aggregateRun(runId, runs), errors: runs.flatMap((run) => run.scrapeErrors.map(publicError)) });
    },
  };
}

export const GET = createRunDetailsHandler().GET;
