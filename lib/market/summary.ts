export type SummaryPeriod = '30d' | '90d' | 'year';

export type SummaryRow = {
  date: string; // Tanggal posted date asli sumber (misal tanggal posting Instagram)
  category: string;
  source: string;
  sourceUrl?: string;
  headline: string;
  relevance?: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  reviewDate?: string;
  activeFrom?: string; // Tanggal mulai periode aktif (promo/acara/menu)
  activeTo?: string;   // Tanggal berakhir periode aktif (promo/acara/menu)
  socialUrls?: {
    instagram?: string;
    tiktok?: string;
    facebook?: string;
    website?: string;
    maps?: string;
  };
};

export type SummaryInput = {
  rows: SummaryRow[];
  competitors: number;
  marketItems: number;
  period: SummaryPeriod;
  now?: Date;
};

export function transformMarketSummary(input: SummaryInput) {
  const now = input.now ?? new Date();
  const start = input.period === 'year'
    ? new Date(now.getFullYear(), 0, 1)
    : new Date(now.getTime() - (input.period === '90d' ? 90 : 30) * 86400000);

  // Batas masa depan untuk promosi dan jadwal acara yang sedang/akan aktif
  const futureDays = input.period === 'year' ? 365 : input.period === '90d' ? 90 : 30;
  const futureLimit = new Date(now.getTime() + futureDays * 86400000);

  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const rows = input.rows
    .filter((row) => {
      const postedTime = Date.parse(row.date);
      if (Number.isNaN(postedTime)) return false;

      const postedDate = new Date(postedTime);

      // 1. Apakah diposting dalam rentang periode (misal 30 hari terakhir)?
      const isPostedInPeriod = postedDate >= start && postedDate <= endOfToday;

      // 2. Apakah konten/promosi/acara SEDANG AKTIF dalam rentang periode yang dipilih?
      // (Bahkan jika kompetitor memposting 45 hari sebelumnya, asalkan masa berlaku promosi/acara aktif dalam periode ini, data tetap diterima)
      let isActiveInPeriod = false;

      if (row.activeFrom || row.activeTo) {
        const fromTime = row.activeFrom ? Date.parse(row.activeFrom) : postedTime;
        const toTime = row.activeTo ? Date.parse(row.activeTo) : null;

        const fromDate = !Number.isNaN(fromTime) ? new Date(fromTime) : postedDate;
        const toDate = toTime && !Number.isNaN(toTime) ? new Date(toTime) : null;

        if (toDate) {
          // Promo / acara masih aktif jika berakhir pada atau setelah awal periode
          // dan sudah dimulai sebelum batas periode aktif mendatang
          isActiveInPeriod = toDate >= start && fromDate <= futureLimit;
        } else {
          // Tanpa batas akhir eksplisit: aktif jika dimulai dalam jendela periode aktif
          isActiveInPeriod = fromDate >= start && fromDate <= futureLimit;
        }
      }

      // Entitas profil kompetitor selalu aktif untuk pembanding pasar
      if (row.category === 'Competitors') {
        return true;
      }

      return isPostedInPeriod || isActiveInPeriod;
    })
    .sort((a, b) => {
      const dateA = Date.parse(a.date);
      const dateB = Date.parse(b.date);
      return dateB - dateA;
    });

  const bucketCount = input.period === 'year' ? 12 : input.period === '90d' ? 9 : 7;
  const span = Math.max(1, now.getTime() - start.getTime());
  const trend: Record<string, number[]> = {
    fnb: Array(bucketCount).fill(0),
    event: Array(bucketCount).fill(0),
    entertainment: Array(bucketCount).fill(0),
    competitors: Array(bucketCount).fill(0),
    promotions: Array(bucketCount).fill(0),
    reviews: Array(bucketCount).fill(0),
    destinations: Array(bucketCount).fill(0),
  };
  const key = (category: string) => ({
    'F&B': 'fnb',
    Events: 'event',
    Entertainment: 'entertainment',
    Competitors: 'competitors',
    Promotions: 'promotions',
    Reviews: 'reviews',
    Destinations: 'destinations',
  } as Record<string, string>)[category];

  for (const row of rows) {
    const rowTime = Date.parse(row.date);
    const clampedTime = Math.min(now.getTime(), Math.max(start.getTime(), rowTime));
    const bucket = Math.min(bucketCount - 1, Math.max(0, Math.floor(((now.getTime() - clampedTime) / span) * bucketCount)));
    const series = key(row.category);
    if (series) trend[series][bucket]++;
  }

  const marketItems = rows.filter((r) => ['F&B', 'Events', 'Entertainment', 'Destinations'].includes(r.category)).length;

  return {
    counts: {
      marketItems,
      competitors: rows.filter((r) => r.category === 'Competitors').length,
      fnb: rows.filter((r) => r.category === 'F&B').length,
      events: rows.filter((r) => r.category === 'Events').length,
      entertainment: rows.filter((r) => r.category === 'Entertainment').length,
      destinations: rows.filter((r) => r.category === 'Destinations').length,
      priceChanges: rows.filter((r) => r.category === 'Competitors').length,
      promotions: rows.filter((r) => r.category === 'Promotions').length,
      reviews: rows.filter((r) => r.category === 'Reviews').length,
    },
    sourceNames: [...new Set(rows.map((r) => r.source))].sort(),
    recentRows: rows.slice(0, 100),
    trend,
  };
}
