import { collectGoogleHotelMarketRates } from "../lib/market/collect-rates";
import { db } from "../lib/db";

async function main() {
  console.log("Starting Google Hotels live market rates collection via Crawl4AI...");
  const results = await collectGoogleHotelMarketRates();
  console.log("Market rates updated successfully:");
  for (const r of results) {
    console.log(`- ${r.hotel}: ${r.currency} ${r.price.toLocaleString("id-ID")}`);
  }
}

main().finally(() => db.$disconnect());
