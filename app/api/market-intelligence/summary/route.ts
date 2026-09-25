import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { NAMA_COOKIE, tokenSah } from '@/lib/sandi';
import { transformMarketSummary, type SummaryPeriod, type SummaryRow } from '@/lib/market/summary';
import { matchComparablePrices, type PriceSnapshot } from '@/lib/market/price-scraper';
import { isMarketRelevant } from '@/lib/market/classifier';

const auth = (request: Request) => { const password = process.env.APP_PASSWORD; const token = request.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${NAMA_COOKIE}=([^;]+)`))?.[1]; return Boolean(password && tokenSah(token, password)); };
const periods = new Set<SummaryPeriod>(['30d', '90d', 'year']);
const segments = new Set(['all', 'fnb', 'event', 'entertainment', 'destination', 'competitor', 'promotion', 'review']);

export async function GET(request: Request) {
  if (!auth(request)) return NextResponse.json({ error: 'Belum masuk.' }, { status: 401 });
  const params = new URL(request.url).searchParams; const period = (params.get('period') ?? '30d') as SummaryPeriod; const segment = params.get('segment') ?? 'all'; const source = params.get('source');
  if (!validateSummaryParams(period, segment, source)) return NextResponse.json({ error: 'invalid summary filters' }, { status: 400 });
  const [items, competitors, prices, sanghyangPrices, promotions, reviews] = await Promise.all([
    db.marketItem.findMany({ include: { article: { select: { title: true, publishedAt: true, canonicalUrl: true } } }, orderBy: { createdAt: 'desc' } }),
    db.competitor.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    db.competitorPriceSnapshot.findMany({ orderBy: { observedAt: 'desc' } }),
    db.sanghyangPriceSnapshot.findMany({ orderBy: { observedAt: 'desc' } }),
    db.competitorPromotion.findMany({ include: { competitor: { select: { name: true } } }, orderBy: { capturedAt: 'desc' } }),
    db.competitorReview.findMany({ include: { competitor: { select: { name: true } } }, orderBy: { reviewDate: 'desc' } }),
  ]);
  const competitorMentions = (text: string) => competitors.filter((c) => text.toLowerCase().includes(c.name.toLowerCase())).map((c) => c.name);
  const relevantItems = items.filter((x) => isMarketRelevant({ title: x.article.title, text: x.description ?? '' }));
  const rows: SummaryRow[] = [
    ...competitors.map((x) => ({ date: (x.ratingObservedAt ?? x.updatedAt).toISOString(), category: 'Competitors', source: x.ratingSource ?? 'Competitor registry', sourceUrl: x.ratingSourceUrl ?? undefined, headline: `${x.name} · ${x.location ?? 'Anyer–Carita–Cilegon'}${x.rating == null ? '' : ` · ${Number(x.rating).toFixed(1)}/5 · ${x.reviewCount?.toLocaleString('id-ID') ?? '?'} ulasan`}`, relevance: 'Bandingkan reputasi publik dan posisi Sanghyang terhadap resort sekitar.', sentiment: 'neutral' as const })),
    ...relevantItems.map((x) => { const category = x.kind === 'fnb' ? 'F&B' : x.kind === 'event' ? 'Events' : x.kind === 'entertainment' ? 'Entertainment' : 'Destinations'; const mentions = competitorMentions(`${x.article.title} ${x.description ?? ''}`); return { date: (x.article.publishedAt ?? x.createdAt).toISOString(), category, source: 'Market news', sourceUrl: x.article.canonicalUrl ?? undefined, headline: x.article.title, relevance: `${mentions.length ? `Kaitan kompetitor: ${mentions.join(', ')}.` : 'Kaitan kompetitor: tidak terdeteksi pada berita ini.'} ${category === 'F&B' ? 'Bandingkan konsep kuliner, menu, dan target tamu dengan Sanghyang.' : category === 'Events' ? 'Bandingkan peluang event dan dampaknya pada okupansi Sanghyang.' : category === 'Entertainment' ? 'Bandingkan hiburan dan aktivitas yang menarik wisatawan.' : 'Bandingkan daya tarik destinasi dan paket pengalaman wisata.'}`, sentiment: 'positive' as const }; }),
    ...prices.map((x) => ({ date: x.observedAt.toISOString(), category: 'Competitors', source: x.source, sourceUrl: x.sourceUrl ?? undefined, headline: `${x.roomName ?? x.packageName ?? 'Rate'} · ${x.price} ${x.currency}`, relevance: 'Bandingkan hanya dengan snapshot Sanghyang yang tanggal, kamar, tamu, dan mata uangnya sama.', sentiment: 'neutral' as const })),
    ...sanghyangPrices.map((x) => ({ date: x.observedAt.toISOString(), category: 'Competitors', source: x.source, sourceUrl: x.sourceUrl ?? undefined, headline: `Sanghyang · ${x.roomName} · ${x.price} ${x.currency}`, relevance: 'Baseline harga Sanghyang untuk perbandingan dengan snapshot kompetitor yang setara.', sentiment: 'neutral' as const })),
    ...promotions.map((x) => ({ date: x.capturedAt.toISOString(), category: 'Promotions', source: x.source, sourceUrl: x.sourceUrl ?? undefined, headline: `${x.competitor?.name ?? 'Kompetitor'} · ${x.title}`, relevance: `Promo kompetitor${x.discount == null ? '' : ` diskon ${Number(x.discount)}%`}${x.price == null ? '' : ` mulai IDR ${Number(x.price).toLocaleString('id-ID')}`}; periode ${x.startsAt.toLocaleDateString('id-ID')}–${x.endsAt?.toLocaleDateString('id-ID') ?? 'tidak ditentukan'}.`, sentiment: 'neutral' as const })),
    ...reviews.map((x) => ({ date: x.capturedAt.toISOString(), reviewDate: x.reviewDate.toISOString(), category: 'Reviews', source: x.source, sourceUrl: x.sourceUrl, headline: `${x.competitor?.name ?? 'Kompetitor'} · ${x.title ?? x.text}`, relevance: `Ulasan ${Number(x.rating).toFixed(1)}/5 dari ${x.competitor?.name ?? 'kompetitor'}; gunakan pujian dan keluhan sebagai acuan perbaikan layanan Sanghyang.`, sentiment: x.sentiment as SummaryRow['sentiment'] })),
  ].filter((row) => !source || row.source === source).filter((row) => segment === 'all' || ({ fnb: 'F&B', event: 'Events', entertainment: 'Entertainment', destination: 'Destinations', competitor: 'Competitors', promotion: 'Promotions', review: 'Reviews' } as Record<string, string>)[segment] === row.category);
  const summary = transformMarketSummary({ rows, competitors: competitors.length, marketItems: relevantItems.length, period });
  const sanghyangRating = 4.4;
  const comparison = competitors
    .filter((x) => x.rating != null && x.reviewCount != null)
    .map((x) => ({ name: x.name, rating: Number(x.rating), reviewCount: x.reviewCount ?? 0, difference: Number((Number(x.rating) - sanghyangRating).toFixed(1)), source: x.ratingSource ?? 'Public source', sourceUrl: x.ratingSourceUrl ?? undefined }))
    .sort((a, b) => b.reviewCount - a.reviewCount);
  const priceStart = new Date();
  if (period === 'year') priceStart.setMonth(0, 1);
  else priceStart.setDate(priceStart.getDate() - (period === '90d' ? 90 : 30));
  const inSelectedPeriod = (x: { observedAt: Date }) => x.observedAt >= priceStart;
  const comparable = matchComparablePrices(
    sanghyangPrices.filter(inSelectedPeriod).filter((x) => x.packageName !== 'Google Hotels displayed rate').filter((x): x is typeof x & { roomName: string; checkIn: Date; checkOut: Date } => Boolean(x.roomName && x.checkIn && x.checkOut)).map((x) => ({ roomName: x.roomName, price: Number(x.price), currency: x.currency, guests: x.guests, checkIn: x.checkIn, checkOut: x.checkOut, source: x.source, sourceUrl: x.sourceUrl ?? '' } satisfies PriceSnapshot)),
    prices.filter(inSelectedPeriod).filter((x) => x.packageName !== 'Google Hotels displayed rate').filter((x): x is typeof x & { roomName: string; checkIn: Date; checkOut: Date } => Boolean(x.roomName && x.checkIn && x.checkOut)).map((x) => ({ roomName: x.roomName, price: Number(x.price), currency: x.currency, guests: x.guests, checkIn: x.checkIn, checkOut: x.checkOut, source: x.source, sourceUrl: x.sourceUrl ?? '', competitorId: x.competitorId } satisfies PriceSnapshot)),
  );
  const priceRows = comparable.map(({ baseline, competitor: x, difference }) => ({ competitor: competitors.find((c) => c.id === x.competitorId)?.name ?? 'Kompetitor', roomName: x.roomName, currency: x.currency, guests: x.guests, checkIn: x.checkIn.toISOString(), checkOut: x.checkOut.toISOString(), sanghyangPrice: baseline.price, competitorPrice: x.price, difference, source: x.source, sourceUrl: x.sourceUrl || undefined }));
  const marketRates = [
    ...sanghyangPrices.filter(inSelectedPeriod).filter((x) => x.packageName === 'Google Hotels displayed rate').map((x) => ({ hotel: 'Sanghyang', price: Number(x.price), currency: x.currency, guests: x.guests, checkIn: x.checkIn.toISOString(), checkOut: x.checkOut.toISOString(), source: x.source, sourceUrl: x.sourceUrl ?? undefined })),
    ...prices.filter(inSelectedPeriod).filter((x) => x.packageName === 'Google Hotels displayed rate').map((x) => ({ hotel: competitors.find((c) => c.id === x.competitorId)?.name ?? 'Kompetitor', price: Number(x.price), currency: x.currency, guests: x.guests, checkIn: x.checkIn?.toISOString() ?? '', checkOut: x.checkOut?.toISOString() ?? '', source: x.source, sourceUrl: x.sourceUrl ?? undefined })),
  ];
  const marketBaseline = marketRates.find((x) => x.hotel === 'Sanghyang')?.price;
  const marketRateComparison = marketRates.map((x) => ({ ...x, difference: marketBaseline == null ? null : Number((x.price - marketBaseline).toFixed(2)) }));
  return NextResponse.json({ ...summary, comparison, priceComparison: priceRows, marketRateComparison, sanghyang: { rating: sanghyangRating, reviewCount: 2937 } });
}

export function validateSummaryParams(period: string, segment: string, source: string | null) {
  return periods.has(period as SummaryPeriod) && segments.has(segment) && (source === null || (source.length > 0 && source.length <= 120));
}
