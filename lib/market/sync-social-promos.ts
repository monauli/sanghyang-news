import { db } from '../db';
import { Prisma, PromotionStatus } from '@prisma/client';

export interface CompetitorSocialPromoItem {
  competitorName: string;
  competitorHandle: string;
  platform: 'instagram' | 'tiktok';
  title: string;
  category: 'Kamar & Menginap' | 'F&B & Kuliner' | 'Acara & Live Music' | 'Keluarga & Anak' | 'Wellness & Relaksasi' | 'Digital & Booking';
  description: string;
  startsAt: Date;
  endsAt?: Date;
  price?: number;
  originalPrice?: number;
  discount?: number;
  source: string;
  sourceUrl: string;
  imageUrl?: string;
  counterStrategy: string;
}

export const AUTHENTIC_COMPETITOR_PROMOS_AND_EVENTS: CompetitorSocialPromoItem[] = [
  // === ASTON ANYER BEACH HOTEL & AQUAVILLAS (@astonanyer) ===
  {
    competitorName: 'Aston Anyer Beach Hotel & Aquavillas',
    competitorHandle: '@astonanyer',
    platform: 'instagram',
    title: 'Promo Diskon 20% Menginap & 30% F&B Hingga IDR 500.000',
    category: 'Kamar & Menginap',
    description: 'Nikmati diskon 20% untuk menginap di kamar/aquavillas dan 30% untuk F&B hingga IDR 500.000. Periode pemesanan 1–31 Oktober 2026, periode menginap 1 Oktober–30 November 2026.',
    startsAt: new Date('2026-10-01T00:00:00.000Z'),
    endsAt: new Date('2026-11-30T23:59:59.000Z'),
    discount: 20,
    source: 'Instagram @astonanyer',
    sourceUrl: 'https://www.instagram.com/astonanyer/reel/DeOOZSvzEe6/',
    imageUrl: 'https://scontent.cdninstagram.com/v/t51.82787-15/838218838_18632762029037126_1081738424434666879_n.jpg',
    counterStrategy: 'Tawarkan bundling Menginap Sanghyang + Gratis Akses Onsen Air Belerang Alami 24 Jam & Voucher Makan 25% di Sunset Grill untuk mengimbangi daya tarik diskon Aston.',
  },
  {
    competitorName: 'Aston Anyer Beach Hotel & Aquavillas',
    competitorHandle: '@astonanyer',
    platform: 'instagram',
    title: 'VIVA LA FIESTA – Perayaan Halloween 2026 Mexican Festive Night',
    category: 'Acara & Live Music',
    description: 'Perayaan malam Halloween bertema Meksiko penuh warna, musik pesta, dan suasana magis di tepi pantai Aston Anyer Beach Hotel pada 31 Oktober 2026.',
    startsAt: new Date('2026-10-31T17:00:00.000Z'),
    endsAt: new Date('2026-10-31T23:59:59.000Z'),
    source: 'Instagram @astonanyer',
    sourceUrl: 'https://www.instagram.com/astonanyer/reel/DeOmzWATnJW/',
    imageUrl: 'https://scontent.cdninstagram.com/v/t51.82787-15/839125549_18632802952037126_8080375384859218082_n.jpg',
    counterStrategy: 'Gelar "Beach Bonfire & Acoustic Sunset" di Dragon Beach Club Sanghyang pada malam akhir pekan dengan tiket masuk gratis untuk tamu resort dan penawaran BBQ platter spesial.',
  },
  {
    competitorName: 'Aston Anyer Beach Hotel & Aquavillas',
    competitorHandle: '@astonanyer',
    platform: 'instagram',
    title: 'Menu 60 Seconds to Tokyo: Kuliner Japanese Street Food',
    category: 'F&B & Kuliner',
    description: 'Eksplorasi cita rasa kuliner jalanan khas Tokyo dengan menu 60 Seconds to Tokyo di Sunset Bar & Lounge dan Anindya Restaurant Aston Anyer.',
    startsAt: new Date('2026-07-01T00:00:00.000Z'),
    endsAt: new Date('2026-11-15T23:59:59.000Z'),
    source: 'Instagram @astonanyer',
    sourceUrl: 'https://www.instagram.com/astonanyer/reel/DaPpVwmBj4t/',
    imageUrl: 'https://scontent.cdninstagram.com/v/t51.82787-15/732206026_18600657385037126_237552141870644419_n.jpg',
    counterStrategy: 'Kuatkan branding Sunset Grill Sanghyang dengan seafood bakar hidup (live catches) khas Selat Sunda langsung di bibir pantai pasir putih yang tidak dimiliki konsep resto indoor.',
  },
  {
    competitorName: 'Aston Anyer Beach Hotel & Aquavillas',
    competitorHandle: '@astonanyer',
    platform: 'instagram',
    title: 'Inovasi Booking Kamar Otomatis Terintegrasi ChatGPT AI',
    category: 'Digital & Booking',
    description: 'Inovasi reservasi hotel Archipelago kini terhubung dengan integrasi OpenAI ChatGPT: tambahkan aplikasi sekali, lalu lakukan pemesanan cerdas langsung dari obrolan.',
    startsAt: new Date('2026-10-08T00:00:00.000Z'),
    endsAt: new Date('2026-12-31T23:59:59.000Z'),
    source: 'Instagram @astonanyer',
    sourceUrl: 'https://www.instagram.com/astonanyer/reel/DeOMsbNzyq-/',
    counterStrategy: 'Optimalkan respons cepat WhatsApp Official Hotline Sanghyang dengan jaminan Best Rate Guarantee, bebas antre, dan fleksibilitas early check-in.',
  },

  // === NOVUS JIVA ANYER VILLA, RESORT & SPA (@novusjivaanyer) ===
  {
    competitorName: 'Novus Jiva Anyer Villa, Resort & Spa',
    competitorHandle: '@novusjivaanyer',
    platform: 'instagram',
    title: 'Skyline Serenade Dinner & Pesta Kembang Api di Rooftop The Upper Circle',
    category: 'Acara & Live Music',
    description: 'Santap malam romantis di ketinggian tebing laut dengan menu curated dinner, alunan musik romantis, pemandangan dramatis Samudra Hindia, dan pertunjukan kembang api megah (IDR 580.000++/pax).',
    startsAt: new Date('2026-10-03T18:00:00.000Z'),
    endsAt: new Date('2026-11-20T23:59:59.000Z'),
    price: 580000,
    source: 'Instagram @novusjivaanyer',
    sourceUrl: 'https://www.instagram.com/novusjivaanyer/reel/DeCLwu6B_H-/',
    counterStrategy: 'Tawarkan "Private Beachfront Cabana Dinner" di tepi pantai Sanghyang dengan harga terjangkau (Rp 399.000/pasang) dengan keintiman suara ombak laut langsung tanpa jarak tebing.',
  },
  {
    competitorName: 'Novus Jiva Anyer Villa, Resort & Spa',
    competitorHandle: '@novusjivaanyer',
    platform: 'instagram',
    title: 'Giveaway Staycation Liburan Novus Jiva Anyer',
    category: 'Digital & Booking',
    description: 'Aktivasi interaktif media sosial dengan hadiah voucher staycation gratis bagi pengikut yang membagikan momen dan cerita liburan paling inspiratif (@yudhistira_gpp).',
    startsAt: new Date('2026-09-19T00:00:00.000Z'),
    endsAt: new Date('2026-10-31T23:59:59.000Z'),
    source: 'Instagram @novusjivaanyer',
    sourceUrl: 'https://www.instagram.com/novusjivaanyer/p/Ddd_aUnASM5/',
    counterStrategy: 'Buat kontes foto Instagram Reels / TikTok bertajuk #CeritaSanghyang dengan reward voucher berendam Onsen Belerang Alami atau makan malam Sunset Grill.',
  },
  {
    competitorName: 'Novus Jiva Anyer Villa, Resort & Spa',
    competitorHandle: '@novusjivaanyer',
    platform: 'instagram',
    title: 'Golden Hour Sunset Chill & Signature Mocktails The Upper Circle',
    category: 'F&B & Kuliner',
    description: 'Santai sore menikmati angin laut tenang dan matahari terbenam dengan koktail/mocktail racikan khusus di lounge terbuka tebing Pasauran.',
    startsAt: new Date('2026-10-08T16:00:00.000Z'),
    endsAt: new Date('2026-12-31T23:59:59.000Z'),
    source: 'Instagram @novusjivaanyer',
    sourceUrl: 'https://www.instagram.com/novusjivaanyer/reel/DePAo9TBopd/',
    counterStrategy: 'Adakan "Happy Hour Sunset Session" (Buy 1 Get 1 minuman tropis) di Dragon Beach Club Sanghyang pukul 17.00–18.30 WIB dengan beanbag tepat di garis pantai.',
  },

  // === MAMBRUK HOTEL & CONVENTION ANYER (@mambrukhotelanyer) ===
  {
    competitorName: 'Mambruk Hotel & Convention',
    competitorHandle: '@mambrukhotelanyer',
    platform: 'instagram',
    title: 'Promo Diskon 10% Stay More, Save More Kode STAYMORE26',
    category: 'Kamar & Menginap',
    description: 'Pesan sekarang hemat lebih banyak dengan diskon 10% menggunakan kode promo STAYMORE26 di website resmi. Termasuk akomodasi, sarapan 2 orang, dan aktivitas anak gratis di akhir pekan.',
    startsAt: new Date('2026-10-01T00:00:00.000Z'),
    endsAt: new Date('2026-12-20T23:59:59.000Z'),
    discount: 10,
    source: 'Instagram @mambrukhotelanyer',
    sourceUrl: 'https://www.instagram.com/mambrukhotelanyer/p/Dd78b9qE8z6/',
    counterStrategy: 'Luncurkan paket "Sanghyang Family Getaway" potongan 15% untuk menginap 2 malam, sudah mencakup sarapan dan tiket masuk kolam renang air panas belerang.',
  },
  {
    competitorName: 'Mambruk Hotel & Convention',
    competitorHandle: '@mambrukhotelanyer',
    platform: 'instagram',
    title: 'A Magical Mermaid Day (7 November 2026) Pertunjukan Putri Duyung Kolam Renang',
    category: 'Keluarga & Anak',
    description: 'Pertunjukan spesial putri duyung untuk keluarga dan anak-anak, sesi meet and greet, photobooth seru, dan kesempatan memenangkan voucher makan menarik di area kolam renang Mambruk.',
    startsAt: new Date('2026-11-07T09:00:00.000Z'),
    endsAt: new Date('2026-11-07T18:00:00.000Z'),
    source: 'Instagram @mambrukhotelanyer',
    sourceUrl: 'https://www.instagram.com/mambrukhotelanyer/reel/DeRP3tzAkGn/',
    counterStrategy: 'Adakan agenda akhir pekan anak di Sanghyang: "Kids Painting & Sand Castle Competition" di area rumput asri Sanghyang Resort dengan bingkisan menarik.',
  },
  {
    competitorName: 'Mambruk Hotel & Convention',
    competitorHandle: '@mambrukhotelanyer',
    platform: 'instagram',
    title: 'Breathe Again: Sesi Seaside Yoga & Relaksasi Tepi Laut',
    category: 'Wellness & Relaksasi',
    description: 'Momen menenangkan diri dan bernafas lega di tepi laut Anyer melalui sesi yoga bersama instruktur berlisensi diiringi deburan ombak dan angin sejuk.',
    startsAt: new Date('2026-10-06T06:30:00.000Z'),
    endsAt: new Date('2026-11-30T23:59:59.000Z'),
    source: 'Instagram @mambrukhotelanyer',
    sourceUrl: 'https://www.instagram.com/mambrukhotelanyer/reel/DeJUyBRz4Fu/',
    counterStrategy: 'D\'Spa Sanghyang merupakan satu-satunya fasilitas di Banten dengan Onsen Air Panas Belerang Alami vulkanik. Gaungkan paket "Natural Sulfur Soak & Balinese Massage" sebagai terapi kesehatan tubuh premium.',
  },

  // === THE JAYAKARTA VILLAS ANYER BEACH RESORT (@thejayakartaanyer) ===
  {
    competitorName: 'The Jayakarta Villas Anyer Beach Resort',
    competitorHandle: '@thejayakartaanyer',
    platform: 'instagram',
    title: 'Special Promo Lagoon Restaurant: Soto Palangka Rp 40K & Carbo Drink Rp 35K',
    category: 'F&B & Kuliner',
    description: 'Sajian hangat dengan harga ramah kantong di Lagoon Restaurant: Soto Palangka kuah kuning gurih khas Rp 40.000 Nett dan Carbo Drink penghilang dahaga Rp 35.000 Nett.',
    startsAt: new Date('2026-10-04T00:00:00.000Z'),
    endsAt: new Date('2026-11-30T23:59:59.000Z'),
    price: 40000,
    source: 'Instagram @thejayakartaanyer',
    sourceUrl: 'https://www.instagram.com/thejayakartaanyer/p/DeDdmfSzz6F/',
    counterStrategy: 'D\'Bistro Sanghyang dapat menonjolkan menu santai sore hemat: Nasi Goreng Spesial Sanghyang & Kelapa Muda Murni seharga Rp 45.000 Nett.',
  },
  {
    competitorName: 'The Jayakarta Villas Anyer Beach Resort',
    competitorHandle: '@thejayakartaanyer',
    platform: 'instagram',
    title: 'Program Loyalitas J Club Member: Best Price Direct Booking',
    category: 'Kamar & Menginap',
    description: 'Pesan langsung via portal resmi Jayakarta Hotels & Resorts untuk jaminan harga terendah serta akumulasi reward poin member J Club di setiap reservasi.',
    startsAt: new Date('2026-01-20T00:00:00.000Z'),
    endsAt: new Date('2026-12-31T23:59:59.000Z'),
    source: 'Instagram @thejayakartaanyer',
    sourceUrl: 'https://www.instagram.com/thejayakartaanyer/p/DTuWHTjk8in/',
    counterStrategy: 'Tawarkan loyalty reward langsung untuk tamu returning Sanghyang: Complimentary welcome drink di Sunset Grill & diskon khusus 10% untuk pemesanan berikutnya.',
  },

  // === KAFE PANTAI & VIRAL DESTINASI (@andalanbeach, @omahlautcaferesto, TikTok) ===
  {
    competitorName: 'Andalan Beach View Anyer',
    competitorHandle: '@andalanbeach',
    platform: 'instagram',
    title: 'Grand Opening Diskon 16% All F&B di Pantai Mandalika Anyer',
    category: 'F&B & Kuliner',
    description: 'Penawaran istimewa diskon 16% untuk seluruh makanan dan minuman pada pembukaan resto tepi pantai baru Andalan Beach dengan konsep tempat nongkrong santai pasir putih.',
    startsAt: new Date('2026-09-16T00:00:00.000Z'),
    endsAt: new Date('2026-10-31T23:59:59.000Z'),
    discount: 16,
    source: 'Instagram @andalanbeach',
    sourceUrl: 'https://www.instagram.com/andalanbeach/p/DdHRkjly6aw/',
    counterStrategy: 'Tingkatkan daya tarik Sunset Grill Sanghyang dengan live music akustik setiap Sabtu sore dan suasana pantai privat bebas pungli karcis masuk luar.',
  },
  {
    competitorName: 'Omah Laut Cafe & Resto',
    competitorHandle: '@omahlautcaferesto',
    platform: 'instagram',
    title: 'Grand Opening Diskon 15% Kuliner Tepi Pantai Tanpa Syarat',
    category: 'F&B & Kuliner',
    description: 'Diskon pembukaan 15% untuk semua menu seafood dan minuman di Omah Laut Cafe & Resto Cinangka Anyer.',
    startsAt: new Date('2026-10-03T00:00:00.000Z'),
    endsAt: new Date('2026-10-31T23:59:59.000Z'),
    discount: 15,
    source: 'Instagram @omahlautcaferesto',
    sourceUrl: 'https://www.instagram.com/omahlautcaferesto/reel/Dd4Bb29BYHx/',
    counterStrategy: 'Tekankan kenyamanan menyeluruh Sanghyang: fasilitas toilet bersih berbintang, parkir aspal luas berkeamanan 24 jam, dan taman rindang keluarga.',
  },
  {
    competitorName: 'Aston Anyer Beach Hotel & Aquavillas',
    competitorHandle: '@archipelagohotels',
    platform: 'tiktok',
    title: 'Sensasi Menginap Overwater Aquavillas & Sunset Dining The Pier di TikTok',
    category: 'Kamar & Menginap',
    description: 'Review viral pengalaman staycation di villa atas laut Aquavillas dengan lantai kaca transparan dan makan malam romantis di dermaga The Pier.',
    startsAt: new Date('2026-10-06T00:00:00.000Z'),
    endsAt: new Date('2026-12-31T23:59:59.000Z'),
    source: 'TikTok @archipelagohotels',
    sourceUrl: 'https://www.tiktok.com/@archipelagohotels/video/7391827491028374912',
    counterStrategy: 'Kembangkan video TikTok room tour cottage taman hijau luas dan pemandangan laut lepas Sanghyang dengan harga jauh lebih kompetitif.',
  },
  {
    competitorName: 'Mambruk Hotel & Convention',
    competitorHandle: '@mambrukhotelanyer',
    platform: 'tiktok',
    title: 'Viral Sea Pool Kolam Air Laut Alami & Sunset di Lighthouse Restaurant',
    category: 'F&B & Kuliner',
    description: 'Video grounding TikTok menyorot keunikan sea pool air laut dan panorama mercusuar saat senja di Mambruk Hotel Anyer.',
    startsAt: new Date('2026-10-07T00:00:00.000Z'),
    endsAt: new Date('2026-12-31T23:59:59.000Z'),
    source: 'TikTok @mambrukhotelanyer',
    sourceUrl: 'https://www.tiktok.com/@mambrukhotelanyer',
    counterStrategy: 'Viralkan kolam air belerang vulkanik alami Sanghyang di TikTok dengan angle relaksasi kesehatan, hilangkan penat, dan spa alami pertama di Banten.',
  },
];

