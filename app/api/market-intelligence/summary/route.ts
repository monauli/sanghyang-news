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
  const cleanHtmlText = (str: string) => str.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
  const [items, competitors, prices, sanghyangPrices, promotions, reviews] = await Promise.all([
    db.marketItem.findMany({ include: { article: { select: { title: true, publishedAt: true, canonicalUrl: true } } }, orderBy: { createdAt: 'desc' } }),
    db.competitor.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    db.competitorPriceSnapshot.findMany({ include: { competitor: { select: { name: true, instagramUrl: true, tiktokUrl: true, websiteUrl: true, googleMapsUrl: true } } }, orderBy: { observedAt: 'desc' } }),
    db.sanghyangPriceSnapshot.findMany({ orderBy: { observedAt: 'desc' } }),
    db.competitorPromotion.findMany({ include: { competitor: { select: { name: true, instagramUrl: true, tiktokUrl: true, websiteUrl: true, googleMapsUrl: true } } }, orderBy: { capturedAt: 'desc' } }),
    db.competitorReview.findMany({ include: { competitor: { select: { name: true, instagramUrl: true, tiktokUrl: true, websiteUrl: true, googleMapsUrl: true } } }, orderBy: { reviewDate: 'desc' } }),
  ]);
  const competitorMentions = (text: string) => competitors.filter((c) => text.toLowerCase().includes(c.name.toLowerCase())).map((c) => c.name);
  const relevantItems = items.filter((x) => isMarketRelevant({ title: x.article.title, text: cleanHtmlText(x.description ?? '') }));
  const rows: SummaryRow[] = [
    ...competitors.map((x) => ({
      date: (x.ratingObservedAt ?? x.updatedAt).toISOString(),
      category: 'Competitors',
      source: x.ratingSource ?? 'Competitor registry',
      sourceUrl: x.ratingSourceUrl ?? x.websiteUrl ?? x.instagramUrl ?? undefined,
      headline: `${x.name} · ${x.location ?? 'Anyer–Carita–Cilegon'}${x.rating == null ? '' : ` · ${Number(x.rating).toFixed(1)}/5 · ${x.reviewCount?.toLocaleString('id-ID') ?? '?'} ulasan`}`,
      relevance: x.notes ?? 'Bandingkan reputasi publik dan posisi Sanghyang terhadap resort sekitar.',
      sentiment: 'neutral' as const,
      socialUrls: {
        instagram: x.instagramUrl ?? undefined,
        tiktok: x.tiktokUrl ?? undefined,
        website: x.websiteUrl ?? undefined,
        maps: x.googleMapsUrl ?? undefined,
      },
    })),
    ...relevantItems.map((x) => {
      const category = x.kind === 'fnb' ? 'F&B' : x.kind === 'event' ? 'Events' : x.kind === 'entertainment' ? 'Entertainment' : 'Destinations';
      const cleanDesc = cleanHtmlText(x.description ?? '');
      const mentions = competitorMentions(`${x.article.title} ${cleanDesc}`);
      const tagsObj = (x.tags && typeof x.tags === 'object' && !Array.isArray(x.tags)) ? (x.tags as Record<string, unknown>) : null;
      const tagSocial = {
        instagram: (tagsObj?.instagramUrl as string) ?? undefined,
        tiktok: (tagsObj?.tiktokUrl as string) ?? undefined,
        website: (tagsObj?.websiteUrl as string) ?? undefined,
        maps: (tagsObj?.googleMapsUrl as string) ?? undefined,
      };
      const matchedComp = competitors.find((c) => mentions.includes(c.name) || (x.brand && c.name.toLowerCase().includes(x.brand.toLowerCase())));
      const socialUrls = {
        instagram: tagSocial.instagram ?? matchedComp?.instagramUrl ?? undefined,
        tiktok: tagSocial.tiktok ?? matchedComp?.tiktokUrl ?? undefined,
        website: tagSocial.website ?? matchedComp?.websiteUrl ?? undefined,
        maps: tagSocial.maps ?? matchedComp?.googleMapsUrl ?? undefined,
      };
      let rowSource = x.brand ? `${x.brand}` : 'Berita pasar';
      if (x.article.canonicalUrl?.includes('tiktok.com')) {
        const usernameMatch = x.article.canonicalUrl.match(/@([^/?#]+)/);
        rowSource = usernameMatch ? `TikTok @${usernameMatch[1]}` : (x.brand ? `TikTok ${x.brand}` : 'TikTok Trend');
      } else if (x.article.canonicalUrl?.includes('instagram.com')) {
        const igUserMatch = x.article.canonicalUrl.match(/instagram\.com\/([^/?#]+)/);
        if (igUserMatch && igUserMatch[1] !== 'p' && igUserMatch[1] !== 'reel') {
          rowSource = `Instagram @${igUserMatch[1]}`;
        }
      } else if (x.article.canonicalUrl?.includes('news.google.com')) {
        const pubMatch = x.article.title.match(/-\s*([^-\n]+)$/);
        rowSource = pubMatch ? pubMatch[1].trim() : (x.brand ? `${x.brand}` : 'Berita pasar');
      }
      return {
        date: (x.article.publishedAt ?? x.createdAt).toISOString(),
        category,
        source: rowSource,
        sourceUrl: x.article.canonicalUrl ?? socialUrls.instagram ?? socialUrls.website ?? undefined,
        headline: x.article.title,
        relevance: `${cleanDesc ? `${cleanDesc} ` : ''}${mentions.length ? `Kaitan kompetitor: ${mentions.join(', ')}.` : ''}`.trim(),
        sentiment: 'positive' as const,
        activeFrom: (x.startsAt ?? x.article.publishedAt ?? x.createdAt).toISOString(),
        activeTo: x.endsAt ? x.endsAt.toISOString() : undefined,
        socialUrls: (socialUrls.instagram || socialUrls.tiktok || socialUrls.website || socialUrls.maps) ? socialUrls : undefined,
      };
    }),
    ...prices.map((x) => {
      const hotelName = x.competitor?.name ?? 'Kompetitor';
      const label = x.roomName ? `${hotelName} · ${x.roomName}` : (x.packageName ? `${hotelName} · ${x.packageName}` : `${hotelName} · Tarif terendah`);
      return {
        date: x.observedAt.toISOString(),
        category: 'Competitors',
        source: x.source,
        sourceUrl: x.sourceUrl ?? undefined,
        headline: `${label} · ${Number(x.price).toLocaleString('id-ID')} ${x.currency}`,
        relevance: `Bandingkan tarif ${hotelName} dengan baseline Sanghyang untuk tanggal, tipe kamar, dan tamu yang sama.`,
        sentiment: 'neutral' as const,
        socialUrls: {
          instagram: x.competitor?.instagramUrl ?? undefined,
          tiktok: x.competitor?.tiktokUrl ?? undefined,
          website: x.competitor?.websiteUrl ?? undefined,
          maps: x.competitor?.googleMapsUrl ?? undefined,
        },
      };
    }),
    ...sanghyangPrices.map((x) => ({
      date: x.observedAt.toISOString(),
      category: 'Competitors',
      source: x.source,
      sourceUrl: x.sourceUrl ?? undefined,
      headline: `Sanghyang Indah Spa Resort · ${x.roomName} · ${Number(x.price).toLocaleString('id-ID')} ${x.currency}`,
      relevance: 'Baseline harga resmi Sanghyang untuk perbandingan dengan snapshot kompetitor yang setara.',
      sentiment: 'neutral' as const,
    })),
    ...promotions.map((x) => {
      const postedDate = x.capturedAt ?? x.startsAt ?? x.createdAt;
      const promoDetails = [
        x.discount != null ? `diskon ${Number(x.discount)}%` : null,
        x.price != null ? `mulai IDR ${Number(x.price).toLocaleString('id-ID')}` : null,
        x.endsAt != null ? `periode ${x.startsAt.toLocaleDateString('id-ID')}–${x.endsAt.toLocaleDateString('id-ID')}` : null,
      ].filter(Boolean).join(', ');

      const relevanceSummary = promoDetails ? `Promo kompetitor (${promoDetails}).` : 'Promo kompetitor.';

      return {
        date: postedDate.toISOString(),
        category: 'Promotions',
        source: x.source,
        sourceUrl: x.sourceUrl ?? x.competitor?.instagramUrl ?? x.competitor?.websiteUrl ?? undefined,
        headline: `${x.competitor?.name ?? 'Kompetitor'} · ${x.title}`,
        relevance: `${x.description ? `${x.description} ` : ''}${relevanceSummary}`,
        sentiment: 'neutral' as const,
        activeFrom: x.startsAt.toISOString(),
        activeTo: x.endsAt ? x.endsAt.toISOString() : undefined,
        socialUrls: {
          instagram: x.competitor?.instagramUrl ?? undefined,
          tiktok: x.competitor?.tiktokUrl ?? undefined,
          website: x.competitor?.websiteUrl ?? undefined,
          maps: x.competitor?.googleMapsUrl ?? undefined,
        },
      };
    }),
    ...reviews.map((x) => ({
      date: (x.reviewDate ?? x.capturedAt ?? x.createdAt).toISOString(),
      reviewDate: x.reviewDate.toISOString(),
      category: 'Reviews',
      source: x.source,
      sourceUrl: x.sourceUrl ?? x.competitor?.googleMapsUrl ?? x.competitor?.websiteUrl ?? undefined,
      headline: `${x.competitor?.name ?? 'Kompetitor'} · ${x.title ?? x.text}`,
      relevance: `${x.text} (Ulasan ${Number(x.rating).toFixed(1)}/5 dari ${x.competitor?.name ?? 'kompetitor'}${x.themes?.length ? `; tema: ${x.themes.join(', ')}` : ''}).`,
      sentiment: x.sentiment as SummaryRow['sentiment'],
      activeFrom: (x.reviewDate ?? x.capturedAt).toISOString(),
      socialUrls: {
        instagram: x.competitor?.instagramUrl ?? undefined,
        tiktok: x.competitor?.tiktokUrl ?? undefined,
        website: x.competitor?.websiteUrl ?? undefined,
        maps: x.competitor?.googleMapsUrl ?? undefined,
      },
    })),
  ].filter((row) => !source || row.source === source).filter((row) => segment === 'all' || ({ fnb: 'F&B', event: 'Events', entertainment: 'Entertainment', destination: 'Destinations', competitor: 'Competitors', promotion: 'Promotions', review: 'Reviews' } as Record<string, string>)[segment] === row.category);
  const summary = transformMarketSummary({ rows, competitors: competitors.length, marketItems: relevantItems.length, period });
  const sanghyangComp = competitors.find((c) => c.name.toLowerCase().includes('sanghyang'));
  const sanghyangRating = sanghyangComp?.rating != null ? Number(sanghyangComp.rating) : 4.4;
  const comparison = competitors
    .filter((x) => x.rating != null && x.reviewCount != null)
    .map((x) => ({
      name: x.name,
      rating: Number(x.rating),
      reviewCount: x.reviewCount ?? 0,
      difference: Number((Number(x.rating) - sanghyangRating).toFixed(1)),
      source: x.ratingSource ?? 'Public source',
      sourceUrl: x.ratingSourceUrl ?? x.websiteUrl ?? x.instagramUrl ?? undefined,
      instagramUrl: x.instagramUrl ?? undefined,
      tiktokUrl: x.tiktokUrl ?? undefined,
      websiteUrl: x.websiteUrl ?? undefined,
      googleMapsUrl: x.googleMapsUrl ?? undefined,
    }))
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
