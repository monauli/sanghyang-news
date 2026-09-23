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

  const competitors = [
    { id: "10000000-0000-4000-8000-000000000001", name: "Aston Anyer Beach Hotel", location: "Anyer", notes: "Hotel/resort pembanding langsung di kawasan Anyer." },
    { id: "10000000-0000-4000-8000-000000000002", name: "Mambruk Hotel & Convention", location: "Anyer", websiteUrl: "https://mambruk.co.id/", notes: "Resort dan venue event di Anyer." },
    { id: "10000000-0000-4000-8000-000000000003", name: "The Jayakarta Villas Anyer Beach Resort", location: "Anyer", websiteUrl: "https://jayakartagroup.com/affiliated/view/9", notes: "Resort pantai dan villa di Anyer." },
    { id: "10000000-0000-4000-8000-000000000004", name: "Mutiara Carita Cottages", location: "Carita", websiteUrl: "https://mutiara-carita.com/about/", notes: "Resort pantai dan cottages di Carita." },
    { id: "10000000-0000-4000-8000-000000000005", name: "Allisa Resort Anyer", location: "Anyer", websiteUrl: "https://allisahotel.com/", notes: "Resort keluarga di Anyer." },
    { id: "10000000-0000-4000-8000-000000000006", name: "The West Cove Hotel Anyer", location: "Anyer", websiteUrl: "https://thewestcove.com/contacts/", notes: "Hotel/resort pantai di Anyer." },
    { id: "10000000-0000-4000-8000-000000000007", name: "Resort Prima Anyer", location: "Anyer", notes: "Resort pembanding untuk harga dan fasilitas." },
    { id: "10000000-0000-4000-8000-000000000008", name: "MaxOne Anyer", location: "Anyer", notes: "Hotel pembanding untuk harga dan promo." },
  ];
  for (const competitor of competitors) {
    await db.competitor.upsert({ where: { id: competitor.id }, update: competitor, create: competitor });
  }
}

main()
  .catch((error) => {
    console.error("Database seed failed", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
