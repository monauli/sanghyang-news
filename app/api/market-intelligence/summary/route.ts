import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { NAMA_COOKIE, tokenSah } from '@/lib/sandi';
import { transformMarketSummary, type SummaryPeriod, type SummaryRow } from '@/lib/market/summary';

const auth = (request: Request) => { const password = process.env.APP_PASSWORD; const token = request.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${NAMA_COOKIE}=([^;]+)`))?.[1]; return Boolean(password && tokenSah(token, password)); };
const periods = new Set<SummaryPeriod>(['30d', '90d', 'year']);
const segments = new Set(['all', 'fnb', 'event', 'entertainment', 'destination', 'competitor', 'promotion', 'review']);

export async function GET(request: Request) {
  if (!auth(request)) return NextResponse.json({ error: 'Belum masuk.' }, { status: 401 });
  const params = new URL(request.url).searchParams; const period = (params.get('period') ?? '30d') as SummaryPeriod; const segment = params.get('segment') ?? 'all'; const source = params.get('source');
  if (!validateSummaryParams(period, segment, source)) return NextResponse.json({ error: 'invalid summary filters' }, { status: 400 });
  const [items, competitors, prices, promotions, reviews] = await Promise.all([
    db.marketItem.findMany({ orderBy: { createdAt: 'desc' } }),
    db.competitor.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    db.competitorPriceSnapshot.findMany({ orderBy: { observedAt: 'desc' } }),
    db.competitorPromotion.findMany({ orderBy: { capturedAt: 'desc' } }),
    db.competitorReview.findMany({ orderBy: { reviewDate: 'desc' } }),
  ]);
  const rows: SummaryRow[] = [
    ...items.map((x) => ({ date: x.createdAt.toISOString(), category: x.kind === 'fnb' ? 'F&B' : x.kind === 'event' ? 'Events' : x.kind === 'entertainment' ? 'Entertainment' : 'Destinations', source: 'Market news', headline: x.description ?? x.targetAudience ?? 'New market intelligence item', sentiment: 'positive' as const })),
    ...prices.map((x) => ({ date: x.observedAt.toISOString(), category: 'Competitors', source: x.source, headline: `${x.roomName ?? x.packageName ?? 'Rate'} observed at ${x.price}`, sentiment: 'neutral' as const })),
    ...promotions.map((x) => ({ date: x.capturedAt.toISOString(), category: 'Promotions', source: x.source, headline: x.title, sentiment: 'neutral' as const })),
    ...reviews.map((x) => ({ date: x.capturedAt.toISOString(), reviewDate: x.reviewDate.toISOString(), category: 'Reviews', source: x.source, headline: x.text, sentiment: x.sentiment as SummaryRow['sentiment'] })),
  ].filter((row) => !source || row.source === source).filter((row) => segment === 'all' || ({ fnb: 'F&B', event: 'Events', entertainment: 'Entertainment', destination: 'Destinations', competitor: 'Competitors', promotion: 'Promotions', review: 'Reviews' } as Record<string, string>)[segment] === row.category);
  return NextResponse.json(transformMarketSummary({ rows, competitors: competitors.length, marketItems: items.length, period }));
}

export function validateSummaryParams(period: string, segment: string, source: string | null) {
  return periods.has(period as SummaryPeriod) && segments.has(segment) && (source === null || (source.length > 0 && source.length <= 120));
}
