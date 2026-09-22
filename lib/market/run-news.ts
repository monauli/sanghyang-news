import type { ScrapeRun, ScrapeRunStatus, Source } from "../db-types";
import { saveArticle, type SaveArticleResult } from "./article-repository";
import { createHttpScraper } from "./http-scraper";
import { normalizeTitle, type NewArticle } from "./normalize";
import { createRssScraper } from "./rss-scraper";
import { finishRun, recordScrapeError, startRun } from "./scrape-log";
import type { ScrapeContext, ScrapeFailure, ScrapedArticle } from "./scraper";
import { getEnabledSources } from "./source-registry";

const RUNNING_RUN_WINDOW_MS = 15 * 60 * 1000;

export class NewsRunInProgressError extends Error {
  constructor() { super("A news scrape is already running."); }
}

export type RunNewsDependencies = {
  getEnabledSources(): Promise<Source[]>;
  startRun(sourceId: string, job: "news"): Promise<ScrapeRun>;
  finishRun(id: string, result: { status: ScrapeRunStatus; discovered: number; saved: number; duplicates: number; errors: number }): Promise<ScrapeRun>;
  recordScrapeError(input: { runId: string; sourceId: string; url?: string; stage: "fetch" | "parse" | "extract" | "persist"; message: string; statusCode?: number }): Promise<unknown>;
  saveArticle(article: NewArticle): Promise<SaveArticleResult>;
  scrape(context: ScrapeContext, onError: (error: ScrapeFailure) => Promise<void>): Promise<ScrapedArticle[]>;
  hasRecentRunningRun(sourceId: string, since: Date): Promise<boolean>;
  now?(): Date;
};

type SourceResult = { runId: string; status: ScrapeRunStatus };
const messageOf = (error: unknown) => error instanceof Error ? error.message : String(error);

function statusFor(errors: number, saved: number, duplicates: number): ScrapeRunStatus {
  if (!errors) return "success";
  return saved || duplicates ? "partial" : "failed";
}

function overallStatus(results: SourceResult[]): ScrapeRunStatus {
  if (results.every((result) => result.status === "success")) return "success";
  if (results.some((result) => result.status !== "failed")) return "partial";
  return "failed";
}

export function createRunNews(dependencies: RunNewsDependencies) {
  // ponytail: same-process fast path; the durable running-run query covers other instances.
  let running = false;

  async function runSource(source: Source): Promise<SourceResult> {
    const run = await dependencies.startRun(source.id, "news");
    let discovered = 0;
    let saved = 0;
    let duplicates = 0;
    let errors = 0;
    const record = async (input: { stage: "fetch" | "parse" | "extract" | "persist"; message: string; url?: string }) => {
      errors++;
      try { await dependencies.recordScrapeError({ runId: run.id, sourceId: source.id, ...input }); }
      catch { /* finishRun persists the incremented error count if this insert fails. */ }
    };

    try {
      try {
        const articles = await dependencies.scrape({ source, runId: run.id }, record);
        discovered = articles.length;
        for (const article of articles) {
          try {
            const result = await dependencies.saveArticle({
              sourceId: source.id, title: article.title, canonicalUrl: article.canonicalUrl,
              normalizedTitle: normalizeTitle(article.title), publishedAt: article.publishedAt,
              description: article.description, content: article.content, imageUrl: article.imageUrl,
            });
            saved += Number(result.saved);
            duplicates += Number(result.duplicate);
          } catch (error) {
            await record({ stage: "persist", url: article.canonicalUrl, message: messageOf(error) });
          }
        }
      } catch (error) {
        await record({ stage: "fetch", url: source.domain, message: messageOf(error) });
      }
    } finally {
      await dependencies.finishRun(run.id, { status: statusFor(errors, saved, duplicates), discovered, saved, duplicates, errors });
    }
    return { runId: run.id, status: statusFor(errors, saved, duplicates) };
  }

  return {
    async runNewsNow(): Promise<{ runId: string; status: ScrapeRunStatus }> {
      if (running) throw new NewsRunInProgressError();
      running = true;
      try {
        const sources = await dependencies.getEnabledSources();
        const since = new Date((dependencies.now?.() ?? new Date()).getTime() - RUNNING_RUN_WINDOW_MS);
        if ((await Promise.all(sources.map((source) => dependencies.hasRecentRunningRun(source.id, since)))).some(Boolean)) {
          throw new NewsRunInProgressError();
        }
        const results: SourceResult[] = [];
        for (const source of sources) {
          results.push(await runSource(source));
        }
        const first = results[0];
        if (!first) throw new Error("No enabled news source could start a scrape run.");
        return { runId: results.map((result) => result.runId).join(","), status: overallStatus(results) };
      } finally {
        running = false;
      }
    },
  };
}

async function scrape(context: ScrapeContext, onError: (error: ScrapeFailure) => Promise<void>): Promise<ScrapedArticle[]> {
  if (context.source.method === "rss") return createRssScraper().scrape(context);
  if (context.source.method === "http" || context.source.method === "browser") return createHttpScraper({ onError }).scrape(context);
  throw new Error(`Unsupported scrape method: ${context.source.method}`);
}

async function hasRecentRunningRun(sourceId: string, since: Date): Promise<boolean> {
  const { db } = await import("../db");
  return !!await db.scrapeRun.findFirst({ where: { sourceId, job: "news", status: "running", startedAt: { gte: since } } });
}

const runner = createRunNews({ getEnabledSources: () => getEnabledSources("news"), startRun, finishRun, recordScrapeError, saveArticle, scrape, hasRecentRunningRun });

export function runNewsNow(): Promise<{ runId: string; status: ScrapeRunStatus }> {
  return runner.runNewsNow();
}
