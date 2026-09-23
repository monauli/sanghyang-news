import assert from "node:assert/strict";
process.env.APP_PASSWORD = "test-password";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
import { tokenDari, NAMA_COOKIE } from "../lib/sandi";
async function main() {
const { GET, createInsightsPost } = await import("../app/api/market-intelligence/insights/route");
const unauthorized = await GET(new Request("http://localhost/api/market-intelligence/insights"));
assert.equal(unauthorized.status, 401);
assert.equal((await createInsightsPost(new Request("http://localhost/api/market-intelligence/insights", { method: "POST" }))).status, 401);
const invalid = await GET(new Request("http://localhost/api/market-intelligence/insights?type=bad", { headers: { cookie: `${NAMA_COOKIE}=${tokenDari("test-password")}` } }));
assert.equal(invalid.status, 400);
const generated = { type: "insight" as const, title: "Stable", summary: "Same", evidence: [], sourceReferences: [], priority: 50, confidence: 50, status: "active" as const };
const saved: unknown[] = [];
const deps = {
  findData: async () => ({ items: [], prices: [], promotions: [], reviews: [] }),
  generate: async () => [generated],
  repository: {
    list: async () => saved,
    create: async (item: unknown) => { saved.push({ ...item as object, fingerprint: "" }); return item; },
    archive: async () => undefined,
  },
};
const authorized = { headers: { cookie: `${NAMA_COOKIE}=${tokenDari("test-password")}` } };
assert.equal((await createInsightsPost(new Request("http://localhost/api/market-intelligence/insights", { ...authorized, method: "POST" }), deps)).status, 201);
assert.equal((await createInsightsPost(new Request("http://localhost/api/market-intelligence/insights", { ...authorized, method: "POST" }), deps)).status, 201);
assert.equal(saved.length, 1);
console.log("market insight route checks passed");
}
void main();
