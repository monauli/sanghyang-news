import type { ScrapeRun, ScrapeRunStatus, Source } from "../db-types";
import { saveArticle, type SaveArticleResult } from "./article-repository";
import { createHttpScraper } from "./http-scraper";
import { normalizeTitle, type NewArticle } from "./normalize";
import { createRssScraper } from "./rss-scraper";
import { finishRun, recordScrapeError, startRun } from "./scrape-log";
import type { ScrapeContext, ScrapeFailure, ScrapedArticle } from "./scraper";
import { getEnabledSources } from "./source-registry";

export class NewsRunInProgressError extends Error {
  constructor() {
    super("A news scrape is already running.");
  }
}

export type RunNewsDependencies = {
  getEnabledSources(): Promise<Source[]>;
  startRun(sourceId: string, job: "news"): Promise<ScrapeRun>;
  finishRun(id: string, result: { status: ScrapeRunStatus; discovered: number; saved: number; duplicates: number; errors: number }): Promise<ScrapeRun>;
  recordScrapeError(input: { runId: string; sourceId: string; url?: string; stage: "fetch" | "parse" | "extract" | "persist"; message: string; statusCode?: number }): Promise<unknown>;
  saveArticle(article: NewArticle): Promise<SaveArticleResult>;
  scrape(context: ScrapeContext, onError: (error: ScrapeFailure) => Promise<void>): Promise<ScrapedArticle[]>;
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
  // ponytail: process-local lock; use a database lease if this runs on multiple server instances.
  let running = false;

  async function runSource(source: Source): Promise<SourceResult> {
    const run = await dependencies.startRun(source.id, "news");
    let discovered = 0;
    let saved = 0;
    let duplicates = 0;
    let errors = 0;
    const record = async (input: { stage: "fetch" | "parse" | "extract" | "persist"; message: string; url?: string }) => {
      errors++;
      await dependencies.recordScrapeError({ runId: run.id, sourceId: source.id, ...input });
    };

    try {
      const articles = await dependencies.scrape({ source, runId: run.id }, async (error) => record(error));
      discovered = articles.length;
      for (const article of articles) {
        try {
          const result = await dependencies.saveArticle({
            sourceId: source.id,
            title: article.title,
            canonicalUrl: article.canonicalUrl,
            normalizedTitle: normalizeTitle(article.title),
            publishedAt: article.publishedAt,
            description: article.description,
            content: article.content,
            imageUrl: article.imageUrl,
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

    const status = statusFor(errors, saved, duplicates);
    await dependencies.finishRun(run.id, { status, discovered, saved, duplicates, errors });
    return { runId: run.id, status };
  }

  return {
    async runNewsNow(): Promise<{ runId: string; status: ScrapeRunStatus }> {
      if (running) throw new NewsRunInProgressError();
      running = true;
      try {
        const sources = await dependencies.getEnabledSources();
        const results: SourceResult[] = [];
        for (const source of sources) {
          try {
            results.push(await runSource(source));
          } catch {
            // A database failure before a run exists cannot be recorded against that run.
          }
        }
        const first = results[0];
        if (!first) throw new Error("No enabled news source could start a scrape run.");
        return { runId: first.runId, status: overallStatus(results) };
      } finally {
        running = false;
      }
    },
  };
}

async function scrape(context: ScrapeContext, onError: (error: ScrapeFailure) => Promise<void>): Promise<ScrapedArticle[]> {
  if (context.source.method === "rss") return createRssScraper().scrape(context);
  if (context.source.method === "http" || context.source.method === "browser") {
    return createHttpScraper({ onError }).scrape(context);
  }
  throw new Error(`Unsupported scrape method: ${context.source.method}`);
}

const runner = createRunNews({ getEnabledSources: () => getEnabledSources("news"), startRun, finishRun, recordScrapeError, saveArticle, scrape });

export function runNewsNow(): Promise<{ runId: string; status: ScrapeRunStatus }> {
  return runner.runNewsNow();
}
