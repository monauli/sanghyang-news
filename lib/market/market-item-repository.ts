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
};

export type MarketItemRepositoryClient = {
  marketItem: {
    upsert(args: { where: { articleId: string }; create: any; update: any }): Promise<unknown>;
    findMany(args: { where?: Record<string, unknown>; orderBy: Record<string, string> }): Promise<unknown[]>;
  };
};

export function createMarketItemRepository(client: MarketItemRepositoryClient) {
  return {
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
