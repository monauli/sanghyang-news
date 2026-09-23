import assert from "node:assert/strict";
import { DELETE, GET, PATCH, POST } from "../app/api/competitors/route";
import { NAMA_COOKIE, tokenDari } from "../lib/sandi";

async function main() {
  process.env.APP_PASSWORD = "test-password";
  const unauthorized = await GET(new Request("http://localhost/api/competitors"));
  assert.equal(unauthorized.status, 401);
  const cookie = `${NAMA_COOKIE}=${tokenDari("test-password")}`;
  const invalid = await POST(new Request("http://localhost/api/competitors", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ type: "priceSnapshot", competitorId: "not-a-uuid", roomName: "Deluxe", source: "manual", price: 10, observedAt: "2026-09-23T00:00:00Z" }) }));
  assert.equal(invalid.status, 400);
  const invalidDate = await POST(new Request("http://localhost/api/competitors", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ type: "priceSnapshot", competitorId: "00000000-0000-0000-0000-000000000000", roomName: "Deluxe", source: "manual", price: 10, observedAt: "01/02/2026" }) }));
  assert.equal(invalidDate.status, 400);
  const invalidUrl = await POST(new Request("http://localhost/api/competitors", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ type: "competitor", name: "Hotel", websiteUrl: "javascript:alert(1)" }) }));
  assert.equal(invalidUrl.status, 400);
  assert.equal((await PATCH(new Request("http://localhost/api/competitors?id=not-a-uuid", { method: "PATCH", headers: { cookie, "content-type": "application/json" }, body: "{}" }))).status, 400);
  assert.equal((await DELETE(new Request("http://localhost/api/competitors?id=not-a-uuid", { method: "DELETE", headers: { cookie } }))).status, 400);
  const unknown = await POST(new Request("http://localhost/api/competitors", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ type: "unknown" }) }));
  assert.equal(unknown.status, 400);
  console.log("competitor route checks passed");
}
void main();
