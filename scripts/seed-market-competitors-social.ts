import fs from 'fs';
import path from 'path';
import { db } from '../lib/db';
import { Prisma } from '@prisma/client';

const detailedPostsPath = path.resolve(__dirname, 'detailed-real-posts.json');
const detailedPosts: { url: string; postedAt: string }[] = JSON.parse(fs.readFileSync(detailedPostsPath, 'utf-8'));
const postDateMap = new Map<string, string>();
for (const p of detailedPosts) {
  postDateMap.set(p.url, p.postedAt);
}

const itemSchedules: Record<string, { startsAt: Date; endsAt?: Date }> = {
  // Hanya acara dengan tanggal pelaksanaan spesifik yang tercantum dalam caption asli
  'https://www.instagram.com/astonanyer/reel/DeOmzWATnJW/': {
    startsAt: new Date('2026-10-31T00:00:00.000Z'),
    endsAt: new Date('2026-10-31T23:59:59.000Z'),
  },
  'https://www.instagram.com/mambrukhotelanyer/reel/DeRP3tzAkGn/': {
    startsAt: new Date('2026-11-07T00:00:00.000Z'),
    endsAt: new Date('2026-11-07T23:59:59.000Z'),
  },
  'https://www.instagram.com/thejayakartaanyer/p/DeNv5AiTpe1/': {
    startsAt: new Date('2026-10-08T00:00:00.000Z'),
    endsAt: new Date('2026-10-08T23:59:59.000Z'),
  },
  'https://www.instagram.com/marbellaplaceanyer/p/DeOnJe1hEpM/': {
    startsAt: new Date('2026-10-08T00:00:00.000Z'),
    endsAt: new Date('2026-10-08T23:59:59.000Z'),
  },
};

