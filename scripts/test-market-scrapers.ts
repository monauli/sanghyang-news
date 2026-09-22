import assert from "node:assert/strict";
import type { Source } from "../lib/db-types";
import { extractOne, type ExtractResult } from "../lib/extractor";
import { createBrowserFallback } from "../lib/market/browser-fallback";
import { createHttpScraper } from "../lib/market/http-scraper";
import { createRssScraper } from "../lib/market/rss-scraper";

const source = {
  id: "source-1",
  name: "Example News",
  domain: "https://example.com/article",
  category: "news",
  method: "http",
  enabled: true,
  priority: 0,
  intervalMinutes: null,
  lastRunAt: null,
  lastSuccessAt: null,
  failureCount: 0,
  createdAt: new Date("2026-09-22T00:00:00.000Z"),
  updatedAt: new Date("2026-09-22T00:00:00.000Z"),
} as Source;

const shortExtract: ExtractResult = {
  url: source.domain,
  title: "HTTP headline",
  fullText: "too short",
  imageUrl: null,
  imageWidth: null,
  attempt: "header-lengkap",
  warnings: ["teks-pendek"],
};

void (async () => {
  const rss = createRssScraper({
    now: () => new Date("2026-09-22T12:00:00.000Z"),
    searchAll: async () => ({
      articles: [{
        title: "RSS headline",
        link: "https://news.google.com/rss/articles/example",
        pubDate: "2026-09-21",
        desc: "RSS description",
        sourceName: "Example News",
        sourceUrl: "https://example.com",
        query: "wisata",
      }],
      stats: [],
      failedQueries: 0,
    }),
  });
  assert.deepEqual(await rss.scrape({ source: { ...source, method: "rss" }, runId: "run-1" }), [{
    title: "RSS headline",
    canonicalUrl: "https://news.google.com/rss/articles/example",
    publishedAt: new Date("2026-09-21T00:00:00.000Z"),
    description: "RSS description",
  }]);

  const html = `<html><head><meta property="og:title" content="HTTP headline"></head><body><article>${"market report ".repeat(200)}</article></body></html>`;
  const fetchMock = async () => new Response(html, { status: 200 });
  let browserLaunches = 0;
  const http = createHttpScraper({
    extract: (url) => extractOne(url, fetchMock),
    browserFallback: async () => {
      browserLaunches++;
      return { article: { title: "Rendered headline", canonicalUrl: source.domain, content: "rendered" } };
    },
  });
  const extracted = await http.scrape({ source, runId: "run-2" });
  assert.equal(extracted.length, 1);
  assert.ok((extracted[0].content?.length ?? 0) >= 1500);
  assert.equal(browserLaunches, 0);

  let launches = 0;
  const fallback = createBrowserFallback({
    isSafe: async () => true,
    launch: async () => {
      launches++;
      return {
        newPage: async () => ({
          goto: async () => undefined,
          content: async () => "<html><body><article>Rendered browser article</article></body></html>",
          title: async () => "Rendered headline",
        }),
        close: async () => undefined,
      };
    },
  });
  const shortHttp = createHttpScraper({ extract: async () => shortExtract, browserFallback: fallback });
  assert.deepEqual(await shortHttp.scrape({ source, runId: "run-3" }), [{
    title: "Rendered headline",
    canonicalUrl: source.domain,
    content: "Rendered browser article",
  }]);
  assert.equal(launches, 1);

  let emptyFallbackCalls = 0;
  const emptyHttp = createHttpScraper({
    extract: async () => ({ ...shortExtract, fullText: null }),
    browserFallback: async () => {
      emptyFallbackCalls++;
      return { article: { title: "Rendered empty article", canonicalUrl: source.domain, content: "rendered" } };
    },
  });
  assert.equal((await emptyHttp.scrape({ source, runId: "run-empty" }))[0].title, "Rendered empty article");
  assert.equal(emptyFallbackCalls, 1);

  const browserFailure = createBrowserFallback({
    isSafe: async () => true,
    launch: async () => { throw new Error("Chromium unavailable"); },
  });
  const errors: Array<{ stage: string; url: string; message: string }> = [];
  const failedFallback = createHttpScraper({
    extract: async () => shortExtract,
    browserFallback: browserFailure,
    onError: (error) => { errors.push(error); },
  });
  assert.deepEqual(await failedFallback.scrape({ source, runId: "run-4" }), [{
    title: "HTTP headline",
    canonicalUrl: source.domain,
    content: "too short",
  }]);
  assert.deepEqual(errors, [{ stage: "extract", url: source.domain, message: "Chromium unavailable" }]);

  const closeFailure = createBrowserFallback({
    isSafe: async () => true,
    launch: async () => ({
      newPage: async () => ({
        goto: async () => undefined,
        content: async () => "<html><body>content</body></html>",
        title: async () => "title",
      }),
      close: async () => { throw new Error("close failed"); },
    }),
  });
  assert.deepEqual(await closeFailure(source.domain), {
    error: { stage: "extract", url: source.domain, message: "close failed" },
  });

  let requestHandler: ((request: { url(): string; continue(): Promise<void>; abort(): Promise<void> }) => void | Promise<void>) | undefined;
  let continued = 0;
  let aborted = 0;
  const guardedFallback = createBrowserFallback({
    isSafe: async (url) => url === source.domain,
    launch: async () => ({
      newPage: async () => ({
        setRequestInterception: async () => undefined,
        on: (_event: "request", handler: typeof requestHandler) => { requestHandler = handler; },
        goto: async () => {
          await requestHandler?.({
            url: () => "http://127.0.0.1/private",
            continue: async () => { continued++; },
            abort: async () => { aborted++; },
          });
          throw new Error("navigation blocked");
        },
        content: async () => "",
        title: async () => "",
      }),
      close: async () => undefined,
    }),
  });
  assert.deepEqual(await guardedFallback(source.domain), {
    error: { stage: "extract", url: source.domain, message: "navigation blocked" },
  });
  assert.equal(aborted, 1);
  assert.equal(continued, 0);

  console.log("market scraper checks passed");
})();
