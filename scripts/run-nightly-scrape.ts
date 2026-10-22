import { db } from "../lib/db";
import { collectGoogleHotelMarketRates } from "../lib/market/collect-rates";
import { runNewsNow } from "../lib/market/run-news";
import { syncCompetitorSocialPromoEvents } from "../lib/market/sync-social-promos";
import { scrapeNewGoogleReviews } from "../lib/market/scrape-new-reviews";
import { scrapeSocialBuzz } from "../lib/market/scrape-social-buzz";

async function recordNightlyHeartbeat(stats: {
  newsStatus: string;
  ratesCount: number;
  promosCount: number;
  reviewsInserted: number;
  reviewsSkipped: number;
  socialPostsFound: number;
}) {
  const fp = "nightly-sync-heartbeat";
  const now = new Date();
  const summaryText = `Pembaruan otomatis selesai pada ${now.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
  })} WIB. Status berita: ${stats.newsStatus}, tarif dinamis terpantau: ${
    stats.ratesCount
  }, promo & event: ${stats.promosCount}, ulasan baru: +${
    stats.reviewsInserted
  } (${stats.reviewsSkipped} terverifikasi), postingan sosmed baru: ${
    stats.socialPostsFound
  }.`;

  try {
    const existing = await db.marketInsight.findFirst({ where: { fingerprint: fp } });
    if (existing) {
      await db.marketInsight.update({
        where: { id: existing.id },
        data: {
          title: "[Otomasi Malam] Sinkronisasi Intelijen Pasar Terakhir",
          summary: summaryText,
          evidence: { ...stats, syncedAt: now.toISOString(), timezone: "WIB" },
          sourceReferences: [
            "GitHub Actions Scheduled Runner",
            "Google Hotels Dynamic Rates",
            "Google Maps Reviews Incremental",
            "Google News Anyer",
            "Instagram & TikTok Competitor Radar",
          ],
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
          summary: summaryText,
          evidence: { ...stats, syncedAt: now.toISOString(), timezone: "WIB" },
          sourceReferences: [
            "GitHub Actions Scheduled Runner",
            "Google Hotels Dynamic Rates",
            "Google Maps Reviews Incremental",
            "Google News Anyer",
            "Instagram & TikTok Competitor Radar",
          ],
          confidence: 100,
          priority: 100,
          status: "active",
          version: 1,
        },
      });
    }
    console.log("[nightly] heartbeat recorded successfully:", summaryText);
  } catch (err) {
    console.warn("[nightly] failed to record heartbeat:", err);
  }
}

async function main() {
  let failed = false;
  let newsStatus = "unknown";
  let ratesCount = 0;
  let promosCount = 0;
  let reviewsInserted = 0;
  let reviewsSkipped = 0;
  let socialPostsFound = 0;

  // 1. Berita Google News Kawasan Anyer/Banten
  try {
    console.log("[nightly] [1/5] Memulai perayapan berita...");
    const result = await runNewsNow();
    newsStatus = result.status;
    console.log(`[nightly] berita selesai: ${result.status} (${result.runId})`);
  } catch (error) {
    failed = true;
    newsStatus = "failed";
    console.error("[nightly] berita gagal:", error);
  }

  // 2. Tarif Pasar Dinamis (Besok & Akhir Pekan Terdekat - Tanpa deleteMany)
  try {
    console.log("[nightly] [2/5] Memulai perayapan tarif dinamis Google Hotels (besok & akhir pekan)...");
    const rates = await collectGoogleHotelMarketRates({ dateMode: "both" });
    ratesCount = rates.length;
    console.log(`[nightly] tarif pasar dinamis tersimpan: ${rates.length}`);
    for (const rate of rates) {
      console.log(
        `[nightly] ${rate.hotel} (${rate.checkIn.toISOString().split("T")[0]}): ${rate.currency} ${rate.price}`
      );
    }
  } catch (error) {
    failed = true;
    console.error("[nightly] perayapan tarif hotel gagal:", error);
  }

  // 3. Ulasan Baru Google Maps (Incremental Ingestion)
  try {
    console.log("[nightly] [3/5] Memulai perayapan ulasan Google Maps incremental...");
    const reviewStats = await scrapeNewGoogleReviews();
    reviewsInserted = reviewStats.totalInserted;
    reviewsSkipped = reviewStats.totalSkipped;
    console.log(
      `[nightly] ulasan baru: +${reviewsInserted} ditambahkan, ${reviewsSkipped} sudah ada sebelumnya.`
    );
  } catch (error) {
    console.warn("[nightly] perayapan ulasan baru dilewati:", error);
  }

  // 4. Radar Postingan Media Sosial Kompetitor
  try {
    console.log("[nightly] [4/5] Memeriksa postingan media sosial kompetitor...");
    const socialStats = await scrapeSocialBuzz();
    socialPostsFound = socialStats.totalDiscovered;
    console.log(`[nightly] postingan sosmed terdeteksi: ${socialPostsFound}`);
  } catch (error) {
    console.warn("[nightly] perayapan sosmed dilewati:", error);
  }

  // 5. Sinkronisasi Promo & Event Kompetitor (Status & Validasi)
  try {
    console.log("[nightly] [5/5] Sinkronisasi status promosi & acara kompetitor...");
    const promoSync = await syncCompetitorSocialPromoEvents();
    promosCount = promoSync.totalSynced;
    console.log(
      `[nightly] promo kompetitor disinkronkan: ${promosCount} (aktif: ${promoSync.activeCount})`
    );
  } catch (error) {
    console.warn("[nightly] sinkronisasi promo kompetitor gagal:", error);
  }

  // 6. Rekam Heartbeat ke Supabase
  try {
    await recordNightlyHeartbeat({
      newsStatus,
      ratesCount,
      promosCount,
      reviewsInserted,
      reviewsSkipped,
      socialPostsFound,
    });
  } catch (error) {
    console.warn("[nightly] pencatatan heartbeat gagal:", error);
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
