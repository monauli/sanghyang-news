import assert from "node:assert/strict";
import { generateInsights } from "../lib/market/insights";
import { createInsightRepository } from "../lib/market/insight-repository";

async function main() {
const generated = await generateInsights({ rows: [{ date: new Date().toISOString(), category: "Reviews", source: "TripAdvisor", headline: "Great beach service", sentiment: "positive" }], counts: { marketItems: 1, reviews: 1 } }, async () => JSON.stringify([{ type: "opportunity", title: "Beach messaging", summary: "Highlight beach service", evidence: ["Great beach service"], sourceReferences: ["TripAdvisor"], priority: 88, confidence: 76, status: "active" }]));
assert.equal(generated[0]?.type, "opportunity");
assert.equal(generated[0]?.priority, 88);

const fallback = await generateInsights({ rows: [{ date: new Date().toISOString(), category: "Reviews", source: "TripAdvisor", headline: "Useful review", sentiment: "neutral" }], counts: { marketItems: 2, reviews: 1 } }, async () => { throw new Error("unavailable"); });
assert.equal(fallback[0]?.type, "insight");

const records: unknown[] = [];
let conflict = false;
const repository = createInsightRepository({ marketInsight: { create: async ({ data }) => { if (conflict) throw { code: "P2002" }; records.push(data); return data; }, findMany: async () => records, findFirst: async () => records[0] ?? null } });
await repository.create(generated[0]);
conflict = true;
assert.equal(await repository.create(generated[0]), records[0], "duplicate active fingerprint returns existing row");
await repository.create(generated[0]);
assert.equal(records.length, 1, "duplicate active insight is not appended");
console.log("market insight checks passed");
}
void main();
