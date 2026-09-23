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
const repository = createInsightRepository({ marketInsight: { create: async ({ data }) => (records.push(data), data), findMany: async () => records } });
await repository.create(generated[0]);
await repository.create(generated[0]);
assert.equal(records.length, 2, "insights are append-only");
console.log("market insight checks passed");
}
void main();
