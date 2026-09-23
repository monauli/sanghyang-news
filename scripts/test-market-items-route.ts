import assert from "node:assert/strict";

process.env.DATABASE_URL ??= "postgresql://localhost/sanghyang_test";
process.env.APP_PASSWORD = "test-password";

async function main() {
const { POST } = await import("../app/api/market-intelligence/route");
const response = await POST(new Request("https://example.com/api/market-intelligence", {
  method: "POST",
  body: JSON.stringify({ articleId: "00000000-0000-0000-0000-000000000000", kind: "event" }),
}));
assert.equal(response.status, 401);

const cookie = `sanghyang_masuk=${(await import("../lib/sandi")).tokenDari("test-password")}`;
const invalidId = await POST(new Request("https://example.com/api/market-intelligence", {
  method: "POST", headers: { cookie }, body: JSON.stringify({ articleId: "not-an-uuid", kind: "event" }),
}));
assert.equal(invalidId.status, 400);

const invalidDate = await POST(new Request("https://example.com/api/market-intelligence", {
  method: "POST", headers: { cookie }, body: JSON.stringify({ articleId: "00000000-0000-0000-0000-000000000000", kind: "event", startsAt: "tomorrow" }),
}));
assert.equal(invalidDate.status, 400);

const localeDate = await POST(new Request("https://example.com/api/market-intelligence", {
  method: "POST", headers: { cookie }, body: JSON.stringify({ articleId: "00000000-0000-0000-0000-000000000000", kind: "event", startsAt: "01/02/2026" }),
}));
assert.equal(localeDate.status, 400);
console.log("market item route checks passed");
}
void main();
