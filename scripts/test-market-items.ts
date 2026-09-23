import assert from "node:assert/strict";
import { createMarketItemRepository } from "../lib/market/market-item-repository";

async function main() {
const saved: Record<string, unknown>[] = [];
const repo = createMarketItemRepository({ marketItem: {
  upsert: async ({ create }) => { saved.push(create as Record<string, unknown>); return create; },
  findMany: async ({ where }) => saved.filter((item) => Object.entries(where ?? {}).every(([key, value]) => item[key] === value)),
} });
await repo.save({ articleId: "article-1", kind: "event", location: "Anyer", tags: ["family"] });
assert.equal(saved.length, 1);
assert.deepEqual(await repo.list({ kind: "event", location: "Anyer" }), [saved[0]]);
assert.equal((await repo.list({ kind: "fnb" })).length, 0);
console.log("market item checks passed");
}
void main();
