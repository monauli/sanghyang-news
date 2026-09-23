import { db } from "../db";
import type { MarketItemKind } from "../db-types";

export type MarketItemInput = {
  articleId: string;
  kind: MarketItemKind;
  location?: string | null;
  venue?: string | null;
  organizer?: string | null;
  brand?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  tags?: string[] | null;
  description?: string | null;
  targetAudience?: string | null;
  relevanceScore?: number | null;
};

export type MarketItemRepositoryClient = {
  marketItem: {
    upsert(args: { where: { articleId: string }; create: unknown; update: unknown }): Promise<unknown>;
    findMany(args: { where?: Record<string, unknown>; orderBy: Record<string, string> }): Promise<unknown[]>;
  };
};

export function createMarketItemRepository(client: MarketItemRepositoryClient) {
  return {
    // One MarketItem per Article is intentional for Phase 2 item classification.
    save(item: MarketItemInput) {
      const data = { ...item, tags: item.tags ?? undefined };
      return client.marketItem.upsert({ where: { articleId: item.articleId }, create: data, update: data });
    },
    list(filters: { kind?: MarketItemKind; location?: string } = {}) {
      return client.marketItem.findMany({ where: filters, orderBy: { createdAt: "desc" } });
    },
  };
}

export const marketItemRepository = createMarketItemRepository(db as unknown as MarketItemRepositoryClient);
