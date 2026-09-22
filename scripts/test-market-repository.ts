import assert from "node:assert/strict";
import {
  contentHash,
  dedupeKey,
  normalizeTitle,
  normalizeUrl,
} from "../lib/market/normalize";
import { createArticleRepository, type ArticleRepositoryClient } from "../lib/market/article-repository";
import { createSourceRegistry, type SourceRegistryClient } from "../lib/market/source-registry";

assert.equal(normalizeTitle("  Wisata   Anyer\nRamai  "), "wisata anyer ramai");
assert.equal(contentHash("isi artikel"), contentHash("isi artikel"));
assert.equal(normalizeUrl("https://example.com/berita#bagian"), "https://example.com/berita");

const firstKey = dedupeKey({
  sourceId: "source-1",
  title: "  Wisata   Anyer Ramai ",
  canonicalUrl: "https://example.com/berita#bagian",
  publishedAt: new Date("2026-09-22T00:00:00.000Z"),
  content: "isi artikel",
});
const equivalentKey = dedupeKey({
  sourceId: "source-1",
  title: "wisata anyer ramai",
  canonicalUrl: "https://example.com/berita",
  publishedAt: new Date("2026-09-22T00:00:00.000Z"),
  content: "isi artikel",
});
assert.equal(firstKey, equivalentKey);

void (async () => {
const now = new Date("2026-09-22T00:00:00.000Z");
const sources = [
  { id: "source-1", name: "Google News", domain: "news.google.com", category: "news", method: "rss", enabled: true, priority: 0, intervalMinutes: null, lastRunAt: null, lastSuccessAt: null, failureCount: 0, createdAt: now, updatedAt: now },
  { id: "source-2", name: "Manual", domain: "manual.test", category: "event", method: "manual", enabled: false, priority: 0, intervalMinutes: null, lastRunAt: null, lastSuccessAt: null, failureCount: 0, createdAt: now, updatedAt: now },
];
const sourceRegistry = createSourceRegistry({
  source: {
    findMany: async ({ where }: { where?: { category?: string; enabled?: boolean } }) => sources.filter((source) =>
      (!where?.category || source.category === where.category) &&
      (where?.enabled === undefined || source.enabled === where.enabled)),
    update: async ({ where, data }: { where: { id: string }; data: { enabled: boolean } }) => {
      const source = sources.find((item) => item.id === where.id)!;
      source.enabled = data.enabled;
      return source;
    },
  },
} as unknown as SourceRegistryClient);
assert.deepEqual((await sourceRegistry.listSources("news")).map((source) => source.id), ["source-1"]);
assert.deepEqual((await sourceRegistry.getEnabledSources("event")).map((source) => source.id), []);
assert.equal((await sourceRegistry.setSourceEnabled("source-2", true)).enabled, true);
assert.deepEqual((await sourceRegistry.getEnabledSources("event")).map((source) => source.id), ["source-2"]);

const articles: Array<{ id: string; [key: string]: unknown }> = [];
const repository = createArticleRepository({
  article: {
    findUnique: async ({ where }: { where: { canonicalUrl: string } }) =>
      articles.find((article) => article.canonicalUrl === where.canonicalUrl) ?? null,
    findFirst: async ({ where }: { where: { sourceId: string; normalizedTitle: string; publishedAt: Date | null; contentHash: string } }) =>
      articles.find((article) => article.sourceId === where.sourceId && article.normalizedTitle === where.normalizedTitle &&
        (article.publishedAt as Date | null)?.getTime() === where.publishedAt?.getTime() && article.contentHash === where.contentHash) ?? null,
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const article = { id: `article-${articles.length + 1}`, ...data };
      articles.push(article);
      return article;
    },
  },
} as unknown as ArticleRepositoryClient);
const article = { sourceId: "source-1", title: "Original headline", canonicalUrl: "https://example.com/first", normalizedTitle: "original headline", publishedAt: now, content: "same content" };
const saved = await repository.saveArticle(article);
assert.deepEqual(saved, { saved: true, duplicate: false, articleId: "article-1" });
assert.deepEqual(await repository.saveArticle({ ...article, title: "Changed headline" }), { saved: false, duplicate: true, articleId: "article-1" });
assert.deepEqual(await repository.saveArticle({ ...article, canonicalUrl: "https://example.com/second" }), { saved: false, duplicate: true, articleId: "article-1" });
assert.equal(articles.length, 1);
assert.equal(articles[0].title, "Original headline");

console.log("market repository checks passed");
})();
