import { db } from "../lib/db";
import { seedMarketCompetitorsSocial } from "../scripts/seed-market-competitors-social";
import { seedTikTokIntelligence } from "../scripts/seed-tiktok-intelligence";

async function main() {
  console.log("=== Memulai Database Seeding Lengkap Sanghyang News ===");

  await db.source.upsert({
    where: { domain_method: { domain: "news.google.com", method: "rss" } },
    update: { enabled: true, name: "Google News" },
    create: {
      name: "Google News",
      domain: "news.google.com",
      category: "news",
      method: "rss",
      enabled: true,
    },
  });

  // 1. Jalankan seed profil kompetitor & data media sosial (Instagram, Reviews, Rates)
  await seedMarketCompetitorsSocial();

  // 2. Jalankan seed TikTok Trend Intelligence
  await seedTikTokIntelligence();

  console.log("=== Seluruh Seeding Database Berhasil 100% ===");
}

main()
  .catch((error) => {
    console.error("Database seed failed", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });

