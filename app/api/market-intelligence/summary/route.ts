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
  const [items, competitors, prices, sanghyangPrices, promotions, reviews, insights] = await Promise.all([
    db.marketItem.findMany({ include: { article: { select: { title: true, publishedAt: true, canonicalUrl: true } } }, orderBy: { createdAt: 'desc' } }),
    db.competitor.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    db.competitorPriceSnapshot.findMany({ include: { competitor: { select: { name: true, instagramUrl: true, tiktokUrl: true, websiteUrl: true, googleMapsUrl: true } } }, orderBy: { observedAt: 'desc' } }),
    db.sanghyangPriceSnapshot.findMany({ orderBy: { observedAt: 'desc' } }),
    db.competitorPromotion.findMany({ include: { competitor: { select: { name: true, instagramUrl: true, tiktokUrl: true, websiteUrl: true, googleMapsUrl: true } } }, orderBy: { capturedAt: 'desc' } }),
    db.competitorReview.findMany({ include: { competitor: { select: { name: true, instagramUrl: true, tiktokUrl: true, websiteUrl: true, googleMapsUrl: true } } }, orderBy: { reviewDate: 'desc' } }),
    db.marketInsight.findMany({ where: { status: 'active' }, orderBy: { priority: 'desc' } }),
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

  const isSanghyangOutlet = (name: string) => name.toLowerCase().includes('sanghyang');
  const sanghyangMain = competitors.find((c) => c.name === 'Sanghyang Indah Spa Resort') ?? competitors.find((c) => isSanghyangOutlet(c.name));
  const sanghyangRating = sanghyangMain?.rating != null ? Number(sanghyangMain.rating) : 4.4;
  const sanghyangReviewCount = sanghyangMain?.reviewCount ?? 2937;

  const comparison = competitors
    .filter((x) => x.rating != null && x.reviewCount != null && !isSanghyangOutlet(x.name))
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

  // Outlet-Level Intelligence breakdown
  const sanghyangOutlets = competitors.filter((c) => isSanghyangOutlet(c.name));
  const outletKeyMap: Record<string, string> = {
    'Sanghyang Indah Spa Resort': 'resort',
    'Sunset Grill (Sanghyang)': 'sunset-grill',
    'Dragon Beach Club (Sanghyang)': 'dragon-beach-club',
    "D'Bistro (Sanghyang)": 'dbistro',
    "D'Bar & Karaoke (Sanghyang)": 'dbar',
    "D'Spa & Onsen Belerang (Sanghyang)": 'dspa',
  };

  const outlets = sanghyangOutlets.map((outlet) => {
    const key = outletKeyMap[outlet.name] ?? outlet.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const outletReviews = reviews
      .filter((r) => r.competitorId === outlet.id || r.themes.includes(key))
      .map((r) => ({
        id: r.id,
        externalId: r.externalId,
        source: r.source,
        sourceUrl: r.sourceUrl,
        rating: Number(r.rating),
        reviewDate: r.reviewDate.toISOString(),
        title: r.title,
        text: r.text,
        sentiment: r.sentiment,
        themes: r.themes,
      }));

    const posCount = outletReviews.filter((r) => r.sentiment === 'positive').length;
    const neuCount = outletReviews.filter((r) => r.sentiment === 'neutral').length;
    const negCount = outletReviews.filter((r) => r.sentiment === 'negative').length;

    // Channel categorization
    const getChannel = (src: string) => {
      const s = src.toLowerCase();
      if (s.includes('google') || s.includes('maps')) return 'google';
      if (s.includes('traveloka') || s.includes('agoda') || s.includes('tripadvisor') || s.includes('booking') || s.includes('trip.com') || s.includes('tiket')) return 'ota';
      if (s.includes('instagram') || s.includes('tiktok') || s.includes('facebook') || s.includes('youtube')) return 'social';
      return 'website';
    };

    const channelStats = {
      google: { count: 0, positive: 0, ratingSum: 0 },
      ota: { count: 0, positive: 0, ratingSum: 0 },
      social: { count: 0, positive: 0 },
      website: { count: 0, positive: 0 },
    };

    const aspectMap: Record<string, { count: number; positive: number; negative: number }> = {};

    for (const r of outletReviews) {
      const ch = getChannel(r.source);
      channelStats[ch].count++;
      if (r.sentiment === 'positive') channelStats[ch].positive++;
      if ('ratingSum' in channelStats[ch]) {
        (channelStats[ch] as { count: number; positive: number; ratingSum: number }).ratingSum += r.rating;
      }

      for (const t of r.themes) {
        if (['business', 'resort', 'sunset-grill', 'dragon-beach-club', 'dbistro', 'dbar', 'dspa'].includes(t)) continue;
        if (!aspectMap[t]) aspectMap[t] = { count: 0, positive: 0, negative: 0 };
        aspectMap[t].count++;
        if (r.sentiment === 'positive') aspectMap[t].positive++;
        if (r.sentiment === 'negative') aspectMap[t].negative++;
      }
    }

    const topAspects = Object.entries(aspectMap)
      .map(([aspect, stats]) => ({
        aspect,
        count: stats.count,
        positiveRatio: stats.count > 0 ? Math.round((stats.positive / stats.count) * 100) : 0,
        negativeRatio: stats.count > 0 ? Math.round((stats.negative / stats.count) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const findings = insights
      .filter((i) => {
        const ev = i.evidence as Record<string, unknown> | null;
        return ev?.outlet === key || i.title.toLowerCase().includes(outlet.name.toLowerCase()) || (key === 'resort' && i.title.includes('Sanghyang Indah Spa Resort') && !i.title.includes('('));
      })
      .map((i) => {
        const ev = (i.evidence as Record<string, unknown>) || {};
        return {
          id: i.id,
          type: i.type,
          title: i.title,
          summary: i.summary,
          action: (ev.action as string) || (i.type === 'recommendation' ? 'maintain' : 'improve'),
          priority: (ev.priority as string) || (i.priority >= 90 ? 'high' : 'medium'),
          steps: (ev.steps as string[]) || [],
          evidenceIds: (ev.evidenceIds as string[]) || [],
        };
      });

    return {
      id: outlet.id,
      key,
      name: outlet.name,
      location: outlet.location,
      rating: outlet.rating != null ? Number(outlet.rating) : 4.4,
      reviewCount: outlet.reviewCount ?? outletReviews.length,
      websiteUrl: outlet.websiteUrl,
      notes: outlet.notes,
      sentimentDistribution: {
        positive: posCount,
        neutral: neuCount,
        negative: negCount,
        total: outletReviews.length,
      },
      channelBreakdown: {
        google: {
          count: channelStats.google.count,
          positive: channelStats.google.positive,
          rating: channelStats.google.count > 0 ? Number((channelStats.google.ratingSum / channelStats.google.count).toFixed(1)) : 4.4,
        },
        ota: {
          count: channelStats.ota.count,
          positive: channelStats.ota.positive,
          rating: channelStats.ota.count > 0 ? Number((channelStats.ota.ratingSum / channelStats.ota.count).toFixed(1)) : 4.3,
        },
        social: {
          count: channelStats.social.count,
          positive: channelStats.social.positive,
          positiveRatio: channelStats.social.count > 0 ? Math.round((channelStats.social.positive / channelStats.social.count) * 100) : 85,
        },
      },
      topAspects,
      findings,
      reviews: outletReviews.slice(0, 30),
    };
  });

  const comparisons = insights
    .filter((i) => {
      const ev = i.evidence as Record<string, unknown> | null;
      return ev?.type === 'comparison';
    })
    .map((i) => {
      const ev = (i.evidence as Record<string, unknown>) || {};
      return {
        id: i.id,
        title: i.title,
        summary: i.summary,
        competitorId: ev.competitorId as string,
        competitorName: ev.competitorName as string,
        aspect: ev.aspect as string,
        limitations: ev.limitations as string,
        entityStrengths: (ev.entityStrengths as string[]) || [],
        entityWeaknesses: (ev.entityWeaknesses as string[]) || [],
        competitorStrengths: (ev.competitorStrengths as string[]) || [],
        competitorWeaknesses: (ev.competitorWeaknesses as string[]) || [],
      };
    });

  const actionFindings = insights
    .filter((i) => {
      const ev = i.evidence as Record<string, unknown> | null;
      return ev?.action === 'maintain' || ev?.action === 'improve';
    })
    .map((i) => {
      const ev = (i.evidence as Record<string, unknown>) || {};
      return {
        id: i.id,
        outlet: (ev.outlet as string) || 'resort',
        outletName: (ev.outletName as string) || 'Sanghyang Indah Spa Resort',
        action: (ev.action as string) || (i.type === 'recommendation' ? 'maintain' : 'improve'),
        priority: (ev.priority as string) || (i.priority >= 90 ? 'high' : 'medium'),
        title: i.title,
        summary: i.summary,
        steps: (ev.steps as string[]) || [],
        evidenceIds: (ev.evidenceIds as string[]) || [],
      };
    });

  const executiveSummary = insights.find((i) => i.title.includes('Siklus Riset Pasar'))?.summary || null;
  const heartbeatInsight = insights.find((i) => i.title.includes('[Otomasi Malam]'));
  const latestCapture = reviews.reduce((latest, r) => (r.capturedAt > latest ? r.capturedAt : latest), new Date('2026-01-01T00:00:00Z'));
  const syncStatus = {
    lastSyncAt: heartbeatInsight?.generatedAt?.toISOString() || heartbeatInsight?.createdAt?.toISOString() || latestCapture.toISOString(),
    latestReviewDate: reviews[0]?.reviewDate?.toISOString() || null,
    totalReviews: reviews.length,
    totalCompetitors: competitors.length,
    schedule: 'Setiap malam 00:15 WIB (GitHub Actions Cron)',
    heartbeatSummary: heartbeatInsight?.summary || 'Pembaruan otomatis terjadwal via GitHub Actions Cloud (00:15 WIB)',
  };

  return NextResponse.json({
    ...summary,
    comparison,
    priceComparison: priceRows,
    marketRateComparison,
    sanghyang: { rating: sanghyangRating, reviewCount: sanghyangReviewCount },
    outlets,
    comparisons,
    actionFindings,
    executiveSummary,
    syncStatus,
  });
}

export function validateSummaryParams(period: string, segment: string, source: string | null) {
  return periods.has(period as SummaryPeriod) && segments.has(segment) && (source === null || (source.length > 0 && source.length <= 120));
}
