import { extractOne, MIN_TEXT, type ExtractResult } from "../extractor";
import { createBrowserFallback, type BrowserFallback } from "./browser-fallback";
import type { ScrapeFailure, ScrapedArticle, Scraper } from "./scraper";

const sourceUrl = (domain: string) => domain.startsWith("http://") || domain.startsWith("https://") ? domain : `https://${domain}`;

const toArticle = (result: ExtractResult): ScrapedArticle | undefined => result.title ? {
  title: result.title,
  canonicalUrl: result.url,
  ...(result.fullText ? { content: result.fullText } : {}),
  ...(result.imageUrl ? { imageUrl: result.imageUrl } : {}),
} : undefined;

export function createHttpScraper({ extract = extractOne, browserFallback = createBrowserFallback(), onError }: {
  extract?: (url: string) => Promise<ExtractResult>;
  browserFallback?: BrowserFallback;
  onError?: (error: ScrapeFailure) => void | Promise<void>;
} = {}): Scraper {
  return {
    async scrape({ source }) {
      const url = sourceUrl(source.domain);
      const result = await extract(url);
      const httpArticle = toArticle(result);
      if ((result.fullText?.length ?? 0) >= MIN_TEXT) return httpArticle ? [httpArticle] : [];

      const fallback = await browserFallback(url);
      if ("article" in fallback) return [fallback.article];
      await onError?.(fallback.error);
      return httpArticle ? [httpArticle] : [];
    },
  };
}
