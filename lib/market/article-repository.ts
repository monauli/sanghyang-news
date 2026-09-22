import type { NewArticle } from "./normalize";
import { dedupeKey } from "./normalize";

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
      const byUrl = await client.article.findUnique({ where: { canonicalUrl: article.canonicalUrl } });
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

      const saved = await client.article.create({ data: { ...article, contentHash: fingerprint } });
      return { saved: true, duplicate: false, articleId: saved.id };
    },
  };
}

export async function saveArticle(article: NewArticle): Promise<SaveArticleResult> {
  const { db } = await import("../db");
  return createArticleRepository(db).saveArticle(article);
}
