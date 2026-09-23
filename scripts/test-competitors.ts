import assert from "node:assert/strict";
import { createCompetitorRepository } from "../lib/market/competitor-repository";

const competitors: Record<string, unknown>[] = [];
const snapshots: Record<string, unknown>[] = [];
const repo = createCompetitorRepository({
  competitor: {
    create: async ({ data }) => { competitors.push(data as Record<string, unknown>); return data; },
    findMany: async ({ where }) => competitors.filter((item) => !where || Object.entries(where).every(([key, value]) => item[key] === value)),
  },
  competitorPriceSnapshot: {
    create: async ({ data }) => { snapshots.push(data as Record<string, unknown>); return data; },
    findMany: async ({ where }) => snapshots.filter((item) => Object.entries(where ?? {}).every(([key, value]) => item[key] === value)),
  },
});

async function main() {
  await repo.createCompetitor({ name: "Hotel A", active: true });
  await repo.createPriceSnapshot({ competitorId: "c1", roomPackage: "Deluxe", price: 1250000, originalPrice: 1500000, discount: 16.67, source: "manual", observedAt: new Date("2026-09-23T00:00:00Z") });
  assert.equal((await repo.listCompetitors(true)).length, 1);
  assert.equal((await repo.listPriceSnapshots("c1")).length, 1);
  assert.equal(snapshots[0].price, 1250000);
  console.log("competitor checks passed");
}
void main();
