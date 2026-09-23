import { db } from "../db";

export type CompetitorInput = {
  name: string; websiteUrl?: string | null; googleMapsUrl?: string | null; instagramUrl?: string | null; facebookUrl?: string | null; tiktokUrl?: string | null; location?: string | null;
  bookingUrl?: string | null; socialUrl?: string | null; active?: boolean; notes?: string | null;
};
export type PriceSnapshotInput = {
  competitorId: string; roomName?: string | null; packageName?: string | null; price: number; originalPrice?: number | null;
  discount?: number | null; checkIn?: Date | null; checkOut?: Date | null;
  source: string; sourceUrl?: string | null; observedAt?: Date;
};
export type PromotionInput = {
  competitorId: string; title: string; category: string; description?: string | null;
  startsAt: Date; endsAt?: Date | null; price?: number | null; originalPrice?: number | null;
  discount?: number | null; source: string; sourceUrl?: string | null; imageUrl?: string | null;
  capturedAt: Date;
};
export type ReviewInput = {
  competitorId: string; externalId: string; source: string; sourceUrl: string; rating: number;
  reviewDate: Date; title?: string | null; text: string; sentiment: "positive" | "neutral" | "negative";
  themes: string[]; capturedAt: Date;
};
export type CompetitorRepositoryClient = {
  competitor: { create(args: { data: unknown }): Promise<unknown>; findMany(args: { where?: Record<string, unknown>; orderBy: Record<string, string> }): Promise<unknown[]>; findUnique(args: { where: Record<string, unknown> }): Promise<unknown | null>; update(args: { where: Record<string, unknown>; data: unknown }): Promise<unknown>; };
  competitorPriceSnapshot: { create(args: { data: unknown }): Promise<unknown>; findMany(args: { where?: Record<string, unknown>; orderBy: Record<string, string> }): Promise<unknown[]>; };
  competitorPromotion: { create(args: { data: unknown }): Promise<unknown>; findMany(args: { where?: Record<string, unknown>; orderBy: Record<string, string> }): Promise<unknown[]>; };
  competitorReview?: { create(args: { data: unknown }): Promise<unknown>; findMany(args: { where?: Record<string, unknown>; orderBy: Record<string, string> }): Promise<unknown[]>; };
};

export function createCompetitorRepository(client: CompetitorRepositoryClient) {
  return {
    createCompetitor(data: CompetitorInput) { return client.competitor.create({ data }); },
    findCompetitor(id: string) { return client.competitor.findUnique({ where: { id } }); },
    updateCompetitor(id: string, data: Partial<CompetitorInput>) { return client.competitor.update({ where: { id }, data }); },
    deleteCompetitor(id: string) { return client.competitor.update({ where: { id }, data: { active: false } }); },
    listCompetitors(active?: boolean) { return client.competitor.findMany({ where: active === undefined ? undefined : { active }, orderBy: { name: "asc" } }); },
    createPriceSnapshot(data: PriceSnapshotInput) { return client.competitorPriceSnapshot.create({ data }); },
    listPriceSnapshots(competitorId: string) { return client.competitorPriceSnapshot.findMany({ where: { competitorId }, orderBy: { observedAt: "desc" } }); },
    async createPromotion(data: PromotionInput) {
      const prior = await client.competitorPromotion.findMany({ where: { competitorId: data.competitorId, source: data.source, title: data.title }, orderBy: { capturedAt: "desc" } });
      const previous = prior[0] as Record<string, unknown> | undefined;
      const expired = data.endsAt != null && data.endsAt.getTime() < Date.now();
      const material = ["category", "description", "startsAt", "endsAt", "price", "originalPrice", "discount", "sourceUrl", "imageUrl"];
      const comparable = (value: unknown) => {
        if (value instanceof Date) return value.getTime();
        if (value && typeof value === "object" && "toString" in value) { const numeric = Number(String(value)); return Number.isNaN(numeric) ? String(value) : numeric; }
        return value;
      };
      const changed = Boolean(previous && material.some((key) => {
        const oldValue = comparable(previous[key]);
        const newValue = comparable((data as unknown as Record<string, unknown>)[key]);
        return oldValue !== newValue;
      }));
      return client.competitorPromotion.create({ data: { ...data, status: expired ? "expired" : changed ? "changed" : "new" } });
    },
    listPromotions(competitorId: string) { return client.competitorPromotion.findMany({ where: { competitorId }, orderBy: { capturedAt: "desc" } }); },
    createReview(data: ReviewInput) { return client.competitorReview!.create({ data }); },
    listReviews(competitorId: string) { return client.competitorReview!.findMany({ where: { competitorId }, orderBy: { reviewDate: "desc" } }); },
  };
}

export const competitorRepository = createCompetitorRepository(db as unknown as CompetitorRepositoryClient);
