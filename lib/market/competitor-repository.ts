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
  capturedAt: Date; status: "new" | "changed" | "expired";
};
export type CompetitorRepositoryClient = {
  competitor: { create(args: { data: unknown }): Promise<unknown>; findMany(args: { where?: Record<string, unknown>; orderBy: Record<string, string> }): Promise<unknown[]>; update(args: { where: Record<string, unknown>; data: unknown }): Promise<unknown>; };
  competitorPriceSnapshot: { create(args: { data: unknown }): Promise<unknown>; findMany(args: { where?: Record<string, unknown>; orderBy: Record<string, string> }): Promise<unknown[]>; };
  competitorPromotion: { create(args: { data: unknown }): Promise<unknown>; findMany(args: { where?: Record<string, unknown>; orderBy: Record<string, string> }): Promise<unknown[]>; };
};

export function createCompetitorRepository(client: CompetitorRepositoryClient) {
  return {
    createCompetitor(data: CompetitorInput) { return client.competitor.create({ data }); },
    updateCompetitor(id: string, data: Partial<CompetitorInput>) { return client.competitor.update({ where: { id }, data }); },
    deleteCompetitor(id: string) { return client.competitor.update({ where: { id }, data: { active: false } }); },
    listCompetitors(active?: boolean) { return client.competitor.findMany({ where: active === undefined ? undefined : { active }, orderBy: { name: "asc" } }); },
    createPriceSnapshot(data: PriceSnapshotInput) { return client.competitorPriceSnapshot.create({ data }); },
    listPriceSnapshots(competitorId: string) { return client.competitorPriceSnapshot.findMany({ where: { competitorId }, orderBy: { observedAt: "desc" } }); },
    createPromotion(data: PromotionInput) { return client.competitorPromotion.create({ data }); },
    listPromotions(competitorId: string) { return client.competitorPromotion.findMany({ where: { competitorId }, orderBy: { capturedAt: "desc" } }); },
  };
}

export const competitorRepository = createCompetitorRepository(db as unknown as CompetitorRepositoryClient);
