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

  const observedAt = new Date("2026-09-23T00:00:00+07:00");
  const competitors = [
    { id: "10000000-0000-4000-8000-000000000001", name: "Aston Anyer Beach Hotel", location: "Anyer", rating: 4.7, reviewCount: 17127, ratingSource: "Google Hotels", ratingSourceUrl: "https://www.google.com/travel/hotels/entity/CgsIyMeqy4H4hJPOARAB", ratingObservedAt: observedAt, notes: "Rating publik snapshot; hotel/resort pembanding langsung di kawasan Anyer." },
    { id: "10000000-0000-4000-8000-000000000002", name: "Mambruk Hotel & Convention", location: "Anyer", websiteUrl: "https://mambruk.co.id/", rating: 4.6, reviewCount: 914, ratingSource: "Tripadvisor", ratingSourceUrl: "https://www.tripadvisor.com/Hotel_Review-g3400871-d1056690-Reviews-Mambruk_Hotel_Convention-Anyer_Banten_Province_Java.html", ratingObservedAt: observedAt, notes: "Rating publik snapshot; resort dan venue event di Anyer." },
    { id: "10000000-0000-4000-8000-000000000003", name: "The Jayakarta Villas Anyer Beach Resort", location: "Anyer", websiteUrl: "https://jayakartagroup.com/affiliated/view/9", rating: 4.3, reviewCount: 3848, ratingSource: "Google Hotels", ratingSourceUrl: "https://www.google.com/travel/hotels/entity/ChgI_9neisz9vOACGgwvZy8xcHpwaGt4MnMQAQ", ratingObservedAt: observedAt, notes: "Rating publik snapshot; resort pantai dan villa di Anyer." },
    { id: "10000000-0000-4000-8000-000000000004", name: "Mutiara Carita Cottages", location: "Carita", websiteUrl: "https://mutiara-carita.com/about/", rating: 4.5, reviewCount: 2964, ratingSource: "Google Hotels", ratingSourceUrl: "https://www.google.co.id/travel/hotels/entity/CgoI6fi0t9v9_-hkEAE", ratingObservedAt: observedAt, notes: "Rating publik snapshot; resort pantai dan cottages di Carita." },
    { id: "10000000-0000-4000-8000-000000000005", name: "Allisa Resort Anyer", location: "Anyer", websiteUrl: "https://allisahotel.com/", rating: 4.3, reviewCount: 1600, ratingSource: "Top-rated.online (Google-derived)", ratingSourceUrl: "https://www.top-rated.online/cities/Anyer/place/p/1013134/Allisa+Resort+Anyer", ratingObservedAt: observedAt, notes: "Rating publik snapshot; jumlah ulasan ditampilkan publik sebagai sekitar 1,6K." },
    { id: "10000000-0000-4000-8000-000000000006", name: "The West Cove Hotel Anyer", location: "Anyer", websiteUrl: "https://thewestcove.com/contacts/", notes: "Belum ada rating agregat yang cukup tepercaya untuk diisi; hotel/resort pantai di Anyer." },
    { id: "10000000-0000-4000-8000-000000000007", name: "Resort Prima Anyer", location: "Anyer", rating: 4.0, reviewCount: 837, ratingSource: "Google Hotels", ratingSourceUrl: "https://www.google.com/travel/hotels/entity/ChgI_9neisz9vOACGgwvZy8xcHpwaGt4MnMQAQ", ratingObservedAt: observedAt, notes: "Rating publik snapshot; resort pembanding untuk harga dan fasilitas." },
    { id: "10000000-0000-4000-8000-000000000008", name: "MaxOne Anyer", location: "Anyer", notes: "Belum ada rating agregat yang cukup tepercaya untuk diisi; hotel pembanding untuk harga dan promo." },
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
