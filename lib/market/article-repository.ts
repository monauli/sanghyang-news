import type { NewArticle } from "./normalize";
import { dedupeKey, normalizeUrl } from "./normalize";
import { fallbackClassification, isMarketRelevant } from "./classifier";

export type SaveArticleResult = { saved: boolean; duplicate: boolean; articleId: string };

type StoredArticle = { id: string };

export type ArticleRepositoryClient = {
  article: {
    findUnique(args: { where: { canonicalUrl: string } }): Promise<StoredArticle | null>;
    findFirst(args: { where: { sourceId: string; normalizedTitle: string; publishedAt: Date | null; contentHash: string } }): Promise<StoredArticle | null>;
    create(args: { data: NewArticle & { contentHash: string } }): Promise<StoredArticle>;
  };
};

export function createArticleRepository(client: ArticleRepositoryClient) {
  return {
    async saveArticle(article: NewArticle): Promise<SaveArticleResult> {
      const canonicalUrl = normalizeUrl(article.canonicalUrl);
      const byUrl = await client.article.findUnique({ where: { canonicalUrl } });
      if (byUrl) return { saved: false, duplicate: true, articleId: byUrl.id };

      const fingerprint = dedupeKey(article);
      const byFingerprint = await client.article.findFirst({
        where: {
          sourceId: article.sourceId,
          normalizedTitle: article.normalizedTitle,
          publishedAt: article.publishedAt ?? null,
          contentHash: fingerprint,
        },
      });
      if (byFingerprint) return { saved: false, duplicate: true, articleId: byFingerprint.id };

      try {
        const saved = await client.article.create({ data: { ...article, canonicalUrl, contentHash: fingerprint } });
        return { saved: true, duplicate: false, articleId: saved.id };
      } catch (error) {
        if ((error as { code?: string }).code !== "P2002") throw error;
        const existing = await client.article.findUnique({ where: { canonicalUrl } });
        if (!existing) throw error;
        return { saved: false, duplicate: true, articleId: existing.id };
      }
    },
  };
}

export async function saveArticle(article: NewArticle): Promise<SaveArticleResult> {
  const { db } = await import("../db");
  const result = await createArticleRepository(db).saveArticle(article);
  if (result.saved) {
    // ponytail: local classification keeps the nightly batch bounded; use the manual enrich route for Gemini detail.
    const classificationInput = { title: article.title, text: article.content ?? article.description ?? "" };
    if (!isMarketRelevant(classificationInput)) return result;
    const classification = fallbackClassification(classificationInput);
    const location = ["anyer", "carita", "cinangka", "cikoneng", "serang", "cilegon", "banten"].find((x) => `${article.title} ${article.description ?? ""}`.toLowerCase().includes(x)) ?? null;
    await db.marketItem.upsert({
      where: { articleId: result.articleId },
      create: { articleId: result.articleId, kind: classification.kind, location, description: classification.description ?? article.description ?? null, targetAudience: classification.targetAudience, relevanceScore: classification.relevanceScore, tags: classification.tags },
      update: { kind: classification.kind, location, description: classification.description ?? article.description ?? null, targetAudience: classification.targetAudience, relevanceScore: classification.relevanceScore, tags: classification.tags },
    });
  }
  return result;
}
