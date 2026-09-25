import assert from "node:assert/strict";
import { matchComparablePrices, parsePriceSnapshots } from "../lib/market/price-scraper";

const checkIn = new Date("2026-10-10T00:00:00Z");
const checkOut = new Date("2026-10-12T00:00:00Z");
const context = { guests: 2, checkIn, checkOut, source: "test", sourceUrl: "https://example.com/rooms" };
const html = `<script type="application/ld+json">${JSON.stringify({ "@type": "Product", name: "Deluxe Room", offers: { price: "1500000", priceCurrency: "IDR" } })}</script>`;
const baseline = parsePriceSnapshots(html, { ...context, currency: "IDR" });
const competitor = parsePriceSnapshots(html.replace("1500000", "1750000"), { ...context, currency: "IDR" });
assert.equal(baseline[0].roomName, "Deluxe Room");
assert.equal(baseline[0].price, 1500000);
assert.equal(matchComparablePrices(baseline, competitor)[0].difference, 250000);
assert.equal(matchComparablePrices(baseline, competitor.map((item) => ({ ...item, guests: 1 }))).length, 0);
console.log("price scraper checks passed");
