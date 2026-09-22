import { createHash } from "node:crypto";

export type NewArticle = {
  sourceId: string;
  title: string;
  canonicalUrl: string;
  normalizedTitle: string;
  publishedAt?: Date;
  description?: string;
  content?: string;
  imageUrl?: string;
  contentHash?: string;
};

export function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizeUrl(url: string): string {
  const normalized = new URL(url);
  normalized.hash = "";
  return normalized.toString();
}

export function contentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export function dedupeKey(article: Pick<NewArticle, "sourceId" | "title" | "canonicalUrl" | "publishedAt" | "content" | "contentHash">): string {
  const hash = article.contentHash ?? contentHash(article.content ?? "");
  return contentHash([article.sourceId, normalizeTitle(article.title), article.publishedAt?.toISOString() ?? "", hash].join("\u0000"));
}
