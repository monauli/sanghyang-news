import type { ScrapeError, ScrapeRun } from "@/lib/db-types";
import { publicRun } from "../route";

type RunDetails = ScrapeRun & { scrapeErrors: ScrapeError[] };

function publicError(error: ScrapeError) {
  return {
    id: error.id,
    runId: error.runId,
    sourceId: error.sourceId,
    url: error.url ? redact(error.url) : null,
    stage: error.stage,
    message: redact(error.message),
    statusCode: error.statusCode,
    createdAt: error.createdAt,
  };
}

function redact(value: string): string {
  return value
    .replace(/(https?:\/\/)[^\s/@]+@/gi, "$1[redacted]@")
    .replace(/([?&](?:api[_-]?key|token|password|secret)=)[^&\s]+/gi, "$1[redacted]");
}

async function getRun(runId: string): Promise<RunDetails | null> {
  const { db } = await import("@/lib/db");
  return db.scrapeRun.findUnique({ where: { id: runId }, include: { scrapeErrors: true } });
}

export function createRunDetailsHandler({ getRun: find = getRun }: { getRun?: (runId: string) => Promise<RunDetails | null> } = {}) {
  return {
    async GET(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
      const run = await find((await params).runId);
      if (!run) return Response.json({ error: "Scrape run not found." }, { status: 404 });
      return Response.json({ run: publicRun(run), errors: run.scrapeErrors.map(publicError) });
    },
  };
}

export const GET = createRunDetailsHandler().GET;
