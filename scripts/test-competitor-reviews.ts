import assert from "node:assert/strict";
import { createCompetitorRepository } from "../lib/market/competitor-repository";

const reviews: unknown[] = [];
const client = {
  competitor: { create: async ({ data }: { data: unknown }) => data, findMany: async () => [], findUnique: async () => ({ id: "c" }), update: async ({ data }: { data: unknown }) => data },
  competitorPriceSnapshot: { create: async ({ data }: { data: unknown }) => data, findMany: async () => [] },
  competitorPromotion: { create: async ({ data }: { data: unknown }) => data, findMany: async () => [] },
  competitorReview: { create: async ({ data }: { data: unknown }) => { reviews.push(data); return data; }, findMany: async () => reviews },
};
const repository = createCompetitorRepository(client);
const input = { competitorId: "c", externalId: "review-1", source: "google", sourceUrl: "https://example.com/review-1", rating: 4.5, reviewDate: new Date("2026-01-01T00:00:00Z"), title: "Great", text: "Great service", sentiment: "positive" as const, themes: ["service"], capturedAt: new Date("2026-01-02T00:00:00Z") };
(async () => {
  const saved = await repository.createReview(input);
  assert.equal((saved as typeof input).externalId, "review-1");
  assert.equal((await repository.listReviews("c")).length, 1);
  assert.equal(reviews.length, 1);
  console.log("competitor review repository checks passed");
})();
