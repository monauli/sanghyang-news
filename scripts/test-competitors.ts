import assert from "node:assert/strict";
import { createCompetitorRepository } from "../lib/market/competitor-repository";

const competitors: Record<string, unknown>[] = [];
const snapshots: Record<string, unknown>[] = [];
const promotions: Record<string, unknown>[] = [];
const repo = createCompetitorRepository({
  competitor: {
    create: async ({ data }) => { competitors.push(data as Record<string, unknown>); return data; },
    findMany: async ({ where }) => competitors.filter((item) => !where || Object.entries(where).every(([key, value]) => item[key] === value)),
    findUnique: async ({ where }) => competitors.find((item) => item.id === where.id) ?? null,
    update: async ({ where, data }) => {
      const item = competitors.find((candidate) => candidate.id === where.id) ?? competitors[0];
      Object.assign(item, data);
      return item;
    },
  },
  competitorPriceSnapshot: {
    create: async ({ data }) => { snapshots.push(data as Record<string, unknown>); return data; },
    findMany: async ({ where }) => snapshots.filter((item) => Object.entries(where ?? {}).every(([key, value]) => item[key] === value)),
  },
  competitorPromotion: {
    create: async ({ data }) => { promotions.push(data as Record<string, unknown>); return data; },
    findMany: async ({ where }) => promotions.filter((item) => Object.entries(where ?? {}).every(([key, value]) => item[key] === value)),
  },
});

async function main() {
  await repo.createCompetitor({ name: "Hotel A", active: true });
  competitors[0].id = "c1";
  await repo.createPriceSnapshot({ competitorId: "c1", roomName: "Deluxe", price: 1250000, originalPrice: 1500000, discount: 16.67, source: "manual", observedAt: new Date("2026-09-23T00:00:00Z") });
  assert.equal((await repo.listCompetitors(true)).length, 1);
  assert.equal((await repo.listPriceSnapshots("c1")).length, 1);
  assert.equal(snapshots[0].price, 1250000);
  await repo.deleteCompetitor("c1");
  assert.equal(competitors[0].active, false);
  assert.equal(snapshots.length, 1);
  await repo.createPromotion({ competitorId: "c1", title: "Summer", category: "room", startsAt: new Date("2026-09-23T00:00:00Z"), endsAt: new Date("2026-09-30T00:00:00Z"), price: 100, discount: 20, source: "manual", capturedAt: new Date("2026-09-23T00:00:00Z") });
  await repo.createPromotion({ competitorId: "c1", title: "Summer", category: "room", startsAt: new Date("2026-09-23T00:00:00Z"), endsAt: new Date("2026-09-30T00:00:00Z"), price: 90, discount: 30, source: "manual", capturedAt: new Date("2026-09-24T00:00:00Z") });
  assert.equal((await repo.listPromotions("c1")).length, 2);
  assert.equal(promotions[0].status, "new");
  assert.equal(promotions[1].status, "changed");
  const expired = await repo.createPromotion({ competitorId: "c1", title: "Old", category: "room", startsAt: new Date("2026-09-01T00:00:00Z"), endsAt: new Date("2020-01-01T00:00:00Z"), source: "manual", capturedAt: new Date("2026-09-24T00:00:00Z") });
  assert.equal((expired as Record<string, unknown>).status, "expired");
  console.log("competitor checks passed");
}
void main();
