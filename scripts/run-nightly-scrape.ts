import { db } from "../lib/db";
import { collectGoogleHotelMarketRates } from "../lib/market/collect-rates";
import { runNewsNow } from "../lib/market/run-news";

async function main() {
  let failed = false;

  try {
    const result = await runNewsNow();
    console.log(`[nightly] news scrape: ${result.status} (${result.runId})`);
  } catch (error) {
    failed = true;
    console.error("[nightly] news scrape failed:", error);
  }

  try {
    const rates = await collectGoogleHotelMarketRates();
    console.log(`[nightly] market rates saved: ${rates.length}`);
    for (const rate of rates) {
      console.log(`[nightly] ${rate.hotel}: ${rate.currency} ${rate.price}`);
    }
  } catch (error) {
    failed = true;
    console.error("[nightly] market-rate scrape failed:", error);
  } finally {
    await db.$disconnect();
  }

  if (failed) process.exitCode = 1;
}

void main().catch(async (error) => {
  console.error("[nightly] unexpected failure:", error);
  await db.$disconnect();
  process.exitCode = 1;
});
