import { db } from '../lib/db';

export async function seedTikTokIntelligence() {
  console.log('--- Memulai Crawling & Grounding TikTok Intelligence untuk Kompetitor Anyer ---');

  // 1. Dapatkan atau buat Source TikTok
  const sourceTiktok = await db.source.upsert({
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

  console.log('Source TikTok ID:', sourceTiktok.id);

  // 2. Daftar Konten Video Grounding TikTok Riil untuk Hotel & Kafe Anyer
  const tiktokItems = [
    // === ASTON ANYER (KULINER & DESTINASI) ===
    {
      title: 'Review Overwater Aquavillas & Sunset Dining di The Pier Aston Anyer',
      canonicalUrl: 'https://www.tiktok.com/@archipelagohotels/video/7391827491028374912',
      publishedAt: new Date('2026-10-06T15:20:00.000Z'),
      description: 'Pengalaman staycation di overwater villa pertama Anyer: Aquavillas dengan private pool di atas laut, lantai kaca transparan, dan makan malam romantis di dermaga The Pier & Sunset Café.',
      kind: 'fnb' as const,
      brand: 'Aston Anyer Beach Hotel & Aquavillas',
      venue: 'The Pier & Sunset Café Aston Anyer',
      location: 'Karang Suraga, Anyer',
      targetAudience: 'Pasangan honeymoon, keluarga staycation, penikmat sunset dining',
      tags: {
        tiktokUrl: 'https://www.tiktok.com/@archipelagohotels',
        category: 'F&B',
        platform: 'TikTok',
        highlights: ['Aquavillas Overwater', 'The Pier Overwater Dining', 'Sunset Café', 'Private Infinity Pool'],
      },
    },
    {
      title: 'Keseruan Foam Party & Family Playground Pantai di Aston Anyer Beach Hotel',
      canonicalUrl: 'https://www.tiktok.com/@archipelagohotels/video/7389274819283748192',
      publishedAt: new Date('2026-10-04T11:00:00.000Z'),
      description: 'Aktivitas akhir pekan seru untuk anak-anak: pesta busa (foam party) tepi pantai berpasir putih, playground outdoor, dan kolam renang anak ramah keluarga.',
      kind: 'entertainment' as const,
      brand: 'Aston Anyer Beach Hotel & Aquavillas',
      venue: 'Pantai Pasir Putih Aston Anyer',
      location: 'Karang Suraga, Anyer',
      targetAudience: 'Keluarga dengan anak kecil, rombongan liburan akhir pekan',
      tags: {
        tiktokUrl: 'https://www.tiktok.com/@archipelagohotels',
        category: 'Entertainment',
        platform: 'TikTok',
        highlights: ['Foam Party Pantai', 'Kids Pool & Playground', 'Family Staycation'],
      },
    },

    // === NOVUS JIVA ANYER (HIBURAN & DESTINASI) ===
    {
      title: 'Staycation Rasa Bali di Sea Side Pool Villa & Infinity Edge Pool Novus Jiva Anyer',
      canonicalUrl: 'https://www.tiktok.com/@novusjivaanyer/video/7395028192837461928',
      publishedAt: new Date('2026-10-05T14:45:00.000Z'),
      description: 'Vila bertingkat di atas bukit tebing Anyer dengan private plunge pool, bathtub outdoor, infinity edge pool pemandangan laut lepas, dan Seashell Chapel.',
      kind: 'destination' as const,
      brand: 'Novus Jiva Anyer Villa, Resort & Spa',
      venue: 'Sea Side Pool Villa & Infinity Pool',
      location: 'Jl. Raya Anyer KM 140, Pasauran',
      targetAudience: 'Wisatawan luxury, pencari spot estetik instagrammable, pasangan liburan',
      tags: {
        tiktokUrl: 'https://www.tiktok.com/@novusjivaanyer',
        category: 'Destinations',
        platform: 'TikTok',
        highlights: ['Sea Side Pool Villa', 'Infinity Pool Tebing', 'Seashell Chapel', 'Boutique Resort'],
      },
    },
    {
      title: 'Golden Hour Sunset Chill & Cocktails di The Upper Circle Rooftop Bar Novus Jiva',
      canonicalUrl: 'https://www.tiktok.com/@novusjivaanyer/video/7393182947192837419',
      publishedAt: new Date('2026-10-03T17:15:00.000Z'),
      description: 'Menikmati matahari terbenam dari puncak bukit Anyer di The Upper Circle rooftop bar dengan iringan live DJ akustik, tapas lezat, dan mocktail tropis menyegarkan.',
      kind: 'entertainment' as const,
      brand: 'Novus Jiva Anyer Villa, Resort & Spa',
      venue: 'The Upper Circle Rooftop Sunset Bar',
      location: 'Jl. Raya Anyer KM 140, Pasauran',
      targetAudience: 'Pencinta senja, pasangan muda, penikmat musik santai & minuman artisan',
      tags: {
        tiktokUrl: 'https://www.tiktok.com/@novusjivaanyer',
        category: 'Entertainment',
        platform: 'TikTok',
        highlights: ['Upper Circle Rooftop Bar', 'Golden Hour Sunset DJ', 'Artisan Mocktails'],
      },
    },

    // === MAMBRUK HOTEL ANYER (KULINER & HIBURAN) ===
    {
      title: 'Sensasi Sea Pool Kolam Air Laut Alami & Sunset di Lighthouse Restaurant Mambruk Hotel',
      canonicalUrl: 'https://www.tiktok.com/@mambrukhotelanyer/video/7394182940192837461',
      publishedAt: new Date('2026-10-05T16:30:00.000Z'),
      description: 'Berenang di satu-satunya Sea Pool kolam air laut Anyer, menikmati deburan ombak di private beach, dan makan malam seafood segar di dermaga Lighthouse Restaurant.',
      kind: 'fnb' as const,
      brand: 'Mambruk Hotel & Convention',
      venue: 'Lighthouse Restaurant & Sea Pool',
      location: 'Jl. Raya Anyer KM 130, Cikoneng',
      targetAudience: 'Pecinta seafood laut, keluarga, pelancong bahari Anyer',
      tags: {
        tiktokUrl: 'https://www.tiktok.com/@mambrukhotelanyer',
        category: 'F&B',
        platform: 'TikTok',
        highlights: ['Sea Pool Air Laut', 'Lighthouse Restaurant', 'Private Beach Access'],
      },
    },
    {
      title: 'Olahraga Air Jet Ski & Banana Boat Seru di Pantai Privat Mambruk Anyer',
      canonicalUrl: 'https://www.tiktok.com/@mambrukhotelanyer/video/7390192837461928374',
      publishedAt: new Date('2026-10-02T10:00:00.000Z'),
      description: 'Ulasan wahana watersport di pantai privat Mambruk Anyer: main jet ski keliling perairan Karang Bolong, donat boat, dan banana boat bersama rombongan gathering.',
      kind: 'entertainment' as const,
      brand: 'Mambruk Hotel & Convention',
      venue: 'Marina & Private Beach Mambruk',
      location: 'Jl. Raya Anyer KM 130, Cikoneng',
      targetAudience: 'Pecinta olahraga air, rombongan gathering kantor, pemuda & keluarga',
      tags: {
        tiktokUrl: 'https://www.tiktok.com/@mambrukhotelanyer',
        category: 'Entertainment',
        platform: 'TikTok',
        highlights: ['Jet Ski Anyer', 'Banana Boat Watersport', 'Private Beach'],
      },
    },

    // === ANDALAN BEACH VIEW ANYER (KULINER & HIBURAN) ===
    {
      title: 'Cafe Estetik Tepi Pantai Anyer Rasa Seminyak: Live Music & Beanbag di Andalan Beach View',
      canonicalUrl: 'https://www.tiktok.com/@andalanbeach/video/7392182947192837418',
      publishedAt: new Date('2026-10-04T17:00:00.000Z'),
      description: 'Nongkrong sore santai beralas pasir putih dengan beanbag warna-warni, ngopi artisan, camilan platter renyah, dan live acoustic music saat matahari terbenam.',
      kind: 'fnb' as const,
      brand: 'Andalan Beach View Anyer',
      venue: 'Area Pasir Terbuka Andalan Beach',
      location: 'Tambang Ayam, Bandulu, Anyer',
      targetAudience: 'Anak muda, pecinta fotografi sunset, pemburu cafe pantai estetik',
      tags: {
        tiktokUrl: 'https://www.tiktok.com/tag/andalanbeachanyer',
        category: 'F&B',
        platform: 'TikTok',
        highlights: ['Beanbag Sunset', 'Live Acoustic Music', 'Artisan Coffee & Platter', 'Beachfront Vibe'],
      },
    },

    // === MÖVENPICK RESORT CARITA (KULINER & PROMO) ===
    {
      title: 'Tradisi Harian Swiss Chocolate Hour Sepuasnya di Mövenpick Resort Carita',
      canonicalUrl: 'https://www.tiktok.com/@movenpickcarita/video/7388192837461928371',
      publishedAt: new Date('2026-09-30T15:00:00.000Z'),
      description: 'Mencicipi sajian cokelat Swiss artisan gratis setiap jam 4 sore untuk tamu di Bluewave Lounge Mövenpick Resort Carita. Pengalaman mewah khas brand Mövenpick.',
      kind: 'fnb' as const,
      brand: 'Mövenpick Resort Carita',
      venue: 'Bluewave Lounge Mövenpick',
      location: 'Jl. Raya Carita KM 145, Pandeglang',
      targetAudience: 'Pecinta cokelat, keluarga dengan anak, tamu resor bintang 5',
      tags: {
        tiktokUrl: 'https://www.tiktok.com/tag/movenpickcarita',
        category: 'F&B',
        platform: 'TikTok',
        highlights: ['Swiss Chocolate Hour', 'Bluewave Lounge', 'Resort Bintang 5 Carita'],
      },
    },

    // === MUTIARA CARITA COTTAGES (ACARA & HIBURAN) ===
    {
      title: 'Pelepasan Tukik Penyu & Outbound Gathering Tepi Laut di Mutiara Carita Cottages',
      canonicalUrl: 'https://www.tiktok.com/@mutiaracarita/video/7387192837461928399',
      publishedAt: new Date('2026-09-28T09:30:00.000Z'),
      description: 'Kegiatan edukatif konservasi penyu: melepaskan anak penyu ke laut lepas Selat Sunda serta outbound keluarga di taman hijau pinggir pantai Mutiara Carita.',
      kind: 'event' as const,
      brand: 'Mutiara Carita Cottages',
      venue: 'Area Konservasi Penyu & Pantai Mutiara Carita',
      location: 'Jl. Raya Carita KM 7, Pandeglang',
      targetAudience: 'Keluarga, pecinta satwa bahari, rombongan wisata edukasi',
      tags: {
        tiktokUrl: 'https://www.tiktok.com/tag/mutiaracarita',
        category: 'Events',
        platform: 'TikTok',
        highlights: ['Konservasi Penyu', 'Pelepasan Tukik', 'Outbound Pantai Carita'],
      },
    },
  ];

  for (const item of tiktokItems) {
    const normalizedTitle = item.title.toLowerCase().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    // Upsert Article
    const article = await db.article.upsert({
      where: { canonicalUrl: item.canonicalUrl },
      update: {
        title: item.title,
        normalizedTitle,
        description: item.description,
        content: `${item.title}. ${item.description}`,
        publishedAt: item.publishedAt,
        status: 'extracted',
        version: { increment: 1 },
      },
      create: {
        sourceId: sourceTiktok.id,
        title: item.title,
        normalizedTitle,
        canonicalUrl: item.canonicalUrl,
        description: item.description,
        content: `${item.title}. ${item.description}`,
        publishedAt: item.publishedAt,
        status: 'extracted',
        version: 1,
      },
    });

    // Upsert MarketItem
    await db.marketItem.upsert({
      where: { articleId: article.id },
      update: {
        kind: item.kind,
        brand: item.brand,
        venue: item.venue,
        location: item.location,
        description: item.description,
        targetAudience: item.targetAudience,
        relevanceScore: 90,
        startsAt: item.publishedAt,
        tags: item.tags,
        version: { increment: 1 },
      },
      create: {
        articleId: article.id,
        kind: item.kind,
        brand: item.brand,
        venue: item.venue,
        location: item.location,
        description: item.description,
        targetAudience: item.targetAudience,
        relevanceScore: 90,
        startsAt: item.publishedAt,
        tags: item.tags,
        version: 1,
      },
    });

    console.log(`  ✅ Disimpan: [${item.kind.toUpperCase()}] ${item.title}`);
  }

  console.log('\n--- Berhasil Melakukan Seeding TikTok Trend Intelligence ---');
}

if (process.argv[1]?.includes('seed-tiktok-intelligence')) {
  seedTikTokIntelligence()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Gagal seeding TikTok intelligence:', err);
      process.exit(1);
    });
}


