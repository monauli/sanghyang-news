import { extractFromHtml } from "@extractus/article-extractor";
import { alamatAman } from "../urlaman";
import { ai, model } from "../gemini";
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
type Crawl4AIResponse = { markdown?: string; fit_markdown?: string; url?: string; metadata?: { title?: string } };
type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const cleanText = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

async function launchBrowser(): Promise<Browser> {
  const puppeteer = await import("puppeteer");
  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  });
}

/**
 * Native Gemini Structured Article Extractor (Antigravity Native LLM Engine)
 * Membersihkan noise portal berita (iklan, disclaimer, navigasi) dan mengekstrak teks utama.
 */
async function extractWithGemini(rawText: string, fallbackTitle: string): Promise<{ title: string; content: string } | null> {
  if (!process.env.GEMINI_API_KEY) return null;
  try {
    const prompt = `Kamu adalah parser artikel berita. Ekstrak judul dan teks artikel utama dari konten mentah berikut, buang iklan, menu navigasi, dan komentar.
Keluarkan HANYA JSON valid: {"title": "string", "content": "string"}.

<RAW_CONTENT>
${rawText.slice(0, 10_000)}
</RAW_CONTENT>`;

    const res = await ai().models.generateContent({
      model: model(),
      contents: prompt,
    });

    const text = res.text?.trim() || "";
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]) as { title?: unknown; content?: unknown };
      if (typeof parsed.content === "string" && parsed.content.length > 100) {
        return {
          title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : fallbackTitle,
          content: parsed.content.trim(),
        };
      }
    }
  } catch (error) {
    console.warn("[browser-fallback] extractWithGemini notice:", (error as Error).message);
  }
  return null;
}

const crawl4aiArticle = (payload: Crawl4AIResponse, url: string): ScrapedArticle | undefined => {
  const content = payload.fit_markdown || payload.markdown || "";
  const title = payload.metadata?.title || content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return title && content ? { title, canonicalUrl: payload.url || url, content } : undefined;
};

export function createCrawl4AIFallback({ endpoint = process.env.CRAWL4AI_URL, token = process.env.CRAWL4AI_API_TOKEN, fetcher = fetch }: { endpoint?: string; token?: string; fetcher?: Fetcher } = {}): BrowserFallback | undefined {
  if (!endpoint) return undefined;
  return async (url) => {
    try {
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) throw new Error(`Crawl4AI returned ${response.status}`);
      const article = crawl4aiArticle(await response.json() as Crawl4AIResponse, url);
      if (!article) throw new Error("Crawl4AI tidak mengembalikan judul atau isi halaman.");
      return { article };
    } catch (error) {
      return { error: { stage: "extract", url, message: (error as Error).message } };
    }
  };
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
  const crawl4ai = createCrawl4AIFallback();
  return async (url) => {
    if (crawl4ai && await isSafe(url)) {
      const result = await crawl4ai(url);
      if ("article" in result) return result;
    }
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
      let content = extracted?.content ? cleanText(extracted.content) : cleanText(html);
      let title = extracted?.title ?? await page.title();

      if (content && content.length > 50) {
        const geminiCleaned = await extractWithGemini(content, title);
        if (geminiCleaned) {
          title = geminiCleaned.title;
          content = geminiCleaned.content;
        }
      }
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
