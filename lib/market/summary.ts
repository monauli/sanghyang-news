export type SummaryPeriod = '30d' | '90d' | 'year';
export type SummaryRow = { date: string; category: string; source: string; headline: string; sentiment: 'positive' | 'neutral' | 'negative' };
export type SummaryInput = { rows: SummaryRow[]; competitors: number; marketItems: number; period: SummaryPeriod; now?: Date };

export function transformMarketSummary(input: SummaryInput) {
  const now = input.now ?? new Date();
  const start = input.period === 'year' ? new Date(now.getFullYear(), 0, 1) : new Date(now.getTime() - (input.period === '90d' ? 90 : 30) * 86400000);
  const rows = input.rows.filter((row) => !Number.isNaN(Date.parse(row.date)) && new Date(row.date) >= start && new Date(row.date) <= now).sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const bucketCount = input.period === 'year' ? 12 : input.period === '90d' ? 9 : 7;
  const span = Math.max(1, now.getTime() - start.getTime());
  const trend: Record<string, number[]> = { fnb: Array(bucketCount).fill(0), event: Array(bucketCount).fill(0), competitors: Array(bucketCount).fill(0), promotions: Array(bucketCount).fill(0), reviews: Array(bucketCount).fill(0), destinations: Array(bucketCount).fill(0) };
  const key = (category: string) => ({ 'F&B': 'fnb', Events: 'event', Competitors: 'competitors', Promotions: 'promotions', Reviews: 'reviews', Destinations: 'destinations' } as Record<string, string>)[category];
  for (const row of rows) { const bucket = Math.min(bucketCount - 1, Math.floor(((now.getTime() - Date.parse(row.date)) / span) * bucketCount)); const series = key(row.category); if (series) trend[series][bucket]++; }
  return { counts: { marketItems: input.marketItems, competitors: input.competitors, fnb: rows.filter((r) => r.category === 'F&B').length, events: rows.filter((r) => r.category === 'Events').length, destinations: rows.filter((r) => r.category === 'Destinations').length, priceChanges: rows.filter((r) => r.category === 'Competitors').length, promotions: rows.filter((r) => r.category === 'Promotions').length, reviews: rows.filter((r) => r.category === 'Reviews').length }, sourceNames: [...new Set(rows.map((r) => r.source))].sort(), recentRows: rows.slice(0, 50), trend };
}