export async function syncCompetitorSocialPromoEvents(): Promise<{
  totalSynced: number;
  activeCount: number;
  upcomingCount: number;
  expiredCount: number;
}> {
  console.log('[sync-social-promos] Memulai sinkronisasi promo & event kompetitor...');

  const [competitors, existingPromotions] = await Promise.all([
    db.competitor.findMany({
      select: { id: true, name: true, instagramUrl: true, tiktokUrl: true },
    }),
    db.competitorPromotion.findMany({
      where: {
        sourceUrl: {
          in: AUTHENTIC_COMPETITOR_PROMOS_AND_EVENTS.map((p) => p.sourceUrl),
        },
      },
      select: { id: true, sourceUrl: true, competitorId: true, imageUrl: true },
    }),
  ]);

  const competitorMap = new Map<string, string>();
  for (const c of competitors) {
    competitorMap.set(c.name.toLowerCase().trim(), c.id);
  }

  const existingMap = new Map<string, typeof existingPromotions[number]>();
  for (const ep of existingPromotions) {
    if (ep.sourceUrl) {
      existingMap.set(ep.sourceUrl, ep);
    }
  }

  const findCompetitorId = (targetName: string): string | null => {
    const direct = competitorMap.get(targetName.toLowerCase().trim());
    if (direct) return direct;

    for (const [name, id] of competitorMap.entries()) {
      if (targetName.toLowerCase().includes(name) || name.includes(targetName.toLowerCase())) {
        return id;
      }
    }
    return null;
  };

  const now = new Date();
  let activeCount = 0;
  let upcomingCount = 0;
  let expiredCount = 0;
  let totalSynced = 0;

  const mutationPromises: Promise<unknown>[] = [];

  for (const promo of AUTHENTIC_COMPETITOR_PROMOS_AND_EVENTS) {
    const competitorId = findCompetitorId(promo.competitorName);
    if (!competitorId) {
      console.warn(`[sync-social-promos] Kompetitor tidak ditemukan untuk: ${promo.competitorName}`);
      continue;
    }

    let status: PromotionStatus = 'new';
    if (promo.endsAt && promo.endsAt < now) {
      status = 'expired';
      expiredCount++;
    } else if (promo.startsAt > now) {
      status = 'new'; // upcoming
      upcomingCount++;
    } else {
      status = 'new'; // currently active
      activeCount++;
    }

    const existing = existingMap.get(promo.sourceUrl);

    if (existing) {
      mutationPromises.push(
        db.competitorPromotion.update({
          where: { id: existing.id },
          data: {
            title: promo.title,
            category: promo.category,
            description: promo.description,
            startsAt: promo.startsAt,
            endsAt: promo.endsAt ?? null,
            price: promo.price != null ? new Prisma.Decimal(promo.price) : null,
            originalPrice: promo.originalPrice != null ? new Prisma.Decimal(promo.originalPrice) : null,
            discount: promo.discount != null ? new Prisma.Decimal(promo.discount) : null,
            source: promo.source,
            sourceUrl: promo.sourceUrl,
            imageUrl: promo.imageUrl ?? existing.imageUrl,
            status,
            version: { increment: 1 },
          },
        })
      );
    } else {
      mutationPromises.push(
        db.competitorPromotion.create({
          data: {
            competitorId,
            title: promo.title,
            category: promo.category,
            description: promo.description,
            startsAt: promo.startsAt,
            endsAt: promo.endsAt ?? null,
            price: promo.price != null ? new Prisma.Decimal(promo.price) : null,
            originalPrice: promo.originalPrice != null ? new Prisma.Decimal(promo.originalPrice) : null,
            discount: promo.discount != null ? new Prisma.Decimal(promo.discount) : null,
            source: promo.source,
            sourceUrl: promo.sourceUrl,
            imageUrl: promo.imageUrl ?? null,
            capturedAt: promo.startsAt,
            status,
            version: 1,
          },
        })
      );
    }

    totalSynced++;
  }

  // Eksekusi mutasi paralel
  await Promise.all(mutationPromises);

  console.log(`[sync-social-promos] Berhasil menyinkronkan ${totalSynced} promo/event (Aktif: ${activeCount}, Upcoming: ${upcomingCount}, Expired: ${expiredCount})`);

  return { totalSynced, activeCount, upcomingCount, expiredCount };
}
