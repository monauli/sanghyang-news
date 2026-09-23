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
    db.marketItem.findMany({ include: { article: { select: { title: true, publishedAt: true, canonicalUrl: true } } }, orderBy: { createdAt: 'desc' } }),
    db.competitor.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    db.competitorPriceSnapshot.findMany({ orderBy: { observedAt: 'desc' } }),
    db.competitorPromotion.findMany({ orderBy: { capturedAt: 'desc' } }),
    db.competitorReview.findMany({ orderBy: { reviewDate: 'desc' } }),
  ]);
  const rows: SummaryRow[] = [
    ...competitors.map((x) => ({ date: (x.ratingObservedAt ?? x.updatedAt).toISOString(), category: 'Competitors', source: x.ratingSource ?? 'Competitor registry', sourceUrl: x.ratingSourceUrl ?? undefined, headline: `${x.name} · ${x.location ?? 'Anyer–Carita–Cilegon'}${x.rating == null ? '' : ` · ${Number(x.rating).toFixed(1)}/5 · ${x.reviewCount?.toLocaleString('id-ID') ?? '?'} ulasan`}`, relevance: 'Bandingkan reputasi publik dan posisi Sanghyang terhadap resort sekitar.', sentiment: 'neutral' as const })),
    ...items.map((x) => ({ date: (x.article.publishedAt ?? x.createdAt).toISOString(), category: x.kind === 'fnb' ? 'F&B' : x.kind === 'event' ? 'Events' : x.kind === 'entertainment' ? 'Entertainment' : 'Destinations', source: 'Market news', sourceUrl: x.article.canonicalUrl ?? undefined, headline: x.article.title, relevance: x.kind === 'fnb' ? 'Bandingkan konsep kuliner, menu, dan target tamu dengan restoran Sanghyang.' : x.kind === 'event' ? 'Cari peluang event serupa untuk meningkatkan okupansi Sanghyang.' : x.kind === 'entertainment' ? 'Bandingkan hiburan dan aktivitas yang menarik wisatawan.' : 'Bandingkan daya tarik destinasi dan paket pengalaman wisata.', sentiment: 'positive' as const })),
    ...prices.map((x) => ({ date: x.observedAt.toISOString(), category: 'Competitors', source: x.source, sourceUrl: x.sourceUrl ?? undefined, headline: `${x.roomName ?? x.packageName ?? 'Rate'} observed at ${x.price}`, relevance: 'Bandingkan harga dan paket dengan penawaran Sanghyang.', sentiment: 'neutral' as const })),
    ...promotions.map((x) => ({ date: x.capturedAt.toISOString(), category: 'Promotions', source: x.source, sourceUrl: x.sourceUrl ?? undefined, headline: x.title, relevance: 'Bandingkan mekanisme promo, periode, dan penawarannya dengan Sanghyang.', sentiment: 'neutral' as const })),
    ...reviews.map((x) => ({ date: x.capturedAt.toISOString(), reviewDate: x.reviewDate.toISOString(), category: 'Reviews', source: x.source, sourceUrl: x.sourceUrl, headline: x.text, relevance: 'Gunakan pujian dan keluhan pelanggan sebagai acuan perbaikan layanan Sanghyang.', sentiment: x.sentiment as SummaryRow['sentiment'] })),
  ].filter((row) => !source || row.source === source).filter((row) => segment === 'all' || ({ fnb: 'F&B', event: 'Events', entertainment: 'Entertainment', destination: 'Destinations', competitor: 'Competitors', promotion: 'Promotions', review: 'Reviews' } as Record<string, string>)[segment] === row.category);
  return NextResponse.json(transformMarketSummary({ rows, competitors: competitors.length, marketItems: items.length, period }));
}

export function validateSummaryParams(period: string, segment: string, source: string | null) {
  return periods.has(period as SummaryPeriod) && segments.has(segment) && (source === null || (source.length > 0 && source.length <= 120));
}
