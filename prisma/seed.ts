import { db } from "../lib/db";

async function main() {
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
}

main()
  .catch((error) => {
    console.error("Database seed failed", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
