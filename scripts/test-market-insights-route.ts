import assert from "node:assert/strict";
process.env.APP_PASSWORD = "test-password";
import { tokenDari, NAMA_COOKIE } from "../lib/sandi";
async function main() {
const { GET } = await import("../app/api/market-intelligence/insights/route");
const unauthorized = await GET(new Request("http://localhost/api/market-intelligence/insights"));
assert.equal(unauthorized.status, 401);
const invalid = await GET(new Request("http://localhost/api/market-intelligence/insights?type=bad", { headers: { cookie: `${NAMA_COOKIE}=${tokenDari("test-password")}` } }));
assert.equal(invalid.status, 400);
console.log("market insight route checks passed");
}
void main();