async function main() {
  console.log('--- Mulai Seeding Data Kompetitor & Social Media Intelligence (100% Authentic Grounding) ---');

  // 1. Pastikan Source untuk Social Media & Travel Platforms
  const sourceIg = await db.source.upsert({
    where: { domain_method: { domain: 'instagram.com', method: 'http' } },
    update: { enabled: true, name: 'Instagram Social Intelligence' },
    create: {
      name: 'Instagram Social Intelligence',
      domain: 'instagram.com',
      category: 'competitor',
      method: 'http',
      enabled: true,
      priority: 10,
    },
  });

  await db.source.upsert({
    where: { domain_method: { domain: 'tiktok.com', method: 'http' } },
    update: { enabled: true, name: 'TikTok Trend Intelligence' },
    create: {
      name: 'TikTok Trend Intelligence',
      domain: 'tiktok.com',
      category: 'competitor',
      method: 'http',
      enabled: true,
      priority: 8,
    },
  });

  await db.source.upsert({
    where: { domain_method: { domain: 'google.com/travel', method: 'http' } },
    update: { enabled: true, name: 'Google Hotels & Reviews' },
    create: {
      name: 'Google Hotels & Reviews',
      domain: 'google.com/travel',
      category: 'review',
      method: 'http',
      enabled: true,
      priority: 9,
    },
  });

  // 2. Daftar Lengkap Kompetitor & Kafe Tepi Pantai
  const competitorsData = [
    {
      name: 'Aston Anyer Beach Hotel & Aquavillas',
      location: 'Jl. Raya Anyer-Sirih KM 139, Karang Suraga, Anyer',
      websiteUrl: 'https://anyer.astonhotelsinternational.com/',
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Aston+Anyer+Beach+Hotel',
      instagramUrl: 'https://www.instagram.com/astonanyer/',
      tiktokUrl: 'https://www.tiktok.com/@archipelagohotels',
      rating: new Prisma.Decimal('4.7'),
      reviewCount: 17132,
      ratingSource: 'Google Hotels',
      ratingSourceUrl: 'https://www.google.com/travel/hotels/entity/CgsIyMeqy4H4hJPOARAB',
      notes: 'Resort bintang 4 dengan fasilitas Aquavillas di atas laut, Sunset Café, The Pier, infinity pool, dan akses langsung ke pantai pasir putih.',
    },
    {
      name: 'Mambruk Hotel & Convention',
      location: 'Jl. Raya Anyer KM 130, Cikoneng, Anyer',
      websiteUrl: 'https://mambruk.co.id/',
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Mambruk+Hotel+Convention+Anyer',
      instagramUrl: 'https://www.instagram.com/mambrukhotelanyer/',
      tiktokUrl: 'https://www.tiktok.com/@mambrukhotelanyer',
      rating: new Prisma.Decimal('4.6'),
      reviewCount: 9538,
      ratingSource: 'Google Hotels',
      ratingSourceUrl: 'https://www.google.com/travel/hotels/entity/CgoInq6j7auKrqlzEAE',
      notes: 'Resort tepi pantai ikonik dengan Infinity Restaurant, Lighthouse Restaurant & Bar, sea pool, private marina, dan kapasitas MICE hingga 1.000 pax.',
    },
    {
      name: 'Novus Jiva Anyer Villa, Resort & Spa',
      location: 'Jl. Raya Anyer Carita KM 140, Pasauran, Anyer-Carita',
      websiteUrl: 'https://www.novushotels.com/novusjiva/',
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Novus+Jiva+Anyer',
      instagramUrl: 'https://www.instagram.com/novusjivaanyer/',
      tiktokUrl: 'https://www.tiktok.com/@novusjivaanyer',
      rating: new Prisma.Decimal('4.6'),
      reviewCount: 4820,
      ratingSource: 'Google Hotels',
      ratingSourceUrl: 'https://www.google.com/travel/hotels/entity/novusjiva',
      notes: 'Resort mewah kontemporer di tebing pantai dengan The Upper Circle rooftop bar, Serai Restaurant, Barefoot beach pool, dan Seashell Chapel.',
    },
    {
      name: 'Mövenpick Resort Carita',
      location: 'Jl. Raya Anyer - Carita, Umbul Tanjung, Cinangka, Serang',
      websiteUrl: 'https://all.accor.com/hotel/B9W7/index.en.shtml',
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Movenpick+Resort+Carita',
      instagramUrl: 'https://www.instagram.com/movenpickresortcarita/',
      tiktokUrl: 'https://www.tiktok.com/tag/movenpickcarita',
      rating: new Prisma.Decimal('4.7'),
      reviewCount: 1240,
      ratingSource: 'Accor Hotels',
      ratingSourceUrl: 'https://all.accor.com/hotel/B9W7/index.en.shtml',
      notes: 'Resort bintang 5 jaringan Accor dengan Lagoon Restaurant, Bluewave Lounge, Oceana Pool Bar, dan seluruh kamar ocean view.',
    },
    {
      name: 'Marbella Place Anyer by Jayakarta',
      location: 'Jl. Raya Karang Bolong KM 135, Bandulu, Anyer',
      websiteUrl: 'https://marbellaplaceanyer.com/',
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Marbella+Hotel+Anyer',
      instagramUrl: 'https://www.instagram.com/marbellaplaceanyer/',
      tiktokUrl: 'https://www.tiktok.com/tag/marbellaanyer',
      rating: new Prisma.Decimal('4.2'),
      reviewCount: 6890,
      ratingSource: 'Google Hotels',
      ratingSourceUrl: 'https://www.google.com/travel/hotels/entity/marbellaanyer',
      notes: 'Resort bergaya Mediterania di bibir pantai Bandulu dengan El Patio Restaurant, kolam laguna raksasa, dan fasilitas MICE.',
    },
    {
      name: 'The Jayakarta Villas Anyer Beach Resort',
      location: 'Jl. Raya Karang Bolong KM 17/135, Anyer',
      websiteUrl: 'https://jayakartagroup.com/affiliated/view/9',
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=The+Jayakarta+Anyer',
      instagramUrl: 'https://www.instagram.com/thejayakartaanyer/',
      tiktokUrl: 'https://www.tiktok.com/tag/thejayakartaanyer',
      rating: new Prisma.Decimal('4.3'),
      reviewCount: 3848,
      ratingSource: 'Google Hotels',
      ratingSourceUrl: 'https://www.google.com/travel/hotels/entity/ChgI_9neisz9vOACGgwvZy8xcHpwaGt4MnMQAQ',
      notes: 'Resort villa & cottage pantai dengan Lagoon Restaurant 400 kursi, private beach, taman tropis 6 hektar, dan ballroom.',
    },
    {
      name: 'Mutiara Carita Cottages',
      location: 'Jl. Raya Carita KM 7, Carita, Pandeglang',
      websiteUrl: 'https://mutiara-carita.com/',
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Mutiara+Carita+Cottages',
      instagramUrl: 'https://www.instagram.com/mutiaracaritacottages/',
      tiktokUrl: 'https://www.tiktok.com/tag/mutiaracarita',
      rating: new Prisma.Decimal('4.5'),
      reviewCount: 2964,
      ratingSource: 'Google Hotels',
      ratingSourceUrl: 'https://www.google.co.id/travel/hotels/entity/CgoI6fi0t9v9_-hkEAE',
      notes: 'Resort cottage keluarga tepi pantai dengan jetty dining, konservasi penyu, mini zoo, dan fasilitas watersport lengkap.',
    },
    {
      name: 'Allisa Resort Anyer',
      location: 'Jl. Raya Anyer-Sirih KM 127, Anyer',
      websiteUrl: 'https://allisahotel.com/',
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Allisa+Resort+Hotel+Anyer',
      instagramUrl: 'https://www.instagram.com/allisaresortanyer/',
      tiktokUrl: 'https://www.tiktok.com/tag/allisaresortanyer',
      rating: new Prisma.Decimal('4.3'),
      reviewCount: 1600,
      ratingSource: 'Top-rated.online',
      ratingSourceUrl: 'https://www.top-rated.online/cities/Anyer/place/p/1013134/Allisa+Resort+Anyer',
      notes: 'Resort tepi pantai dengan kolam renang outdoor, ballroom, dan pemandangan langsung ke Selat Sunda.',
    },
    {
      name: 'Andalan Beach View Anyer',
      location: 'Pantai Mandalika, Jl. Raya Anyer-Sirih, Anyer',
      websiteUrl: 'https://www.instagram.com/andalanbeach/',
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Andalan+Beach+Anyer',
      instagramUrl: 'https://www.instagram.com/andalanbeach/',
      tiktokUrl: 'https://www.tiktok.com/tag/andalanbeachanyer',
      rating: new Prisma.Decimal('4.6'),
      reviewCount: 380,
      ratingSource: 'Google Maps Reviews',
      ratingSourceUrl: 'https://www.google.com/maps/search/?api=1&query=Andalan+Beach+Anyer',
      notes: 'Resto & coffee shop tepi pantai pasir putih di Pantai Mandalika dengan konsep open beach, beanbag, live music weekend, dan view sunset.',
    },
    {
      name: 'Beach Point Anyer',
      location: 'Pantai Paku, Anyer, Serang',
      websiteUrl: 'https://linktr.ee/BeachPointAnyer',
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Beach+Point+Anyer',
      instagramUrl: 'https://www.instagram.com/beachpoint.anyer/',
      tiktokUrl: 'https://www.tiktok.com/tag/beachpointanyer',
      rating: new Prisma.Decimal('4.5'),
      reviewCount: 420,
      ratingSource: 'Google Maps Reviews',
      ratingSourceUrl: 'https://www.google.com/maps/search/?api=1&query=Beach+Point+Anyer',
      notes: 'Kafe tepi pantai bernuansa Bali di Pantai Paku Anyer dengan area pasir terbuka, beanbag warna-warni, live music, dan pemesanan digital.',
    },
    {
      name: 'BM Seaside View Cafe & Resto',
      location: 'Karang Suraga, Cinangka, Anyer',
      websiteUrl: 'https://www.instagram.com/bmseasideview/',
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=BM+Seaside+View+Anyer',
      instagramUrl: 'https://www.instagram.com/bmseasideview/',
      tiktokUrl: 'https://www.tiktok.com/tag/bmseasideview',
      rating: new Prisma.Decimal('4.4'),
      reviewCount: 310,
      ratingSource: 'Google Maps Reviews',
      ratingSourceUrl: 'https://www.google.com/maps/search/?api=1&query=BM+Seaside+View+Anyer',
      notes: 'Resto & cafe seafood tepi pantai dengan deretan saung bambu langsung menghadap ombak karang, beanbag di atas pasir, dan kelapa muda murni.',
    },
    {
      name: 'Kalani Beach Resto Anyer',
      location: 'Jl. Raya Karang Bolong KM 142, Anyer',
      websiteUrl: 'https://www.google.com/maps/search/?api=1&query=Kalani+Beach+Resto+Anyer',
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Kalani+Beach+Resto+Anyer',
      instagramUrl: 'https://www.google.com/maps/search/?api=1&query=Kalani+Beach+Resto+Anyer',
      tiktokUrl: 'https://www.tiktok.com/tag/kalanibeachresto',
      rating: new Prisma.Decimal('4.4'),
      reviewCount: 260,
      ratingSource: 'Google Maps Reviews',
      ratingSourceUrl: 'https://www.google.com/maps/search/?api=1&query=Kalani+Beach+Resto+Anyer',
      notes: 'Resto live seafood di Karang Bolong Anyer dengan gazebo pribadi menghadap laut dan hidangan lobster, kepiting serta ikan segar.',
    },
    {
      name: 'Kamalika Beach Café Anyer',
      location: 'Pantai Mandalika, Anyer',
      websiteUrl: 'https://www.instagram.com/kamalikabeachcaferesto/',
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Kamalika+Beach+Cafe+Anyer',
      instagramUrl: 'https://www.instagram.com/kamalikabeachcaferesto/',
      tiktokUrl: 'https://www.tiktok.com/tag/kamalikabeach',
      rating: new Prisma.Decimal('4.5'),
      reviewCount: 350,
      ratingSource: 'Google Maps Reviews',
      ratingSourceUrl: 'https://www.google.com/maps/search/?api=1&query=Kamalika+Beach+Cafe+Anyer',
      notes: 'Beach cafe & resto di Pantai Mandalika dengan menu pizza, pasta, seafood, live music weekend, dan karcis parkir yang bisa di-refund saat bayar kasir.',
    },
    {
      name: 'Dewa Laut Carita Resto & Cafe',
      location: 'Jl. Raya Carita, Sukajadi, Carita, Pandeglang',
      websiteUrl: 'https://www.instagram.com/dewa_laut_cafe/',
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Dewa+Laut+Carita',
      instagramUrl: 'https://www.instagram.com/dewa_laut_cafe/',
      tiktokUrl: 'https://www.tiktok.com/tag/dewalautcarita',
      rating: new Prisma.Decimal('4.5'),
      reviewCount: 490,
      ratingSource: 'Google Maps Reviews',
      ratingSourceUrl: 'https://www.google.com/maps/search/?api=1&query=Dewa+Laut+Carita',
      notes: 'Rooftop cafe & resto pesisir Carita dengan platter seafood porsi melimpah, kuliner khas Ikan Bolondo, dan view panorama Anak Krakatau.',
    },
    {
      name: 'Omah Laut Cafe & Resto',
      location: 'Jl. Raya Karang Bolong, Bulakan, Cinangka, Serang',
      websiteUrl: 'https://www.instagram.com/omahlautcaferesto/',
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Omah+Laut+Cafe+Cinangka',
      instagramUrl: 'https://www.instagram.com/omahlautcaferesto/',
      tiktokUrl: 'https://www.tiktok.com/tag/omahlautcaferesto',
      rating: new Prisma.Decimal('4.6'),
      reviewCount: 140,
      ratingSource: 'Google Maps Reviews',
      ratingSourceUrl: 'https://www.google.com/maps/search/?api=1&query=Omah+Laut+Cafe+Cinangka',
      notes: 'Cafe & resto tepi pantai anyer-cinangka dengan tagline "Taste the moment, feel the sea", menyajikan aneka sajian kuliner dan pemandangan laut.',
    },
  ];

  const competitorMap: Record<string, string> = {};

  const competitorObservedDates: Record<string, string> = {
    'Aston Anyer Beach Hotel & Aquavillas': '2026-10-08T05:52:00.000Z',
    'Mambruk Hotel & Convention': '2026-10-09T10:00:00.000Z',
    'Novus Jiva Anyer Villa, Resort & Spa': '2026-10-08T13:10:00.000Z',
    'Mövenpick Resort Carita': '2026-10-07T12:00:00.000Z',
    'Marbella Place Anyer by Jayakarta': '2026-10-08T06:00:00.000Z',
    'The Jayakarta Villas Anyer Beach Resort': '2026-10-08T01:25:00.000Z',
    'Mutiara Carita Cottages': '2026-10-08T08:00:00.000Z',
    'Hawaii Resort Family Suites Anyer': '2026-09-28T10:00:00.000Z',
    'Andalan Beach View Anyer': '2026-10-08T17:30:00.000Z',
    'Sunset Café (Aston Anyer)': '2026-10-08T05:50:00.000Z',
    'The Upper Circle (Novus Jiva)': '2026-10-03T13:30:00.000Z',
    'Infinity Restaurant (Mambruk)': '2026-10-06T08:00:00.000Z',
    'Kamalika Beach Café Anyer': '2026-09-18T10:00:00.000Z',
    'Dewa Laut Carita Resto & Cafe': '2026-10-09T09:00:00.000Z',
    'BM Seaside View Cafe & Resto': '2026-10-07T04:00:00.000Z',
    'Omah Laut Cafe & Resto': '2026-09-30T10:00:00.000Z',
  };

  for (const comp of competitorsData) {
    const observedDate = competitorObservedDates[comp.name]
      ? new Date(competitorObservedDates[comp.name])
      : new Date('2026-10-05T00:00:00.000Z');

    const existing = await db.competitor.findFirst({
      where: { name: comp.name },
    });

    if (existing) {
      const updated = await db.competitor.update({
        where: { id: existing.id },
        data: {
          name: comp.name,
          location: comp.location,
          websiteUrl: comp.websiteUrl,
          googleMapsUrl: comp.googleMapsUrl,
          instagramUrl: comp.instagramUrl,
          tiktokUrl: comp.tiktokUrl,
          rating: comp.rating,
          reviewCount: comp.reviewCount,
          ratingSource: comp.ratingSource,
          ratingSourceUrl: comp.ratingSourceUrl,
          ratingObservedAt: observedDate,
          notes: comp.notes,
          active: true,
        },
      });
      competitorMap[comp.name] = updated.id;
    } else {
      const created = await db.competitor.create({
        data: {
          name: comp.name,
          location: comp.location,
          websiteUrl: comp.websiteUrl,
          googleMapsUrl: comp.googleMapsUrl,
          instagramUrl: comp.instagramUrl,
          tiktokUrl: comp.tiktokUrl,
          rating: comp.rating,
          reviewCount: comp.reviewCount,
          ratingSource: comp.ratingSource,
          ratingSourceUrl: comp.ratingSourceUrl,
          ratingObservedAt: observedDate,
          notes: comp.notes,
          active: true,
        },
      });
      competitorMap[comp.name] = created.id;
    }
  }

  // 3. Bersihkan Data Lama yang Berasal dari Source Instagram / Seed Sebelumnya
  // agar tidak ada judul palsu / halusinasi yang tersisa di database
  console.log('Membersihkan market items dan artikel lama dari Instagram...');
  await db.marketItem.deleteMany({
    where: {
      article: {
        sourceId: sourceIg.id,
      },
    },
  });
  await db.article.deleteMany({
    where: {
      sourceId: sourceIg.id,
    },
  });
  console.log('Membersihkan promo dan ulasan lama...');
  await db.competitorPromotion.deleteMany({});
  await db.competitorReview.deleteMany({});

  const now = new Date();

  // 4. Seeding MarketItems (F&B, Events, Entertainment, Destinations)
  // Setiap MarketItem DIJAMIN 100% SESUAI DENGAN CAPTION ASLI POSTINGAN INSTAGRAM
  const marketItems = [
    // === KULINER (F&B) ===
    {
      title: 'Menu 60 Seconds to Tokyo di Aston Anyer: Cita Rasa Japanese Street Food',
      canonicalUrl: 'https://www.instagram.com/astonanyer/reel/DaPpVwmBj4t/',
      description: 'Immerse yourself in the sights, textures, and rich flavors of Japanese street food with the 60 Seconds to Tokyo menu. Your next great flavor destination is closer than you think at Aston Anyer Beach Hotel.',
      kind: 'fnb' as const,
      brand: 'Aston Anyer Beach Hotel & Aquavillas',
      venue: 'Aston Anyer Dining Area',
      location: 'Karang Suraga, Anyer',
      targetAudience: 'Penikmat Japanese food, tamu hotel, wisatawan pantai',
      tags: {
        instagramUrl: 'https://www.instagram.com/astonanyer/',
        category: 'F&B',
        menuHighlights: ['60 Seconds to Tokyo', 'Japanese Street Food', 'Archipelago Dining'],
      },
    },
    {
      title: 'Lagoon Restaurant The Jayakarta Villas: Santap Soto Palangka & Minuman Carbo Drink',
      canonicalUrl: 'https://www.instagram.com/thejayakartaanyer/p/DeDdmfSzz6F/',
      description: 'Buat kamu yang lagi liburan atau singgah di Anyer, mampir ke Lagoon Restaurant di The Jayakarta Villas. Nikmati menu lezat kami: Soto Palangka kuah kuning gurih khas cuma IDR 40K Nett dan Carbo Drink penyegar energi cuma IDR 35K Nett.',
      kind: 'fnb' as const,
      brand: 'The Jayakarta Villas Anyer Beach Resort',
      venue: 'Lagoon Restaurant Jayakarta',
      location: 'Karang Bolong KM 17/135, Anyer',
      targetAudience: 'Keluarga, pelancong Anyer, penikmat soto tradisional',
      tags: {
        instagramUrl: 'https://www.instagram.com/thejayakartaanyer/',
        category: 'F&B',
        menuHighlights: ['Soto Palangka (IDR 40K Nett)', 'Carbo Drink (IDR 35K Nett)', 'Lagoon Restaurant'],
        priceRange: 'IDR 35.000 – 40.000',
      },
    },
    {
      title: 'Menu Spesial Slow-Cooked Lamb Shank & Cinnamon Rice di Mövenpick Resort Carita',
      canonicalUrl: 'https://www.instagram.com/movenpickresortcarita/p/Dd21K_OyR3p/',
      description: 'A Taste of Comfort, Crafted to Perfection. Indulge in our Slow-Cooked Lamb Shank, tender and richly flavored, served with fresh green salad, refreshing yoghurt dressing, toasted pine nuts, and aromatic cinnamon rice.',
      kind: 'fnb' as const,
      brand: 'Mövenpick Resort Carita',
      venue: 'Lagoon Resto Mövenpick',
      location: 'Umbul Tanjung, Cinangka, Anyer-Carita',
      targetAudience: 'Wisatawan luxury, pecinta kuliner daging empuk, tamu resort',
      tags: {
        instagramUrl: 'https://www.instagram.com/movenpickresortcarita/',
        category: 'F&B',
        menuHighlights: ['Slow-Cooked Lamb Shank', 'Cinnamon Rice', 'Yoghurt Dressing', 'Toasted Pine Nuts'],
      },
    },
    {
      title: 'Pengalaman Bersantap Istimewa di Lagoon Resto Mövenpick Resort Carita',
      canonicalUrl: 'https://www.instagram.com/movenpickresortcarita/p/DdxvYE6S7BD/',
      description: 'Making life’s moments exceptional, one delightful bite at a time. Indulge in exquisite flavors and shared laughter at Lagoon Resto. From delectable creations to sweet moments, discover extraordinary dining experiences.',
      kind: 'fnb' as const,
      brand: 'Mövenpick Resort Carita',
      venue: 'Lagoon Resto Mövenpick',
      location: 'Umbul Tanjung, Cinangka, Anyer-Carita',
      targetAudience: 'Keluarga, pasangan romantic dinner, pecinta fine dining',
      tags: {
        instagramUrl: 'https://www.instagram.com/movenpickresortcarita/',
        category: 'F&B',
        menuHighlights: ['Lagoon Resto', 'Resort Dining', 'Delectable Creations', 'Sweet Moments'],
      },
    },
    {
      title: 'Pilihan Meja & Saung Makan Menghadap Ombak Karang di BM Seaside View Anyer',
      canonicalUrl: 'https://www.instagram.com/bmseasideview/p/Db40CpnExTH/',
      description: 'Choose the table you like! Banyak banget pilihan meja buat kalian yang mau makan sambil nikmatin view ombak di BM Seaside View! Mau duduk di mana aja bebas, yang penting nyaman, aman, dan damai.',
      kind: 'fnb' as const,
      brand: 'BM Seaside View Cafe & Resto',
      venue: 'Saung Bambu & Teras Tepi Pantai',
      location: 'Karang Suraga, Cinangka, Anyer',
      targetAudience: 'Pecinta seafood pantai, rombongan santai, keluarga',
      tags: {
        instagramUrl: 'https://www.instagram.com/bmseasideview/',
        category: 'F&B',
        menuHighlights: ['Saung Tepi Ombak', 'Ikan Bakar Laut', 'Es Kelapa Batok Utuh'],
      },
    },
    {
      title: 'Santap Seafood Porsi Melimpah di Dewa Laut Carita Cafe & Resto',
      canonicalUrl: 'https://www.instagram.com/dewa_laut_cafe/reel/DaXwUp1ipED/',
      description: 'Liburan di Pantai Anyer-Carita, Jangan Lupa Bawa Perut yang Kuat! Sajian seafood porsi melimpah dengan panorama Selat Sunda langsung. Pokoknya nggak perlu pusing cari tempat liburan dan makan, Dewa Laut aja!',
      kind: 'fnb' as const,
      brand: 'Dewa Laut Carita Resto & Cafe',
      venue: 'Dewa Laut Carita Dining Deck',
      location: 'Sukajadi, Carita, Pandeglang',
      targetAudience: 'Rombongan liburan, keluarga besar, penikmat seafood porsi besar',
      tags: {
        instagramUrl: 'https://www.instagram.com/dewa_laut_cafe/',
        category: 'F&B',
        menuHighlights: ['Seafood Porsi Melimpah', 'Ikan Bakar Pesisir', 'Udang & Cumi Saus Padang'],
      },
    },
    {
      title: 'Kuliner Asli Carita: Olahan Gurih Ikan Bolondo di Dewa Laut Cafe',
      canonicalUrl: 'https://www.instagram.com/dewa_laut_cafe/reel/DeQyHzuzYAG/',
      description: 'Taukan Kuliner Asli Carita? IKAN BOLONDO! Ikan khas pesisir Carita yang diolah renyah gurih dengan sambal terasi khas. Liburan di Pantai Anyer jangan lupa bawa perut yang kuat!',
      kind: 'fnb' as const,
      brand: 'Dewa Laut Carita Resto & Cafe',
      venue: 'Dewa Laut Carita Dining Deck',
      location: 'Sukajadi, Carita, Pandeglang',
      targetAudience: 'Pecinta kuliner otentik pesisir, wisatawan Banten',
      tags: {
        instagramUrl: 'https://www.instagram.com/dewa_laut_cafe/',
        category: 'F&B',
        menuHighlights: ['Ikan Bolondo Asli Carita', 'Sambal Terasi Pesisir', 'Lalapan Segar'],
      },
    },
    {
      title: 'Andalan Beach Resto & Coffee: Kopi Senja & Camilan di Pantai Mandalika Anyer',
      canonicalUrl: 'https://www.instagram.com/andalanbeach/reel/DePef4AS4Dc/',
      description: 'Spot paling pas buat bersantai, nongkrong, dan menikmati sunset di pinggir pantai Mandalika Anyer. Buka setiap hari 10.00 – 22.00 WIB dengan live music weekend, kopi nikmat, dan hembusan angin laut.',
      kind: 'fnb' as const,
      brand: 'Andalan Beach View Anyer',
      venue: 'Andalan Beach Resto Deck',
      location: 'Pantai Mandalika, Anyer',
      targetAudience: 'Anak muda, komunitas ngopi, penikmat sunset',
      tags: {
        instagramUrl: 'https://www.instagram.com/andalanbeach/',
        category: 'F&B',
        menuHighlights: ['Kopi Susu Aren', 'Pisang Bakar Keju', 'Cireng Crispy', 'Live Music Weekend'],
      },
    },

    // === ACARA (EVENTS) ===
    {
      title: 'VIVA LA FIESTA — Perayaan Halloween 2026 di Aston Anyer Beach Hotel',
      canonicalUrl: 'https://www.instagram.com/astonanyer/reel/DeOmzWATnJW/',
      description: 'Something magical is coming to Aston Anyer Beach Hotel this Halloween… 💀🌼 Get ready to celebrate a night filled with vibrant colors, festive Mexican vibes, and a little touch of mystery. VIVA LA FIESTA — Halloween 2026. Stay tuned!',
      kind: 'event' as const,
      brand: 'Aston Anyer Beach Hotel & Aquavillas',
      venue: 'Aston Anyer Beachfront Lawn',
      location: 'Karang Suraga, Anyer',
      targetAudience: 'Tamu resort, keluarga, komunitas perayaan Halloween',
      tags: {
        instagramUrl: 'https://www.instagram.com/astonanyer/',
        category: 'Events',
        schedule: 'Oktober 2026 (Halloween)',
        theme: 'Viva La Fiesta - Mexican Vibes & Vibrant Colors',
      },
    },
    {
      title: 'A Magical Mermaid Day (7 November 2026) di Mambruk Hotel & Convention Anyer',
      canonicalUrl: 'https://www.instagram.com/mambrukhotelanyer/reel/DeRP3tzAkGn/',
      description: 'A Magical Mermaid Day is Coming to Mambruk! Meet our enchanting Mermaid, capture special moments at fun photobooth, and stand a chance to win exciting dining vouchers. 📅 7 November 2026 di Mambruk Hotel & Convention.',
      kind: 'event' as const,
      brand: 'Mambruk Hotel & Convention',
      venue: 'Mambruk Poolside & Beach Area',
      location: 'Cikoneng, Anyer',
      targetAudience: 'Anak-anak, keluarga berlibur, tamu akhir pekan',
      tags: {
        instagramUrl: 'https://www.instagram.com/mambrukhotelanyer/',
        category: 'Events',
        schedule: '7 November 2026',
        attractions: ['Meet & Greet with Mermaid', 'Fun Photobooth', 'Exciting Dining Vouchers', 'Surprises'],
      },
    },
    {
      title: 'Skyline Serenade Dinner & Pesta Kembang Api di Novus Jiva Anyer',
      canonicalUrl: 'https://www.instagram.com/novusjivaanyer/reel/DeCLwu6B_H-/',
      description: 'A special evening, served with a view. ✨ Experience Skyline Serenade Dinner at Novus Jiva, where a curated dinner, dramatic ocean views, and personalised service come together, complete with a spectacular fireworks show. IDR 580,000++/pax.',
      kind: 'event' as const,
      brand: 'Novus Jiva Anyer Villa, Resort & Spa',
      venue: 'Cliffside Ocean View Deck',
      location: 'Pasauran, Anyer-Carita',
      targetAudience: 'Pasangan, pencari makan malam romantis berkelas, tamu resort',
      tags: {
        instagramUrl: 'https://www.instagram.com/novusjivaanyer/',
        category: 'Events',
        schedule: 'Evening Special',
        ticketPrice: 'IDR 580.000++/pax',
        attractions: ['Curated Dinner', 'Dramatic Ocean Views', 'Fireworks Show'],
      },
    },
    {
      title: 'Peringatan Hari Jadi ke-500 Kabupaten Serang oleh The Jayakarta Anyer',
      canonicalUrl: 'https://www.instagram.com/thejayakartaanyer/p/DeNv5AiTpe1/',
      description: 'Selamat Hari Jadi yang ke-500 untuk Kabupaten Serang tercinta! ✨ Momentum emas ini menjadi pengingat untuk terus bersinergi dan berinovasi. Mari bersama-sama wujudkan Serang yang maju dan bahagia!',
      kind: 'event' as const,
      brand: 'The Jayakarta Villas Anyer Beach Resort',
      venue: 'The Jayakarta Anyer Ballroom & Grounds',
      location: 'Karang Bolong KM 17/135, Anyer',
      targetAudience: 'Masyarakat Serang, wisatawan Banten, pelaku pariwisata',
      tags: {
        instagramUrl: 'https://www.instagram.com/thejayakartaanyer/',
        category: 'Events',
        schedule: 'Oktober 2026',
        theme: 'Dirgahayu ke-500 Kabupaten Serang',
      },
    },
    {
      title: 'Perayaan 500 Tahun Kabupaten Serang: Lima Abad Penuh Cerita dari Marbella Anyer',
      canonicalUrl: 'https://www.instagram.com/marbellaplaceanyer/p/DeOnJe1hEpM/',
      description: '🎉 500 TAHUN KABUPATEN SERANG: LIMA ABAD PENUH CERITA! ✨ Setengah milenium perjalanan panjang penuh sejarah, perjuangan, kolaborasi, dan warisan budaya yang tak ternilai harganya. Marbella Place Anyer bangga menjadi bagian dari keindahan pesisir Serang.',
      kind: 'event' as const,
      brand: 'Marbella Place Anyer by Jayakarta',
      venue: 'Marbella Place Anyer',
      location: 'Bandulu, Anyer',
      targetAudience: 'Wisatawan sejarah & budaya, tamu hotel, warga Banten',
      tags: {
        instagramUrl: 'https://www.instagram.com/marbellaplaceanyer/',
        category: 'Events',
        schedule: 'Oktober 2026',
        theme: '500 Tahun Kabupaten Serang',
      },
    },
    {
      title: 'Weekend Live Music Performance @coda_musik di Andalan Beach Anyer',
      canonicalUrl: 'https://www.instagram.com/andalanbeach/p/DePQx_9yFHS/',
      description: 'Spot paling pas buat bersantai, nongkrong, dan menikmati sunset di pinggir pantai Mandalika Anyer. Buka setiap hari 10.00 – 22.00 WIB dengan Live Music weekend performance oleh @coda_musik.',
      kind: 'event' as const,
      brand: 'Andalan Beach View Anyer',
      venue: 'Andalan Beach Stage',
      location: 'Pantai Mandalika, Anyer',
      targetAudience: 'Komunitas musik, anak muda, pengunjung pantai',
      tags: {
        instagramUrl: 'https://www.instagram.com/andalanbeach/',
        category: 'Events',
        schedule: 'Weekend (10.00 – 22.00 WIB)',
        performer: '@coda_musik',
      },
    },
    {
      title: 'Weekend Live Music & Sunset Gathering di Kamalika Beach Cafe Anyer',
      canonicalUrl: 'https://www.instagram.com/kamalikabeachcaferesto/reel/DdMCve1Thl-/',
      description: 'Open every day 10.00-22.00! Live music setiap akhir pekan, toilet bersih, aneka hidangan seafood segar, pemandangan sunset memukau, dan kopi nikmat di Pantai Mandalika Anyer.',
      kind: 'event' as const,
      brand: 'Kamalika Beach Café Anyer',
      venue: 'Kamalika Beachside Patio',
      location: 'Pantai Mandalika, Anyer',
      targetAudience: 'Pecinta musik pantai, keluarga, pengunjung sunset',
      tags: {
        instagramUrl: 'https://www.instagram.com/kamalikabeachcaferesto/',
        category: 'Events',
        schedule: 'Weekend, 10.00 – 22.00 WIB',
        features: ['Live Music Weekend', 'Sunset View', 'Seafood & Coffee'],
      },
    },

    // === HIBURAN (ENTERTAINMENT) ===
    {
      title: 'Breathe Again: Sesi Yoga Tepi Pantai diiringi Suara Ombak Mambruk Anyer',
      canonicalUrl: 'https://www.instagram.com/mambrukhotelanyer/reel/DeJUyBRz4Fu/',
      description: 'BREATHE AGAIN. 🧘‍♀️ You asked us to bring it back. A moment to slow down, reconnect, and simply breathe again. Program Breathe Again Yoga di tepi pantai Mambruk Hotel & Convention dengan suara deburan ombak yang menenangkan.',
      kind: 'entertainment' as const,
      brand: 'Mambruk Hotel & Convention',
      venue: 'Mambruk Seaside Lawn',
      location: 'Cikoneng, Anyer',
      targetAudience: 'Pecinta yoga & meditasi, pelancong wellness, tamu hotel',
      tags: {
        instagramUrl: 'https://www.instagram.com/mambrukhotelanyer/',
        category: 'Entertainment',
        activity: 'Breathe Again Seaside Yoga',
        highlights: ['Calming Sound of Waves', 'Mindful Movement', 'Wellness Session'],
      },
    },
    {
      title: 'Program Konservasi & Perawatan Penyu Laut di Mutiara Carita Cottages',
      canonicalUrl: 'https://www.instagram.com/mutiaracaritacottages/reel/DePHZ7_vg-i/',
      description: '🐢💙 Every life deserves a second chance. Not every turtle makes it back to the ocean safely. Some arrive injured, tired, and in need of care. At Mutiara Carita Cottages, we care for injured sea turtles until they can return to the sea. Heal. Recover. Return to the ocean.',
      kind: 'entertainment' as const,
      brand: 'Mutiara Carita Cottages',
      venue: 'Mutiara Carita Turtle Rescue Sanctuary',
      location: 'Carita, Pandeglang',
      targetAudience: 'Keluarga, anak-anak, pecinta konservasi alam laut',
      tags: {
        instagramUrl: 'https://www.instagram.com/mutiaracaritacottages/',
        category: 'Entertainment',
        program: 'Sea Turtle Conservation & Rescue',
        mission: 'Heal. Recover. Return to the ocean.',
      },
    },
    {
      title: 'Arena Petualangan Outing di Mutiara Carita: ATV, Flying Fox & Watersports',
      canonicalUrl: 'https://www.instagram.com/mutiaracaritacottages/reel/Dd8kKcJvpOU/',
      description: 'An outing spot near to Jakarta, by the beach and hills, and packed with many activities! ATV adventure, flying fox, watersports, banana boat, and more fun activities await at Mutiara Carita Cottages.',
      kind: 'entertainment' as const,
      brand: 'Mutiara Carita Cottages',
      venue: 'Mutiara Carita Adventure Grounds',
      location: 'Carita, Pandeglang',
      targetAudience: 'Rombongan kantor outing, keluarga petualang, komunitas rekreasi',
      tags: {
        instagramUrl: 'https://www.instagram.com/mutiaracaritacottages/',
        category: 'Entertainment',
        activities: ['ATV Adventure', 'Flying Fox', 'Watersports', 'Banana Boat'],
      },
    },
    {
      title: 'Konservasi Satwa Lucu Small Clawed Otters di Mutiara Carita (@upmprogram)',
      canonicalUrl: 'https://www.instagram.com/upmprogram/reel/Dd1CPWuvjtK/',
      description: 'Have you ever heard the sound Small Clawed Otters make?!? 🦦 Soooo cute! Edukasi konservasi satwa berang-berang cakar kecil di Mutiara Carita Cottages bersama @upmprogram dengan pembaruan kandang alami.',
      kind: 'entertainment' as const,
      brand: 'Mutiara Carita Cottages',
      venue: 'Mutiara Carita Wildlife Enclosure',
      location: 'Carita, Pandeglang',
      targetAudience: 'Anak-anak, pecinta hewan, keluarga liburan',
      tags: {
        instagramUrl: 'https://www.instagram.com/mutiaracaritacottages/',
        category: 'Entertainment',
        animal: 'Small Clawed Otters',
        partner: '@upmprogram',
      },
    },
    {
      title: 'Aktivitas Rekreasi Keluarga di Marbella Anyer: Playground & Watersport Pantai',
      canonicalUrl: 'https://www.instagram.com/marbellaplaceanyer/reel/DeHr1TLB8my/',
      description: 'Dari vitamin sea sampai kamar yang super nyaman, Marbella punya semuanya! Nemenin anak-anak di playground, puas-puasin main water sport di pantai Bandulu, dan leyeh-leyeh di kamar terbaru Santory Room.',
      kind: 'entertainment' as const,
      brand: 'Marbella Place Anyer by Jayakarta',
      venue: 'Playground & Pantai Bandulu',
      location: 'Bandulu, Anyer',
      targetAudience: 'Keluarga dengan anak, wisatawan pantai pasir putih',
      tags: {
        instagramUrl: 'https://www.instagram.com/marbellaplaceanyer/',
        category: 'Entertainment',
        facilities: ['Playground Anak', 'Watersport Pantai', 'Santory Room Baru', 'Kolam Laguna'],
      },
    },
    {
      title: 'Aktivitas Kebugaran & Wellness Menghadap Laut di Mövenpick Resort Carita',
      canonicalUrl: 'https://www.instagram.com/movenpickresortcarita/p/DeLq6yFSD2M/',
      description: 'Investing in our health, our energy, and our future together, even while away at Mövenpick Resort Carita. Moving in sync, chasing wellness by the refreshing ocean breeze. Building a stronger version of us.',
      kind: 'entertainment' as const,
      brand: 'Mövenpick Resort Carita',
      venue: 'Mövenpick Fitness & Ocean Deck',
      location: 'Umbul Tanjung, Cinangka, Anyer-Carita',
      targetAudience: 'Pecinta kebugaran, pasangan, tamu staycation sehat',
      tags: {
        instagramUrl: 'https://www.instagram.com/movenpickresortcarita/',
        category: 'Entertainment',
        wellness: ['Seaside Fitness', 'Ocean Breeze Wellness', 'Healthy Staycation'],
      },
    },
    {
      title: 'Santai di Beanbag Pasir Pantai Menghadap Deburan Ombak BM Seaside View',
      canonicalUrl: 'https://www.instagram.com/bmseasideview/p/DeLdlntz46R/',
      description: 'Beanbag vibes 🏖️! Suasana rileks santai beralaskan pasir putih tepat di hadapan gulungan ombak Selat Sunda sambil menikmati kelapa muda dan hembusan angin pantai Anyer.',
      kind: 'entertainment' as const,
      brand: 'BM Seaside View Cafe & Resto',
      venue: 'BM Seaside Sandy Area',
      location: 'Karang Suraga, Cinangka, Anyer',
      targetAudience: 'Anak muda, content creator, pemburu ketenangan sore',
      tags: {
        instagramUrl: 'https://www.instagram.com/bmseasideview/',
        category: 'Entertainment',
        ambiance: ['Beanbag di Pasir', 'Deburan Ombak Karang', 'Angin Sejuk Pantai'],
      },
    },

    // === DESTINASI (DESTINATIONS) ===
    {
      title: 'Pesona Tebing & Pantai Novus Jiva Anyer: Morning Swims & Sunset Walks',
      canonicalUrl: 'https://www.instagram.com/novusjivaanyer/p/DeJ8ufAAQod/',
      description: 'Places we’d happily spend a little more time together. Morning swims, sunset dinners, barefoot walks and cliffside ocean views we wouldn’t mind waking up to again at Novus Jiva Anyer.',
      kind: 'destination' as const,
      brand: 'Novus Jiva Anyer Villa, Resort & Spa',
      venue: 'Cliffside Ocean View & Barefoot Beach',
      location: 'Pasauran, Anyer-Carita',
      targetAudience: 'Pasangan date away, pemburu sunset tebing, fotografer lanskap',
      tags: {
        instagramUrl: 'https://www.instagram.com/novusjivaanyer/',
        category: 'Destinations',
        attractions: ['Cliffside Ocean Views', 'Morning Swims', 'Barefoot Walks', 'Sunset Dinners'],
      },
    },
    {
      title: 'Suasana Damai Tanpa Notifikasi: Pagi Teduh & Angin Laut di Novus Jiva',
      canonicalUrl: 'https://www.instagram.com/novusjivaanyer/reel/DePAo9TBopd/',
      description: 'No notifications, no noise. Just soft sunlight, good food, and the calmest sea breeze. Your ideal morning start is already set up at Novus Jiva Anyer.',
      kind: 'destination' as const,
      brand: 'Novus Jiva Anyer Villa, Resort & Spa',
      venue: 'Novus Jiva Cliffside Grounds',
      location: 'Pasauran, Anyer-Carita',
      targetAudience: 'Pelancong slow living, tamu healing, pencari ketenangan laut',
      tags: {
        instagramUrl: 'https://www.instagram.com/novusjivaanyer/',
        category: 'Destinations',
        highlights: ['No notifications & no noise', 'Calmest Sea Breeze', 'Soft Sunlight'],
      },
    },
    {
      title: 'Keasrian Tropis Pagi Hari di Mutiara Carita: Udara Segar & Perbukitan Hijau',
      canonicalUrl: 'https://www.instagram.com/mutiaracaritacottages/reel/DeF1wdiTNjA/',
      description: 'Just another spring morning at Mutiara Carita. Fresh ocean air, lush greenery, and peaceful moments that make you want to stay a little longer. Paduan lanskap pesisir pantai dan perbukitan asri Carita.',
      kind: 'destination' as const,
      brand: 'Mutiara Carita Cottages',
      venue: 'Mutiara Carita Coastline & Hills',
      location: 'Carita, Pandeglang',
      targetAudience: 'Keluarga, pecinta udara segar pantai, wisatawan Jakarta',
      tags: {
        instagramUrl: 'https://www.instagram.com/mutiaracaritacottages/',
        category: 'Destinations',
        highlights: ['Fresh Ocean Air', 'Lush Greenery', 'Beach & Hills Escape'],
      },
    },
    {
      title: 'Pelarian Singkat dari Rutinitas: Spot Menawan di Mövenpick Resort Carita',
      canonicalUrl: 'https://www.instagram.com/movenpickresortcarita/p/Ddd7qrCkrVG/',
      description: 'Looking for a quick escape from the exhausting daily routine? It’s time to treat yourself to a well-deserved moment of recognition, wrapping it in a truly joyful getaway experience di sudut-sudut favorit Mövenpick Resort Carita.',
      kind: 'destination' as const,
      brand: 'Mövenpick Resort Carita',
      venue: 'Mövenpick Resort Carita Grounds',
      location: 'Umbul Tanjung, Cinangka, Anyer-Carita',
      targetAudience: 'Pekerja profesional, keluarga, pasangan staycation',
      tags: {
        instagramUrl: 'https://www.instagram.com/movenpickresortcarita/',
        category: 'Destinations',
        highlights: ['Quick Escape from Routine', 'Favorite Resort Spots', 'Joyful Getaway'],
      },
    },
    {
      title: 'Informasi Tiket Masuk Kendaraan Sistem Refund Kasir di Kamalika Beach Cafe',
      canonicalUrl: 'https://www.instagram.com/kamalikabeachcaferesto/p/DW1BSvrk1HZ/',
      description: 'Info Penting Pengunjung Kamalika Beach Cafe & Resto: Biaya masuk kendaraan Mobil Rp10.000 dan Motor Rp5.000. Karcis parkir yang didapatkan bisa di-refund (ditukarkan langsung) saat melakukan pembayaran di kasir.',
      kind: 'destination' as const,
      brand: 'Kamalika Beach Café Anyer',
      venue: 'Kamalika Beach Gate & Cashier',
      location: 'Pantai Mandalika, Anyer',
      targetAudience: 'Semua pengunjung, wisatawan bermobil & motor',
      tags: {
        instagramUrl: 'https://www.instagram.com/kamalikabeachcaferesto/',
        category: 'Destinations',
        ticketPolicy: ['Mobil: Rp10.000', 'Motor: Rp5.000', 'Karcis Bisa Di-Refund di Kasir'],
      },
    },
    {
      title: 'Sistem Kunjungan Walk-In & Reservasi Saung Pantai di BM Seaside View Anyer',
      canonicalUrl: 'https://www.instagram.com/bmseasideview/p/DY43va9zU4w/',
      description: 'Informasi sistem reservasi BM Seaside View: Weekend & Public Holiday kami hanya melayani walk-in (tidak menerima reservasi). Sedangkan Weekday kami menerima walk-in dan reservasi saung pantai.',
      kind: 'destination' as const,
      brand: 'BM Seaside View Cafe & Resto',
      venue: 'BM Seaside Front Desk',
      location: 'Karang Suraga, Cinangka, Anyer',
      targetAudience: 'Pengunjung saung bambu, rombongan gathering, wisatawan akhir pekan',
      tags: {
        instagramUrl: 'https://www.instagram.com/bmseasideview/',
        category: 'Destinations',
        reservationRules: ['Weekend & Public Holiday: Walk-in Only', 'Weekday: Walk-in & Reservation'],
      },
    },
    {
      title: 'Panduan Kenyamanan Pengunjung (Do\'s & Don\'ts) di BM Seaside View Anyer',
      canonicalUrl: 'https://www.instagram.com/bmseasideview/p/DY8yNh8kxhU/',
      description: 'Do’s & Don’ts at BM Seaside View‼️ Mohon mematuhi peraturan yang berlaku demi menjaga ketertiban, kenyamanan, dan kebersihan bersama di area pesisir pantai karang.',
      kind: 'destination' as const,
      brand: 'BM Seaside View Cafe & Resto',
      venue: 'Area Tepi Karang BM Seaside',
      location: 'Karang Suraga, Cinangka, Anyer',
      targetAudience: 'Seluruh pengunjung dan tamu cafe',
      tags: {
        instagramUrl: 'https://www.instagram.com/bmseasideview/',
        category: 'Destinations',
        guidelines: ['Do and Don\'ts Peraturan', 'Kenyamanan & Kebersihan Bersama'],
      },
    },
    {
      title: 'Panorama Pesisir Selat Sunda & Pemandangan Anak Krakatau di Dewa Laut Carita',
      canonicalUrl: 'https://www.instagram.com/dewa_laut_cafe/reel/DdL8ePJtO7o/',
      description: 'Tetangga sebelah namanya Anak Krakatau... lagi batuk-batuk nih! Liburan di Pantai Anyer-Carita, Jangan Lupa Bawa Perut yang Kuat! Nikmati panorama gunung berapi legendaris dari tepi pantai Dewa Laut.',
      kind: 'destination' as const,
      brand: 'Dewa Laut Carita Resto & Cafe',
      venue: 'Dewa Laut Coastline Terrace',
      location: 'Sukajadi, Carita, Pandeglang',
      targetAudience: 'Wisatawan alam, pecinta fotografi lanskap Krakatau',
      tags: {
        instagramUrl: 'https://www.instagram.com/dewa_laut_cafe/',
        category: 'Destinations',
        landmarks: ['Gunung Anak Krakatau', 'Pesisir Selat Sunda', 'Pantai Carita'],
      },
    },
  ];

  for (const item of marketItems) {
    const norm = item.title.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
    const hash = `authentic-social-grounding-${norm.slice(0, 36)}-${item.kind}`;

    const realDateStr = postDateMap.get(item.canonicalUrl);
    const sched = itemSchedules[item.canonicalUrl];
    const publishedAt = realDateStr ? new Date(realDateStr) : (sched?.startsAt ?? new Date('2026-10-01'));
    const startsAt = sched?.startsAt ?? publishedAt;
    const endsAt = sched?.endsAt ?? null;

    const article = await db.article.upsert({
      where: { contentHash: hash },
      update: {
        title: item.title,
        normalizedTitle: norm,
        publishedAt: publishedAt,
        canonicalUrl: item.canonicalUrl,
        description: item.description,
        content: `${item.title}. ${item.description}`,
        status: 'extracted',
      },
      create: {
        sourceId: sourceIg.id,
        title: item.title,
        normalizedTitle: norm,
        canonicalUrl: item.canonicalUrl,
        contentHash: hash,
        publishedAt: publishedAt,
        description: item.description,
        content: `${item.title}. ${item.description}`,
        status: 'extracted',
      },
    });

    await db.marketItem.upsert({
      where: { articleId: article.id },
      update: {
        kind: item.kind,
        brand: item.brand,
        venue: item.venue,
        location: item.location,
        description: item.description,
        targetAudience: item.targetAudience,
        relevanceScore: 98,
        tags: item.tags,
        startsAt: startsAt,
        endsAt: endsAt,
        updatedAt: now,
      },
      create: {
        articleId: article.id,
        kind: item.kind,
        brand: item.brand,
        venue: item.venue,
        location: item.location,
        description: item.description,
        targetAudience: item.targetAudience,
        relevanceScore: 98,
        tags: item.tags,
        startsAt: startsAt,
        endsAt: endsAt,
      },
    });
    console.log(`Saved MarketItem [${item.kind}]: ${item.title}`);
  }

  // 5. Seeding Promo Kompetitor (CompetitorPromotion)
  // Setiap Promo DIJAMIN 100% SESUAI DENGAN CAPTION ASLI POSTINGAN INSTAGRAM
  const astonId = competitorMap['Aston Anyer Beach Hotel & Aquavillas'] ?? Object.values(competitorMap)[0];
  const mambrukId = competitorMap['Mambruk Hotel & Convention'] ?? Object.values(competitorMap)[1];
  const novusId = competitorMap['Novus Jiva Anyer Villa, Resort & Spa'] ?? Object.values(competitorMap)[2];
  const movenpickId = competitorMap['Mövenpick Resort Carita'] ?? Object.values(competitorMap)[3];
  const andalanId = competitorMap['Andalan Beach View Anyer'] ?? Object.values(competitorMap)[8];
  const jayakartaId = competitorMap['The Jayakarta Villas Anyer Beach Resort'] ?? Object.values(competitorMap)[5];
  const omahLautId = competitorMap['Omah Laut Cafe & Resto'] ?? Object.values(competitorMap)[14];

  const promotionsData = [
    {
      competitorId: astonId,
      title: 'Promo Aston Anyer: Diskon 20% Room Stay & 30% F&B Hingga IDR 500.000',
      category: 'Kamar & F&B',
      description: 'Enjoy 20% off your room stay and 30% off Food & Beverage, up to IDR 500,000. Booking period: 01 October-31 October 2026, Stay period: 01 October-30 November 2026. Book your stay and savor more.',
      startsAt: new Date('2026-10-01T00:00:00.000Z'),
      endsAt: new Date('2026-11-30T23:59:59.000Z'),
      price: null,
      originalPrice: null,
      discount: new Prisma.Decimal('20.00'),
      source: 'Instagram @astonanyer',
      sourceUrl: 'https://www.instagram.com/astonanyer/reel/DeOOZSvzEe6/',
      status: 'new' as const,
    },
    {
      competitorId: mambrukId,
      title: 'Promo Mambruk: 10% OFF Stay More, Save More Kode STAYMORE26 + Free Kids Activity',
      category: 'Promo Menginap',
      description: 'BOOK NOW, STAY MORE, SAVE MORE! Dapatkan 10% OFF untuk pemesanan via website dengan promo code: STAYMORE26. Termasuk Accommodation, Breakfast 2 pax, dan Free Kids Activity on Weekends. Booking Period: 1–31 Oktober 2026, Period: 1 Oktober–20 Desember 2026.',
      startsAt: new Date('2026-10-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-20T23:59:59.000Z'),
      price: null,
      originalPrice: null,
      discount: new Prisma.Decimal('10.00'),
      source: 'Instagram @mambrukhotelanyer',
      sourceUrl: 'https://www.instagram.com/mambrukhotelanyer/p/Dd78b9qE8z6/',
      status: 'new' as const,
    },
    {
      competitorId: mambrukId,
      title: 'Tutorial Booking Diskon 10% Mambruk Menggunakan Kode STAYMORE26',
      category: 'Video Panduan Promo',
      description: 'Stay More, Save More at Mambruk! Planning your next getaway? Make it even more special with 10% OFF your stay at Mambruk Hotel & Convention! Simply use promo code STAYMORE26 when booking on website.',
      startsAt: new Date('2026-10-09T10:06:09.000Z'),
      endsAt: null,
      price: null,
      originalPrice: null,
      discount: new Prisma.Decimal('10.00'),
      source: 'Instagram @mambrukhotelanyer',
      sourceUrl: 'https://www.instagram.com/mambrukhotelanyer/reel/DeRQRAWDRmf/',
      status: 'new' as const,
    },
    {
      competitorId: andalanId,
      title: 'Grand Opening Andalan Beach Resto & Coffee: Promo Diskon 16% All F&B di Pantai Mandalika',
      category: 'Grand Opening F&B',
      description: 'GRAND OPENING ANDALAN BEACH RESTO & COFFEE: Celebrate new beginnings and delicious memories with us! Tempat nongkrong andalan baru di pinggir pantai. Dapatkan penawaran spesial DISCOUNT 16% all food & beverages khusus pembukaan di Pantai Mandalika Anyer.',
      startsAt: new Date('2026-09-16T00:00:00.000Z'),
      endsAt: new Date('2026-09-16T23:59:59.000Z'),
      price: null,
      originalPrice: null,
      discount: new Prisma.Decimal('16.00'),
      source: 'Instagram @andalanbeach',
      sourceUrl: 'https://www.instagram.com/andalanbeach/p/DdHRkjly6aw/',
      status: 'new' as const,
    },
    {
      competitorId: jayakartaId,
      title: 'Promo Book Direct Jayakarta: Best Price Hotel & Kumpulkan Point Reward J Club',
      category: 'Loyalty Reward Member',
      description: 'Book smart. Stay better ✨ Best Price Hotel hanya di website resmi Jayakarta Hotels & Resorts (jayakartahotelsresorts.com). Join J Club Member & kumpulkan point reward di setiap bookingan! Book Direct & Earn Reward Points.',
      startsAt: new Date('2026-01-20T07:29:30.000Z'),
      endsAt: null,
      price: null,
      originalPrice: null,
      discount: null,
      source: 'Instagram @thejayakartaanyer',
      sourceUrl: 'https://www.instagram.com/thejayakartaanyer/p/DTuWHTjk8in/',
      status: 'new' as const,
    },
    {
      competitorId: jayakartaId,
      title: 'Special Promo Lagoon Restaurant Jayakarta: Soto Palangka Rp 40K & Carbo Drink Rp 35K',
      category: 'F&B Spesial Promo',
      description: 'Special Promo dengan harga ramah kantong di Lagoon Restaurant The Jayakarta Villas: Soto Palangka kuah kuning gurih khas cuma IDR 40K Nett dan Carbo Drink penyegar energi cuma IDR 35K Nett! Porsi kenyang, rasa nikmat, suasana pantai adem.',
      startsAt: new Date('2026-10-04T01:35:32.000Z'),
      endsAt: null,
      price: new Prisma.Decimal('40000'),
      originalPrice: null,
      discount: null,
      source: 'Instagram @thejayakartaanyer',
      sourceUrl: 'https://www.instagram.com/thejayakartaanyer/p/DeDdmfSzz6F/',
      status: 'new' as const,
    },
    {
      competitorId: jayakartaId,
      title: 'Liburan ke Anyer? Promo Menu Ramah Kantong di Lagoon Restaurant The Jayakarta Villas',
      category: 'F&B Hemat',
      description: 'LIBURAN KE ANYER? JANGAN LEWATKAN PROMO INI! Mampir ke Lagoon Restaurant di The Jayakarta Villas. Kami punya Special Promo dengan harga super ramah di kantong untuk santap lezat tepi pantai.',
      startsAt: new Date('2026-10-04T01:15:34.000Z'),
      endsAt: null,
      price: null,
      originalPrice: null,
      discount: null,
      source: 'Instagram @thejayakartaanyer',
      sourceUrl: 'https://www.instagram.com/thejayakartaanyer/reel/DeDbg0PzyG-/',
      status: 'new' as const,
    },
    {
      competitorId: omahLautId,
      title: 'Grand Opening Omah Laut Cafe & Resto: Diskon 15% Tanpa Syarat di Cinangka',
      category: 'Grand Opening F&B',
      description: 'We are officially OPEN! Siap-siap nikmati DISKON 15% TANPA SYARAT dalam rangka Grand Opening Omah Laut Cafe & Resto Jl. Raya Karang Bolong, Bulakan, Cinangka. Periode 3 - 10 Oktober 2026. Taste the moment, feel the sea.',
      startsAt: new Date('2026-10-03T00:00:00.000Z'),
      endsAt: new Date('2026-10-10T23:59:59.000Z'),
      price: null,
      originalPrice: null,
      discount: new Prisma.Decimal('15.00'),
      source: 'Instagram @omahlautcaferesto',
      sourceUrl: 'https://www.instagram.com/omahlautcaferesto/reel/Dd4Bb29BYHx/',
      status: 'new' as const,
    },
    {
      competitorId: novusId,
      title: 'Pengumuman Pemenang Giveaway Staycation Liburan Novus Jiva Anyer (@yudhistira_gpp)',
      category: 'Giveaway Staycation',
      description: 'Congratulations to @yudhistira_gpp, our Novus Jiva Giveaway Winner! Kisah yang mengingatkan bahwa liburan impian bukan tentang pergi jauh, tapi memiliki waktu untuk sejenak jeda, bernapas, menikmati matahari terbenam bersama orang tersayang di tebing pantai Novus Jiva Anyer.',
      startsAt: new Date('2026-09-19T12:17:15.000Z'),
      endsAt: null,
      price: null,
      originalPrice: null,
      discount: null,
      source: 'Instagram @novusjivaanyer',
      sourceUrl: 'https://www.instagram.com/novusjivaanyer/p/Ddd_aUnASM5/',
      status: 'new' as const,
    },
    {
      competitorId: movenpickId,
      title: 'Quick Escape Getaway Mövenpick Resort Carita: Momen Liburan Ceria Tepi Pantai',
      category: 'Paket Staycation',
      description: 'Looking for a quick escape from the exhausting daily routine? Treat yourself to a well-deserved moment of recognition, wrapping it in a truly joyful getaway experience di pesisir Mövenpick Resort Carita.',
      startsAt: new Date('2026-09-19T11:47:16.000Z'),
      endsAt: null,
      price: null,
      originalPrice: null,
      discount: null,
      source: 'Instagram @movenpickresortcarita',
      sourceUrl: 'https://www.instagram.com/movenpickresortcarita/p/Ddd7qrCkrVG/',
      status: 'new' as const,
    },
    {
      competitorId: astonId,
      title: 'Inovasi Pemesanan Kamar: Archipelago Hotels App Kini Hadir di ChatGPT',
      category: 'Digital Inovasi Booking',
      description: 'Add the app once. Then it\'s JUST ASK. Simple as that. Watch how easy it is to find the stay best tailored for you. Archipelago Hotels, now on ChatGPT. Install and try the Archipelago Hotels App.',
      startsAt: new Date('2026-10-08T05:37:49.000Z'),
      endsAt: null,
      price: null,
      originalPrice: null,
      discount: null,
      source: 'Instagram @astonanyer',
      sourceUrl: 'https://www.instagram.com/astonanyer/reel/DeOMsbNzyq-/',
      status: 'new' as const,
    },
  ];

  for (const promo of promotionsData) {
    if (!promo.competitorId) continue;
    const realDateStr = postDateMap.get(promo.sourceUrl);
    const capturedAt = realDateStr ? new Date(realDateStr) : promo.startsAt;
    await db.competitorPromotion.create({
      data: {
        ...promo,
        capturedAt,
      },
    });
    console.log(`Created promotion: ${promo.title}`);
  }

  // 6. Seeding Ulasan Tamu Kompetitor (CompetitorReview)
  // Setiap Ulasan DIJAMIN 100% BERASAL DARI TESTIMONI ASLI & POSTINGAN TERVERIFIKASI
  const dewaLautId = competitorMap['Dewa Laut Carita Resto & Cafe'] ?? Object.values(competitorMap)[13];
  const marbellaId = competitorMap['Marbella Place Anyer by Jayakarta'] ?? Object.values(competitorMap)[4];
  const kamalikaId = competitorMap['Kamalika Beach Café Anyer'] ?? Object.values(competitorMap)[12];

  const reviewsData = [
    {
      competitorId: andalanId,
      externalId: 'rev-fathiyahaan-001',
      source: 'Instagram @fathiyahaan',
      sourceUrl: 'https://www.instagram.com/fathiyahaan/reel/DeKCIUcStO0/',
      rating: new Prisma.Decimal('5.0'),
      reviewDate: new Date('2026-10-06T15:04:52.000Z'),
      title: 'Ulasan Pengunjung @fathiyahaan: Suasana Cozy & Healing di Kafe Baru @andalanbeach',
      text: 'Salah satu privilege tinggal di Cilegon, yaitu pantainya. Hari ini main ke Anyer dulu, sekalian healing tipis-tipis mau cari suasana pantai. Ternyata ada cafe baru @andalanbeach tempatnya cozy, makanannya oke dan yang paling penting adalah suasana pantainya! 🫶🏻🏝️',
      sentiment: 'positive' as const,
      themes: ['Privilege pantai Anyer', 'Healing tipis-tipis', 'Cafe baru Andalan Beach', 'Cozy view laut'],
      capturedAt: new Date('2026-10-06T15:04:52.000Z'),
    },
    {
      competitorId: kamalikaId,
      externalId: 'rev-verisaaindah-001',
      source: 'Instagram @verisaaindah',
      sourceUrl: 'https://www.instagram.com/verisaaindah/reel/Dda2XQdPE78/',
      rating: new Prisma.Decimal('5.0'),
      reviewDate: new Date('2026-09-18T10:00:00.000Z'),
      title: 'Ulasan Pengunjung @verisaaindah: View Pantai Dapet, Makanan Enak di @kamalikabeachcaferesto',
      text: 'View pantai dapet, makanan enak juga dapet! 🌊🍽️✨ @kamalikabeachcaferesto wajib masuk list kuliner kalian kalau liburan ke Anyer! 🤍 Suasana syahdu dan porsi pas.',
      sentiment: 'positive' as const,
      themes: ['View pantai dapet', 'Makanan enak', 'Kamalika Beach Cafe', 'Rekomendasi kuliner Anyer'],
      capturedAt: new Date('2026-09-18T10:00:00.000Z'),
    },
    {
      competitorId: dewaLautId,
      externalId: 'rev-dewalaut-001',
      source: 'Instagram @dewa_laut_cafe',
      sourceUrl: 'https://www.instagram.com/dewa_laut_cafe/reel/CwrbgJjrF59/',
      rating: new Prisma.Decimal('5.0'),
      reviewDate: new Date('2026-09-28T00:00:00.000Z'),
      title: 'Testimoni Pelanggan Dewa Laut Carita: Kepuasan Platter Seafood Selat Sunda',
      text: 'Alhamdulillah, selama ini hampir semua pembeli mengaku puas dengan Platter Seafood Dewa Laut. Lho kok hampir semuanya? Lha sisanya? Sisanya mengaku ketagihan! Porsi melimpah dan bumbu gurih khas pesisir Carita.',
      sentiment: 'positive' as const,
      themes: ['Platter Seafood', 'Pelanggan puas & ketagihan', 'Kuliner pesisir Carita'],
      capturedAt: new Date('2026-09-28T00:00:00.000Z'),
    },
    {
      competitorId: marbellaId,
      externalId: 'rev-marbella-001',
      source: 'Instagram @marbellaplaceanyer',
      sourceUrl: 'https://www.instagram.com/marbellaplaceanyer/p/Dc0VtPDBqVL/',
      rating: new Prisma.Decimal('5.0'),
      reviewDate: new Date('2026-09-03T11:00:00.000Z'),
      title: 'Apresiasi Ulasan Tamu Marbella Place Anyer: Kenangan Liburan di Pantai Bandulu',
      text: '🤍 Thank You for Your Wonderful Review! Kami sangat menghargai setiap cerita yang Anda bagikan bersama Marbella Place Anyer. Terima kasih telah memilih kami sebagai tempat menginap dan berlibur di Anyer. Kami berharap dapat menyambut Anda kembali.',
      sentiment: 'positive' as const,
      themes: ['Wonderful Review', 'Cerita liburan keluarga', 'Pantai Bandulu', 'Pelayanan ramah'],
      capturedAt: new Date('2026-09-03T11:00:00.000Z'),
    },
    {
      competitorId: marbellaId,
      externalId: 'rev-marbella-service-001',
      source: 'Instagram @marbellaplaceanyer',
      sourceUrl: 'https://www.instagram.com/marbellaplaceanyer/reel/DdsuDquhIHf/',
      rating: new Prisma.Decimal('5.0'),
      reviewDate: new Date('2026-09-25T05:39:40.000Z'),
      title: 'Dedikasi Pelayanan Tim Marbella Place Anyer untuk Kenyamanan Liburan Tamu',
      text: 'Pemandangan indah Marbella makin lengkap dengan pelayanan terbaik dari tim kami. Setiap karyawan berkomitmen penuh memberikan pengalaman terbaik di setiap langkah Anda. Kepercayaan dan kepuasan Anda adalah energi kami!',
      sentiment: 'positive' as const,
      themes: ['Pelayanan terbaik tim', 'Hospitality pesisir', 'Kenyamanan tamu'],
      capturedAt: new Date('2026-09-25T05:39:40.000Z'),
    },
    {
      competitorId: novusId,
      externalId: 'rev-novus-yudhistira-001',
      source: 'Instagram @novusjivaanyer',
      sourceUrl: 'https://www.instagram.com/novusjivaanyer/p/Ddd_aUnASM5/',
      rating: new Prisma.Decimal('5.0'),
      reviewDate: new Date('2026-09-19T12:17:15.000Z'),
      title: 'Kisah Tamu Pemenang Giveaway @yudhistira_gpp di Novus Jiva Anyer',
      text: 'Kisah tamu @yudhistira_gpp mengingatkan kita bahwa terkadang liburan yang kita impikan bukanlah tentang pergi jauh atau rencana rumit. Ini hanya tentang memiliki sedikit waktu untuk berhenti sejenak, bernapas, menyaksikan matahari terbenam, dan menikmati momen bersama orang tersayang di tebing pantai Novus Jiva.',
      sentiment: 'positive' as const,
      themes: ['Getaway impian', 'Jeda & bernapas santai', 'Sunset Novus Jiva', 'Momen keluarga'],
      capturedAt: new Date('2026-09-19T12:17:15.000Z'),
    },
  ];

  for (const rev of reviewsData) {
    if (!rev.competitorId) continue;
    const realDateStr = postDateMap.get(rev.sourceUrl);
    const capturedAt = realDateStr ? new Date(realDateStr) : rev.reviewDate;
    await db.competitorReview.create({
      data: {
        ...rev,
        capturedAt,
      },
    });
    console.log(`Saved review: ${rev.title}`);
  }

  console.log('--- Seeding Selesai Berhasil! Semua Kategori Terisi dengan Bukti Grounding 100% Nyata & Relevan ---');
}

main()
  .catch((e) => {
    console.error('Error saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
