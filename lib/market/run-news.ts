import type { ScrapeRun, ScrapeRunStatus, Source } from "../db-types";
import { saveArticle, type SaveArticleResult } from "./article-repository";
import { createHttpScraper } from "./http-scraper";
import { normalizeTitle, type NewArticle } from "./normalize";
import { createRssScraper } from "./rss-scraper";
import { finishRun, recordScrapeError, startRun } from "./scrape-log";
import type { ScrapeContext, ScrapeFailure, ScrapedArticle } from "./scraper";
import { getEnabledSources } from "./source-registry";

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
  claimNewsRun(): Promise<boolean>;
  releaseNewsRun(): Promise<void>;
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
    const result = () => ({ status: statusFor(errors, saved, duplicates), discovered, saved, duplicates, errors });

    try {
      try {
        const articles = await dependencies.scrape({ source, runId: run.id }, record);
        discovered = articles.length;
        for (const article of articles) {
          try {
            const savedArticle = await dependencies.saveArticle({
              sourceId: source.id, title: article.title, canonicalUrl: article.canonicalUrl,
              normalizedTitle: normalizeTitle(article.title), publishedAt: article.publishedAt,
              description: article.description, content: article.content, imageUrl: article.imageUrl,
            });
            saved += Number(savedArticle.saved);
            duplicates += Number(savedArticle.duplicate);
          } catch (error) {
            await record({ stage: "persist", url: article.canonicalUrl, message: messageOf(error) });
          }
        }
      } catch (error) {
        await record({ stage: "fetch", url: source.domain, message: messageOf(error) });
      }
      await dependencies.finishRun(run.id, result());
    } catch (error) {
      await record({ stage: "persist", message: messageOf(error) });
      await dependencies.finishRun(run.id, { ...result(), status: "failed" });
      return { runId: run.id, status: "failed" };
    }
    return { runId: run.id, status: result().status };
  }

  return {
    async runNewsNow(): Promise<{ runId: string; status: ScrapeRunStatus }> {
      if (running) throw new NewsRunInProgressError();
      running = true;
      let claimed = false;
      try {
        if (!await dependencies.claimNewsRun()) throw new NewsRunInProgressError();
        claimed = true;
        const results: SourceResult[] = [];
        for (const source of await dependencies.getEnabledSources()) {
          try { results.push(await runSource(source)); }
          catch { /* No run exists when startRun itself fails; continue to the next source. */ }
        }
        const first = results[0];
        if (!first) throw new Error("No enabled news source could start a scrape run.");
        return { runId: results.map((item) => item.runId).join(","), status: overallStatus(results) };
      } finally {
        try { if (claimed) await dependencies.releaseNewsRun(); }
        finally { running = false; }
      }
    },
  };
}

async function scrape(context: ScrapeContext, onError: (error: ScrapeFailure) => Promise<void>): Promise<ScrapedArticle[]> {
  if (context.source.method === "rss") return createRssScraper().scrape(context);
  if (context.source.method === "http" || context.source.method === "browser") return createHttpScraper({ onError }).scrape(context);
  throw new Error(`Unsupported scrape method: ${context.source.method}`);
}

async function claimNewsRun(): Promise<boolean> {
  const { db } = await import("../db");
  try {
    await db.scrapeLock.create({ data: { job: "news" } });
    return true;
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return false;
    throw error;
  }
}

async function releaseNewsRun(): Promise<void> {
  const { db } = await import("../db");
  await db.scrapeLock.delete({ where: { job: "news" } });
}

const runner = createRunNews({ getEnabledSources: () => getEnabledSources("news"), startRun, finishRun, recordScrapeError, saveArticle, scrape, claimNewsRun, releaseNewsRun });

export function runNewsNow(): Promise<{ runId: string; status: ScrapeRunStatus }> {
  return runner.runNewsNow();
}
