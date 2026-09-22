import { extractFromHtml } from "@extractus/article-extractor";
import { alamatAman } from "../urlaman";
import type { ScrapeFailure, ScrapedArticle } from "./scraper";

type BrowserPage = {
  goto(url: string, options: { waitUntil: "networkidle2"; timeout: number }): Promise<unknown>;
  content(): Promise<string>;
  title(): Promise<string>;
  setRequestInterception?(enabled: boolean): Promise<void>;
  on?(event: "request", handler: (request: BrowserRequest) => void | Promise<void>): void;
};

type BrowserRequest = {
  url(): string;
  continue(): Promise<void>;
  abort(): Promise<void>;
};

type Browser = {
  newPage(): Promise<BrowserPage>;
  close(): Promise<void>;
};

export type BrowserLauncher = () => Promise<Browser>;
export type BrowserFallbackResult = { article: ScrapedArticle } | { error: ScrapeFailure };
export type BrowserFallback = (url: string) => Promise<BrowserFallbackResult>;

const cleanText = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

async function launchBrowser(): Promise<Browser> {
  return (await import("puppeteer")).launch({ headless: true });
}

async function guardBrowserRequests(page: BrowserPage, isSafe: (url: string) => Promise<boolean>) {
  if (!page.setRequestInterception || !page.on) return;
  await page.setRequestInterception(true);
  page.on("request", async (request) => {
    try {
      await (await isSafe(request.url()) ? request.continue() : request.abort());
    } catch {
      await request.abort().catch(() => undefined);
    }
  });
}

export function createBrowserFallback({ launch = launchBrowser, isSafe = alamatAman }: { launch?: BrowserLauncher; isSafe?: (url: string) => Promise<boolean> } = {}): BrowserFallback {
  return async (url) => {
    let browser: Browser | undefined;
    let result: BrowserFallbackResult;
    try {
      if (!(await isSafe(url))) throw new Error("alamat tidak diizinkan");
      browser = await launch();
      const page = await browser.newPage();
      await guardBrowserRequests(page, isSafe);
      await page.goto(url, { waitUntil: "networkidle2", timeout: 15_000 });
      const html = await page.content();
      const extracted = await extractFromHtml(html, url);
      const content = extracted?.content ? cleanText(extracted.content) : cleanText(html);
      const title = extracted?.title ?? await page.title();
      result = { article: { title, canonicalUrl: url, ...(content ? { content } : {}) } };
    } catch (error) {
      result = { error: { stage: "extract", url, message: (error as Error).message } };
    }
    try {
      await browser?.close();
    } catch (error) {
      result = { error: { stage: "extract", url, message: (error as Error).message } };
    }
    return result;
  };
}
