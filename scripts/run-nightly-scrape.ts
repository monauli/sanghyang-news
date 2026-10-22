import { db } from "../lib/db";
import { collectGoogleHotelMarketRates } from "../lib/market/collect-rates";
import { runNewsNow } from "../lib/market/run-news";

async function recordNightlyHeartbeat(stats: { newsStatus: string; ratesCount: number }) {
  const fp = "nightly-sync-heartbeat";
  const now = new Date();
  try {
    const existing = await db.marketInsight.findFirst({ where: { fingerprint: fp } });
    if (existing) {
      await db.marketInsight.update({
        where: { id: existing.id },
        data: {
          title: "[Otomasi Malam] Sinkronisasi Intelijen Pasar Terakhir",
          summary: `Pembaruan otomatis selesai pada ${now.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB. Status berita: ${stats.newsStatus}, tarif hotel terpantau: ${stats.ratesCount}.`,
          evidence: { ...stats, syncedAt: now.toISOString(), timezone: "WIB" },
          sourceReferences: ["GitHub Actions Scheduled Runner", "Google Hotels", "Google News"],
          confidence: 100,
          priority: 100,
          status: "active",
        },
      });
    } else {
      await db.marketInsight.create({
        data: {
          fingerprint: fp,
          activeFingerprint: fp,
          type: "insight",
          title: "[Otomasi Malam] Sinkronisasi Intelijen Pasar Terakhir",
          summary: `Pembaruan otomatis selesai pada ${now.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB. Status berita: ${stats.newsStatus}, tarif hotel terpantau: ${stats.ratesCount}.`,
          evidence: { ...stats, syncedAt: now.toISOString(), timezone: "WIB" },
          sourceReferences: ["GitHub Actions Scheduled Runner", "Google Hotels", "Google News"],
          confidence: 100,
          priority: 100,
          status: "active",
          version: 1,
        },
      });
    }
    console.log("[nightly] heartbeat recorded successfully");
  } catch (err) {
    console.warn("[nightly] failed to record heartbeat:", err);
  }
}

async function main() {
  let failed = false;
  let newsStatus = "unknown";
  let ratesCount = 0;

  try {
    const result = await runNewsNow();
    newsStatus = result.status;
    console.log(`[nightly] news scrape: ${result.status} (${result.runId})`);
  } catch (error) {
    failed = true;
    newsStatus = "failed";
    console.error("[nightly] news scrape failed:", error);
  }

  try {
    const rates = await collectGoogleHotelMarketRates();
    ratesCount = rates.length;
    console.log(`[nightly] market rates saved: ${rates.length}`);
    for (const rate of rates) {
      console.log(`[nightly] ${rate.hotel}: ${rate.currency} ${rate.price}`);
    }
  } catch (error) {
    failed = true;
    console.error("[nightly] market-rate scrape failed:", error);
  }

  try {
    await recordNightlyHeartbeat({ newsStatus, ratesCount });
  } catch (error) {
    console.warn("[nightly] heartbeat recording failed:", error);
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
