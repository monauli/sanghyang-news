import fs from "node:fs";
import path from "node:path";
import { db } from "../lib/db";

async function main() {
  console.log("===============================================================");
  console.log("  SANGHYANG INTELLIGENCE: CLOUD-TO-LOCAL DATA SYNCHRONIZER");
  console.log("===============================================================");
  console.log("Menghubungkan ke Supabase PostgreSQL Cloud...");

  const now = new Date();

  // 1. Ambil Heartbeat Eksekusi Otomasi Malam
  const heartbeat = await db.marketInsight.findFirst({
    where: { fingerprint: "nightly-sync-heartbeat" },
  });

  // 2. Ambil Tarif Terbaru Sanghyang & Kompetitor
  const sanghyangPrices = await db.sanghyangPriceSnapshot.findMany({
    orderBy: { observedAt: "desc" },
    take: 10,
  });

  const competitorPrices = await db.competitorPriceSnapshot.findMany({
    include: { competitor: { select: { name: true } } },
    orderBy: { observedAt: "desc" },
    take: 20,
  });

  // 3. Ambil Ulasan Pelanggan
  const totalReviews = await db.competitorReview.count();
  const latestReviews = await db.competitorReview.findMany({
    include: { competitor: { select: { name: true } } },
    orderBy: { reviewDate: "desc" },
    take: 10,
  });

  // 4. Ambil Radar Promo & Event Kompetitor
  const totalPromotions = await db.competitorPromotion.count();
  const activePromotions = await db.competitorPromotion.findMany({
    include: { competitor: { select: { name: true } } },
    orderBy: { startsAt: "desc" },
    take: 15,
  });

  // 5. Ambil Berita / Market Items Terbaru
  const totalArticles = await db.article.count();
  const latestArticles = await db.article.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { title: true, publishedAt: true, source: { select: { name: true } } },
  });

  const snapshotPayload = {
    syncedAt: now.toISOString(),
    environment: "Supabase Cloud Production (Mumbai)",
    heartbeat: heartbeat
      ? {
          title: heartbeat.title,
          summary: heartbeat.summary,
          evidence: heartbeat.evidence,
          generatedAt: heartbeat.generatedAt,
        }
      : null,
    metrics: {
      totalReviews,
      totalPromotions,
      totalArticles,
      sanghyangSnapshotsCount: sanghyangPrices.length,
      competitorSnapshotsCount: competitorPrices.length,
    },
    latestRates: {
      sanghyang: sanghyangPrices.map((p) => ({
        price: Number(p.price),
        currency: p.currency,
        checkIn: p.checkIn,
        checkOut: p.checkOut,
        observedAt: p.observedAt,
        source: p.source,
      })),
      competitors: competitorPrices.map((p) => ({
        hotel: p.competitor.name,
        price: Number(p.price),
        currency: p.currency,
        checkIn: p.checkIn,
        checkOut: p.checkOut,
        observedAt: p.observedAt,
        source: p.source,
      })),
    },
    recentReviews: latestReviews.map((r) => ({
      hotel: r.competitor.name,
      rating: Number(r.rating),
      reviewDate: r.reviewDate,
      source: r.source,
      text: r.text.slice(0, 160) + (r.text.length > 160 ? "..." : ""),
    })),
    activePromotions: activePromotions.map((p) => ({
      hotel: p.competitor.name,
      title: p.title,
      category: p.category,
      startsAt: p.startsAt,
      endsAt: p.endsAt,
      status: p.status,
      discount: p.discount ? Number(p.discount) : null,
      sourceUrl: p.sourceUrl,
    })),
    recentNews: latestArticles.map((a) => ({
      source: a.source.name,
      title: a.title,
      publishedAt: a.publishedAt,
    })),
  };

  // Simpan berkas ke direktori data lokal
  const outDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outPath = path.join(outDir, "synced-cloud-snapshot.json");
  fs.writeFileSync(outPath, JSON.stringify(snapshotPayload, null, 2), "utf-8");

  console.log("\n Berhasil mengekspor data cloud Supabase ke berkas lokal:");
  console.log(`-> ${outPath}`);
  console.log("\n==================== RINGKASAN DATA CLOUD TERBARU ====================");
  if (heartbeat) {
    console.log(`Heartbeat Otomasi: ${heartbeat.summary}`);
  }
  console.log(`Total Ulasan di Cloud: ${totalReviews} ulasan`);
  console.log(`Total Promo & Event:   ${totalPromotions} promo aktif/upcoming`);
  console.log(`Total Artikel Berita:  ${totalArticles} artikel`);
  console.log("\nTarif Hotel Terakhir Terpantau:");
  if (sanghyangPrices.length > 0) {
    const s = sanghyangPrices[0];
    console.log(`  Sanghyang Indah: IDR ${Number(s.price).toLocaleString("id-ID")} (Check-in: ${s.checkIn?.toISOString().split("T")[0] || "-"})`);
  }
  for (const c of competitorPrices.slice(0, 4)) {
    console.log(`  ${c.competitor.name}: IDR ${Number(c.price).toLocaleString("id-ID")} (Check-in: ${c.checkIn?.toISOString().split("T")[0] || "-"})`);
  }
  console.log("=======================================================================\n");
}

main()
  .catch((e) => {
    console.error("Gagal melakukan sinkronisasi cloud ke lokal:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
