import { db } from "../lib/db";

async function main() {
  const googleNewsSource = await db.source.upsert({
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

  const marketArticles = [
    { id: "20000000-0000-4000-8000-000000000001", title: "DZ Coffee & Eats Mancak: Surga Bali Tepi Sungai di Serang", url: "https://bantenviral.com/dz-coffee-eats-mancak-surga-bali-tepi-sungai-di-serang/", publishedAt: new Date("2026-09-12T04:00:00Z"), kind: "fnb" as const, location: "Mancak–Anyer", description: "Destinasi kuliner dan rekreasi dekat Anyer dengan konsep Bali tepi sungai." },
    { id: "20000000-0000-4000-8000-000000000002", title: "Naker Fest Kabupaten Serang Digelar di Hotel Marbella Anyer", url: "https://kabarbanten.pikiran-rakyat.com/seputar-banten/pr-5910413002/naker-fest-kabupaten-serang-dibuka-september-cek-loker-dalam-dan-luar-negeri?page=all", publishedAt: new Date("2026-08-26T02:32:00Z"), kind: "event" as const, location: "Anyer", description: "Event dua hari di Hotel Marbella Anyer pada 9–10 September 2026." },
    { id: "20000000-0000-4000-8000-000000000003", title: "Exciting Banten Festival 2026 Anyer Sukses Ramaikan Pantai Cibeureum", url: "https://bantenlife.com/exciting-banten-festival-2026-anyer-sukses-ramaikan-pantai-cibeureum-dan-umkm-lokal/", publishedAt: new Date("2026-09-17T00:00:00Z"), kind: "entertainment" as const, location: "Anyer", description: "Festival menampilkan hiburan musik dan seni, UMKM, kuliner, serta aktivitas komunitas." },
    { id: "20000000-0000-4000-8000-000000000004", title: "Open Trip Pulau Sangiang 05–06 September 2026", url: "https://www.tournesia.com/open-trip/33570/pulau-sangiang-05-06-september-2026/", publishedAt: new Date("2026-09-05T00:00:00Z"), kind: "destination" as const, location: "Anyer–Cilegon", description: "Paket wisata Pulau Sangiang dengan snorkeling, trekking, dan transportasi dari Serang/Cilegon." },
  ];
  for (const item of marketArticles) {
    const article = await db.article.upsert({
      where: { id: item.id },
      update: { sourceId: googleNewsSource.id, title: item.title, canonicalUrl: item.url, normalizedTitle: item.title.toLowerCase(), publishedAt: item.publishedAt, description: item.description, status: "extracted" },
      create: { id: item.id, sourceId: googleNewsSource.id, title: item.title, canonicalUrl: item.url, normalizedTitle: item.title.toLowerCase(), publishedAt: item.publishedAt, description: item.description, status: "extracted" },
    });
    await db.marketItem.upsert({
      where: { articleId: article.id },
      update: { kind: item.kind, location: item.location, description: item.description, tags: [item.kind], targetAudience: "wisatawan dan keluarga", relevanceScore: 80 },
      create: { articleId: article.id, kind: item.kind, location: item.location, description: item.description, tags: [item.kind], targetAudience: "wisatawan dan keluarga", relevanceScore: 80 },
    });
  }
  await db.competitorPromotion.upsert({
    where: { id: "30000000-0000-4000-8000-000000000001" },
    update: { title: "60 Seconds to Tokyo", category: "F&B", description: "Program kuliner Jepang Archipelago yang ditawarkan di Aston Anyer dan properti Aston lain di Banten.", startsAt: new Date("2026-07-01T00:00:00Z"), endsAt: new Date("2026-12-31T23:59:59Z"), source: "Radar Banten", sourceUrl: "https://www.radarbanten.co.id/2026/07/01/hotel-aston-hadirkan-festival-kuliner-jepang-60-seconds-to-tokyo/", capturedAt: new Date("2026-07-01T00:00:00Z"), status: "new" },
    create: { id: "30000000-0000-4000-8000-000000000001", competitorId: "10000000-0000-4000-8000-000000000001", title: "60 Seconds to Tokyo", category: "F&B", description: "Program kuliner Jepang Archipelago yang ditawarkan di Aston Anyer dan properti Aston lain di Banten.", startsAt: new Date("2026-07-01T00:00:00Z"), endsAt: new Date("2026-12-31T23:59:59Z"), source: "Radar Banten", sourceUrl: "https://www.radarbanten.co.id/2026/07/01/hotel-aston-hadirkan-festival-kuliner-jepang-60-seconds-to-tokyo/", capturedAt: new Date("2026-07-01T00:00:00Z"), status: "new" },
  });

  const observedAt = new Date("2026-09-23T00:00:00+07:00");
  const competitors = [
    { id: "10000000-0000-4000-8000-000000000001", name: "Aston Anyer Beach Hotel", location: "Anyer", rating: 4.7, reviewCount: 17132, ratingSource: "Google Hotels", ratingSourceUrl: "https://www.google.com/travel/hotels/entity/CgsIyMeqy4H4hJPOARAB", ratingObservedAt: observedAt, notes: "Rating publik snapshot; hotel/resort pembanding langsung di kawasan Anyer." },
    { id: "10000000-0000-4000-8000-000000000002", name: "Mambruk Hotel & Convention", location: "Anyer", websiteUrl: "https://mambruk.co.id/", rating: 4.6, reviewCount: 9538, ratingSource: "Google Hotels", ratingSourceUrl: "https://www.google.com/travel/hotels/entity/CgoInq6j7auKrqlzEAE", ratingObservedAt: observedAt, notes: "Rating publik snapshot; resort dan venue event di Anyer." },
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
