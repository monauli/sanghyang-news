import assert from "node:assert/strict";
import { GET, POST } from "../app/api/competitors/route";
import { NAMA_COOKIE, tokenDari } from "../lib/sandi";

async function main() {
  process.env.APP_PASSWORD = "test-password";
  const unauthorized = await GET(new Request("http://localhost/api/competitors"));
  assert.equal(unauthorized.status, 401);
  const cookie = `${NAMA_COOKIE}=${tokenDari("test-password")}`;
  const invalid = await POST(new Request("http://localhost/api/competitors", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ type: "priceSnapshot", competitorId: "not-a-uuid", roomPackage: "Deluxe", source: "manual", price: 10, observedAt: "2026-09-23T00:00:00Z" }) }));
  assert.equal(invalid.status, 400);
  const unknown = await POST(new Request("http://localhost/api/competitors", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ type: "unknown" }) }));
  assert.equal(unknown.status, 400);
  console.log("competitor route checks passed");
}
void main();
