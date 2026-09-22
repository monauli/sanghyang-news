import type { ScrapeRun, ScrapeRunStatus, Source } from "@/lib/db-types";
import { NewsRunInProgressError, runNewsNow } from "@/lib/market/run-news";
import { listRecentRuns } from "@/lib/market/scrape-log";
import { getEnabledSources } from "@/lib/market/source-registry";

type RunNewsNow = () => Promise<{ runId: string; status: ScrapeRunStatus }>;

const publicSource = (source: Source) => ({
  id: source.id,
  name: source.name,
  domain: safeDomain(source.domain),
  category: source.category,
  enabled: source.enabled,
  priority: source.priority,
  intervalMinutes: source.intervalMinutes,
  lastRunAt: source.lastRunAt,
  lastSuccessAt: source.lastSuccessAt,
  failureCount: source.failureCount,
});

export const publicRun = (run: ScrapeRun) => ({
  id: run.id,
  sourceId: run.sourceId,
  job: run.job,
  status: run.status,
  startedAt: run.startedAt,
  finishedAt: run.finishedAt,
  recordsDiscovered: run.recordsDiscovered,
  recordsSaved: run.recordsSaved,
  duplicates: run.duplicates,
  errors: run.errors,
  createdAt: run.createdAt,
});

function safeDomain(domain: string): string {
  try {
    const url = new URL(domain);
    url.username = "";
    url.password = "";
    return url.toString();
  } catch {
    return domain;
  }
}

export function createAdminScrapingHandlers({
  runNewsNow: start = runNewsNow,
  getEnabledSources: sources = () => getEnabledSources("news"),
  listRecentRuns: runs = () => listRecentRuns(20),
}: {
  runNewsNow?: RunNewsNow;
  getEnabledSources?: () => Promise<Source[]>;
  listRecentRuns?: () => Promise<ScrapeRun[]>;
} = {}) {
  return {
    async GET() {
      return Response.json({ sources: (await sources()).map(publicSource), runs: (await runs()).map(publicRun) });
    },

    async POST(request: Request) {
      const body: unknown = await request.json().catch(() => undefined);
      if (!body || typeof body !== "object" || (body as { job?: unknown }).job !== "news") {
        return Response.json({ error: "Body must be { job: 'news' }." }, { status: 400 });
      }
      try {
        return Response.json(await start(), { status: 202 });
      } catch (error) {
        if (error instanceof NewsRunInProgressError) return Response.json({ error: error.message }, { status: 409 });
        throw error;
      }
    },
  };
}

const handlers = createAdminScrapingHandlers();

export const GET = handlers.GET;
export const POST = handlers.POST;
