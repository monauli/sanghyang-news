import type { ScrapeRun, ScrapeRunStatus, Source } from "@/lib/db-types";
import { NewsRunInProgressError, runNewsNow } from "@/lib/market/run-news";
import { listRecentRuns } from "@/lib/market/scrape-log";
import { getEnabledSources } from "@/lib/market/source-registry";
import { after } from "next/server";

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
  collectHotelRates = async () => {
    const { collectGoogleHotelMarketRates } = await import("@/lib/market/collect-rates");
    return collectGoogleHotelMarketRates();
  },
  getEnabledSources: sources = () => getEnabledSources("news"),
  listRecentRuns: runs = () => listRecentRuns(20),
  ensureNewsSource = async () => {
    const { db } = await import("@/lib/db");
    await db.source.upsert({
      where: { domain_method: { domain: "news.google.com", method: "rss" } },
      update: { enabled: true, name: "Google News" },
      create: { name: "Google News", domain: "news.google.com", category: "news", method: "rss", enabled: true },
    });
  },
}: {
  runNewsNow?: RunNewsNow;
  collectHotelRates?: () => Promise<Array<{ hotel: string; price: number; currency: string; sourceUrl: string }>>;
  getEnabledSources?: () => Promise<Source[]>;
  listRecentRuns?: () => Promise<ScrapeRun[]>;
  ensureNewsSource?: () => Promise<void>;
} = {}) {
  return {
    async GET() {
      await ensureNewsSource();
      const { db } = await import("@/lib/db");
      const [sanghyangLatest, competitorRates] = await Promise.all([
        db.sanghyangPriceSnapshot.findFirst({
          where: { packageName: "Google Hotels displayed rate" },
          orderBy: { observedAt: "desc" },
        }),
        db.competitorPriceSnapshot.findMany({
          where: { packageName: "Google Hotels displayed rate" },
          include: { competitor: { select: { name: true } } },
          orderBy: { observedAt: "desc" },
        }),
      ]);

      const hotelRates = [
        ...(sanghyangLatest
          ? [{
              hotel: "Sanghyang",
              price: Number(sanghyangLatest.price),
              currency: sanghyangLatest.currency,
              observedAt: sanghyangLatest.observedAt.toISOString(),
              sourceUrl: sanghyangLatest.sourceUrl,
            }]
          : []),
        ...competitorRates.map((c) => ({
          hotel: c.competitor?.name ?? "Kompetitor",
          price: Number(c.price),
          currency: c.currency,
          observedAt: c.observedAt.toISOString(),
          sourceUrl: c.sourceUrl,
        })),
      ];

      return Response.json({
        sources: (await sources()).map(publicSource),
        runs: (await runs()).map(publicRun),
        hotelRates,
      });
    },

    async POST(request: Request) {
      await ensureNewsSource();
      const body: unknown = await request.json().catch(() => undefined);
      const job = (body && typeof body === "object" && typeof (body as { job?: unknown }).job === "string")
        ? (body as { job: string }).job
        : undefined;

      if (!job || (job !== "news" && job !== "rates" && job !== "all")) {
        return Response.json({ error: "Body must be { job: 'news' | 'rates' | 'all' }." }, { status: 400 });
      }

      if (job === "rates") {
        try {
          const rates = await collectHotelRates();
          return Response.json({ job: "rates", status: "success", rates }, { status: 200 });
        } catch (error) {
          console.error("Rates scraping error:", error);
          return Response.json({ job: "rates", status: "failed", error: String(error) }, { status: 500 });
        }
      }

      try {
        const task = (async () => {
          const newsRes = await start();
          // Concurrently or immediately after news run, refresh hotel market rates
          await collectHotelRates().catch((err) => {
            console.error("Background hotel rates crawl failed:", err);
          });
          return newsRes;
        })();

        try {
          after(async () => { await task.catch(() => undefined); });
          return Response.json({ runId: "pending", status: "running" }, { status: 202 });
        } catch {
          return Response.json(await task, { status: 202 });
        }
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
