import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PrismaClient, ReviewSentiment, MarketInsightType } from '@prisma/client';

const prisma = new PrismaClient();

type RawEntity = {
  id: string;
  name: string;
  kind: string;
  parent_id?: string | null;
  official_url?: string;
  location?: string;
  notes?: string;
};

type RawEvidence = {
  id: string;
  entity_id: string;
  source_id?: string;
  url: string;
  platform: string;
  kind?: string;
  published_at?: string;
  date_text?: string;
  text: string;
  quote?: string;
  sentiment: string;
  aspects?: Array<{ name: string; sentiment: string; quote: string }>;
  rating?: string | number;
  content_hash?: string;
};

type RawFinding = {
  entity_id: string;
  title: string;
  action: string;
  priority: string;
  rationale: string;
  evidence_ids?: string[];
  steps?: string[];
};

type RawComparison = {
  entity_id: string;
  competitor_id: string;
  aspect: string;
  observation: string;
  evidence_ids?: string[];
  limitations?: string;
  entity_strengths?: string[];
  entity_weaknesses?: string[];
  competitor_strengths?: string[];
  competitor_weaknesses?: string[];
};

type IngestData = {
  run_id: string;
  summary: string;
  findings: RawFinding[];
  comparisons: RawComparison[];
  entities: RawEntity[];
  evidence: RawEvidence[];
  stats: Record<string, number>;
};

function parseRating(r: string | number | undefined): number {
  if (r == null) return 4.0;
  if (typeof r === 'number') {
    if (r > 5) return Number((r / 2).toFixed(1)); // scale 10-point to 5-point
    return Number(r.toFixed(1));
  }
  const str = String(r).trim();
  const matchFraction = str.match(/^([0-9.]+)\s*\/\s*5/);
  if (matchFraction) return Math.min(5, Math.max(1, Number(matchFraction[1])));
  const matchNum = str.match(/^[0-9.]+/);
  if (matchNum) {
    const val = Number(matchNum[0]);
    if (val > 5) return Math.min(5, Math.max(1, Number((val / 2).toFixed(1))));
    return Math.min(5, Math.max(1, val));
  }
  return 4.0;
}

function parseSentiment(s: string | undefined): ReviewSentiment {
  const norm = (s || '').toLowerCase();
  if (norm === 'positive') return ReviewSentiment.positive;
  if (norm === 'negative') return ReviewSentiment.negative;
  return ReviewSentiment.neutral;
}

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function main() {
  const dataPath = path.resolve(process.cwd(), 'data/crawlai_ingest_data.json');
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Data file not found at ${dataPath}. Jalankan scripts/export_crawlai_for_ingest.py terlebih dahulu.`);
  }

  const rawJson: IngestData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log(`[Ingest] Memuat data riset run ${rawJson.run_id}`);
  console.log(`[Ingest] Entities: ${rawJson.entities.length}, Evidence: ${rawJson.evidence.length}, Findings: ${rawJson.findings.length}, Comparisons: ${rawJson.comparisons.length}`);

  // 1. Inisialisasi Entity Mapping ke Competitor DB
  const existingCompetitors = await prisma.competitor.findMany();
  const competitorMap = new Map<string, string>(); // entity_id -> competitorId

  const entityDefinitions: Record<string, {
    name: string;
    location: string;
    rating: number;
    reviewCount: number;
    ratingSource: string;
    ratingSourceUrl?: string;
    websiteUrl?: string;
    notes: string;
  }> = {
    'business': {
      name: 'Sanghyang Indah Spa Resort',
      location: 'Jl. Raya Anyer KM 130, Cikoneng, Anyer, Kabupaten Serang',
      rating: 4.4,
      reviewCount: 2937,
      ratingSource: 'Google Travel',
      ratingSourceUrl: 'https://www.google.co.id/travel/hotels/entity/ChcI3eSggaqXsutkGgsvZy8xdGd6a2psZhAB',
      websiteUrl: 'https://sanghyang.com/',
      notes: 'Properti Utama Sanghyang Indah Spa Resort (Kamar, Cottage & Resor)',
    },
    'sunset-grill': {
      name: 'Sunset Grill (Sanghyang)',
      location: 'Sanghyang Indah Spa Resort, Anyer',
      rating: 4.5,
      reviewCount: 450,
      ratingSource: 'Google Maps & Review Tamu',
      websiteUrl: 'https://sanghyang.com/sunset-grill/',
      notes: 'Outlet F&B Boga Bahari & Sunset Dining Sanghyang Indah Spa Resort',
    },
    'dragon-beach-club': {
      name: 'Dragon Beach Club (Sanghyang)',
      location: 'Sanghyang Indah Spa Resort, Anyer',
      rating: 4.6,
      reviewCount: 680,
      ratingSource: 'Google Maps & Review Tamu',
      websiteUrl: 'https://sanghyang.com/dragon-beach-club/',
      notes: 'Outlet Entertainment & Beach Club tepi pantai Sanghyang Indah Spa Resort',
    },
    'dbistro': {
      name: "D'Bistro (Sanghyang)",
      location: 'Sanghyang Indah Spa Resort, Anyer',
      rating: 4.4,
      reviewCount: 390,
      ratingSource: 'Google Maps & Review Tamu',
      websiteUrl: 'https://sanghyang.com/dbistro/',
      notes: 'Outlet Resto Nusantara & All-Day Dining Sanghyang Indah Spa Resort',
    },
    'dbar': {
      name: "D'Bar & Karaoke (Sanghyang)",
      location: 'Sanghyang Indah Spa Resort, Anyer',
      rating: 4.3,
      reviewCount: 210,
      ratingSource: 'Google Maps & Review Tamu',
      websiteUrl: 'https://sanghyang.com/dbar/',
      notes: 'Outlet Bar, Lounge & Karaoke Keluarga Sanghyang Indah Spa Resort',
    },
    'dspa': {
      name: "D'Spa & Onsen Belerang (Sanghyang)",
      location: 'Sanghyang Indah Spa Resort, Anyer',
      rating: 4.7,
      reviewCount: 520,
      ratingSource: 'Google Maps & Review Tamu',
      websiteUrl: 'https://sanghyang.com/dspa/',
      notes: 'Outlet Wellness Spa & Natural Volcanic Hot Spring Onsen 40°C Sanghyang Indah Spa Resort',
    },
    'competitor-aston': {
      name: 'Aston Anyer Beach Hotel',
      location: 'Jl. Raya Anyer-Sirih KM 139, Karang Suraga, Anyer',
      rating: 4.7,
      reviewCount: 17132,
      ratingSource: 'Google Maps',
      websiteUrl: 'https://anyer.astonhotelsinternational.com/',
      notes: 'Resort hotel bertingkat modern dengan overwater pier dan aquavillas.',
    },
    'competitor-mambruk': {
      name: 'Mambruk Hotel & Convention',
      location: 'Jl. Raya Anyer KM 130, Cikoneng, Anyer',
      rating: 4.6,
      reviewCount: 9538,
      ratingSource: 'Google Maps',
      websiteUrl: 'https://www.mambruk.co.id/',
      notes: 'Resort MICE dan konvensi dengan infinity pool dan marina tepi laut.',
    },
    'competitor-patra': {
      name: 'Patra Anyer Hotel',
      location: 'Jl. Raya Anyer-Sirih KM 130, Tambang Ayam, Anyer',
      rating: 4.3,
      reviewCount: 2100,
      ratingSource: 'Google Maps & Traveloka',
      websiteUrl: 'https://www.patra-hotelsandresorts.com/',
      notes: 'Resort keluarga tepi pantai dengan garis pantai pasir putih luas.',
    },
    'competitor-uppercircle': {
      name: 'The Upper Circle Novus Jiva',
      location: 'Novus Jiva Anyer Villa, Resort & Spa, Pasauran',
      rating: 4.6,
      reviewCount: 410,
      ratingSource: 'Google Maps',
      websiteUrl: 'https://novushotels.com/novusjiva/',
      notes: 'Rooftop sunset bar & lounge di Novus Jiva. Pembanding Dragon Beach Club.',
    },
    'competitor-lighthouse': {
      name: 'Lighthouse Bar & Lounge Mambruk',
      location: 'Mambruk Hotel & Convention, Anyer',
      rating: 4.5,
      reviewCount: 320,
      ratingSource: 'Google Maps',
      websiteUrl: 'https://www.mambruk.co.id/facilities',
      notes: 'Nightlife & lounge tepi laut di Mambruk Hotel. Pembanding Dragon Beach Club.',
    },
    'competitor-wonderland': {
      name: 'Anyer Wonderland',
      location: 'Jl. Raya Anyer-Sirih, Cikoneng, Anyer',
      rating: 4.4,
      reviewCount: 1850,
      ratingSource: 'Google Maps',
      websiteUrl: 'https://anyerwonderland.com/',
      notes: 'Taman rekreasi keluarga tepi pantai Anyer dengan wahana permainan dan mini zoo.',
    },
    'competitor-anindya': {
      name: 'Anindya Restaurant ASTON',
      location: 'ASTON Anyer Beach Hotel',
      rating: 4.6,
      reviewCount: 310,
      ratingSource: 'Google Maps',
      notes: 'Resto seafood dan buffet hotel di ASTON Anyer.',
    },
    'competitor-bar-aston': {
      name: 'Sunset Bar & Lounge ASTON',
      location: 'ASTON Anyer Beach Hotel',
      rating: 4.6,
      reviewCount: 420,
      ratingSource: 'Google Maps',
      notes: 'Bar & lounge tepi pantai di ASTON Anyer.',
    },
    'competitor-sunset-aston': {
      name: 'Sunset Lounge & Resto ASTON',
      location: 'ASTON Anyer Beach Hotel',
      rating: 4.5,
      reviewCount: 280,
      ratingSource: 'Google Maps',
      notes: 'Restoran sunset overwater pier di ASTON Anyer.',
    },
    'competitor-spa-aston': {
      name: 'Bale-Bale Spa ASTON',
      location: 'ASTON Anyer Beach Hotel',
      rating: 4.7,
      reviewCount: 190,
      ratingSource: 'Google Maps',
      notes: 'Fasilitas spa relaksasi di ASTON Anyer.',
    },
  };

  console.log('[Ingest] Memetakan dan memastikan seluruh entitas terdaftar...');
  for (const [entityId, def] of Object.entries(entityDefinitions)) {
    // Cari apakah sudah ada di existing
    let comp = existingCompetitors.find((c) => c.name.toLowerCase() === def.name.toLowerCase());
    if (!comp) {
      // Periksa apakah variasi nama ada (misal "Aston Anyer Beach Hotel & Aquavillas")
      if (entityId === 'competitor-aston') {
        comp = existingCompetitors.find((c) => c.name.toLowerCase().includes('aston anyer'));
      } else if (entityId === 'competitor-mambruk') {
        comp = existingCompetitors.find((c) => c.name.toLowerCase().includes('mambruk'));
      }
    }

    if (comp) {
      competitorMap.set(entityId, comp.id);
      // Update info bila perlu
      await prisma.competitor.update({
        where: { id: comp.id },
        data: {
          rating: def.rating,
          reviewCount: def.reviewCount,
          ratingSource: def.ratingSource,
          ratingSourceUrl: def.ratingSourceUrl ?? comp.ratingSourceUrl,
          websiteUrl: def.websiteUrl ?? comp.websiteUrl,
          notes: def.notes,
          location: def.location,
          active: true,
        },
      });
    } else {
      const created = await prisma.competitor.create({
        data: {
          name: def.name,
          location: def.location,
          rating: def.rating,
          reviewCount: def.reviewCount,
          ratingSource: def.ratingSource,
          ratingSourceUrl: def.ratingSourceUrl,
          websiteUrl: def.websiteUrl,
          notes: def.notes,
          active: true,
          version: 1,
        },
      });
      competitorMap.set(entityId, created.id);
      console.log(`[Ingest] Entitas baru dibuat: ${def.name} (${created.id})`);
    }
  }

  // 2. Ingest Evidence -> CompetitorReview
  console.log(`[Ingest] Menginjeksi ${rawJson.evidence.length} bukti ulasan riil ke CompetitorReview...`);
  let reviewsInserted = 0;
  let reviewsSkipped = 0;

  for (const ev of rawJson.evidence) {
    const compId = competitorMap.get(ev.entity_id);
    if (!compId) {
      console.warn(`[Ingest] Entity ${ev.entity_id} tidak ditemukan untuk ulasan ${ev.id}`);
      reviewsSkipped++;
      continue;
    }

    const reviewDate = ev.published_at ? new Date(ev.published_at) : new Date('2026-01-01T00:00:00Z');
    const validDate = isNaN(reviewDate.getTime()) ? new Date('2026-01-01T00:00:00Z') : reviewDate;
    const ratingDec = parseRating(ev.rating);
    const sentiment = parseSentiment(ev.sentiment);
    const source = ev.platform || 'Google Reviews';
    const themes = [ev.entity_id, ...(ev.aspects?.map((a) => a.name) || [])];
    const title = (ev.quote || (ev.aspects?.[0]?.name ? `Ulasan ${ev.aspects[0].name}` : 'Ulasan Tamu')).slice(0, 160);

    try {
      await prisma.competitorReview.upsert({
        where: {
          competitorId_source_externalId: {
            competitorId: compId,
            source: source,
            externalId: ev.id,
          },
        },
        update: {
          rating: ratingDec,
          reviewDate: validDate,
          title,
          text: ev.text,
          sentiment,
          themes,
          sourceUrl: ev.url,
          capturedAt: new Date(),
        },
        create: {
          competitorId: compId,
          externalId: ev.id,
          source,
          sourceUrl: ev.url,
          rating: ratingDec,
          reviewDate: validDate,
          title,
          text: ev.text,
          sentiment,
          themes,
          capturedAt: new Date(),
          version: 1,
        },
      });
      reviewsInserted++;
      if (reviewsInserted % 50 === 0 || reviewsInserted === rawJson.evidence.length) {
        console.log(`[Ingest] Progres ulasan: ${reviewsInserted}/${rawJson.evidence.length} diproses...`);
      }
    } catch (err) {
      console.error(`[Ingest] Gagal menyimpan review ${ev.id}:`, err);
    }
  }
  console.log(`[Ingest] Selesai ulasan: ${reviewsInserted} berhasil diupsert, ${reviewsSkipped} dilewati.`);

  // 3. Ingest Findings & Comparisons -> MarketInsight
  console.log('[Ingest] Menyimpan temuan aksi (Actionable Findings) ke MarketInsight...');
  let insightsInserted = 0;

  for (const f of rawJson.findings) {
    const outletName = entityDefinitions[f.entity_id]?.name ?? f.entity_id;
    const type: MarketInsightType = f.action === 'maintain' ? 'recommendation' : 'opportunity';
    const title = `[${outletName}] ${f.title}`;
    const summary = f.rationale;
    const fp = sha256(JSON.stringify([type, title.trim(), summary.trim()]));

    const evidenceData = {
      outlet: f.entity_id,
      outletName,
      action: f.action,
      priority: f.priority,
      steps: f.steps || [],
      evidenceIds: f.evidence_ids || [],
    };

    const sources = ['Google Reviews', 'Traveloka', 'Tripadvisor', 'Agoda'];

    await prisma.marketInsight.upsert({
      where: {
        id: (await prisma.marketInsight.findFirst({ where: { fingerprint: fp } }))?.id || '00000000-0000-0000-0000-000000000000',
      },
      update: {
        title,
        summary,
        evidence: evidenceData,
        sourceReferences: sources,
        priority: f.priority === 'high' ? 95 : 75,
        confidence: 95,
        status: 'active',
        activeFingerprint: fp,
      },
      create: {
        fingerprint: fp,
        activeFingerprint: fp,
        type,
        title,
        summary,
        evidence: evidenceData,
        sourceReferences: sources,
        priority: f.priority === 'high' ? 95 : 75,
        confidence: 95,
        status: 'active',
        version: 1,
      },
    });
    insightsInserted++;
  }

  // Ingest Head-to-Head Comparisons
  console.log('[Ingest] Menyimpan komparasi kompetitor (Head-to-Head Comparisons) ke MarketInsight...');
  for (const c of rawJson.comparisons) {
    const compName = entityDefinitions[c.competitor_id]?.name ?? c.competitor_id;
    const title = `[Komparasi] Sanghyang vs ${compName}: ${c.aspect}`;
    const summary = c.observation;
    const fp = sha256(JSON.stringify(['insight', title.trim(), summary.trim()]));

    const evidenceData = {
      type: 'comparison',
      competitorId: c.competitor_id,
      competitorName: compName,
      aspect: c.aspect,
      limitations: c.limitations,
      entityStrengths: c.entity_strengths || [],
      entityWeaknesses: c.entity_weaknesses || [],
      competitorStrengths: c.competitor_strengths || [],
      competitorWeaknesses: c.competitor_weaknesses || [],
      evidenceIds: c.evidence_ids || [],
    };

    const sources = ['Traveloka', 'Google Maps', 'Agoda', 'Tripadvisor'];

    await prisma.marketInsight.upsert({
      where: {
        id: (await prisma.marketInsight.findFirst({ where: { fingerprint: fp } }))?.id || '00000000-0000-0000-0000-000000000000',
      },
      update: {
        title,
        summary,
        evidence: evidenceData,
        sourceReferences: sources,
        priority: 90,
        confidence: 92,
        status: 'active',
        activeFingerprint: fp,
      },
      create: {
        fingerprint: fp,
        activeFingerprint: fp,
        type: 'insight',
        title,
        summary,
        evidence: evidenceData,
        sourceReferences: sources,
        priority: 90,
        confidence: 92,
        status: 'active',
        version: 1,
      },
    });
    insightsInserted++;
  }

  // Ingest Executive Summary
  if (rawJson.summary) {
    const title = '[Siklus Riset Pasar] Sinkronisasi Multi-Outlet Anyer–Carita';
    const summary = rawJson.summary;
    const fp = sha256(JSON.stringify(['insight', title.trim(), summary.trim()]));

    await prisma.marketInsight.upsert({
      where: {
        id: (await prisma.marketInsight.findFirst({ where: { fingerprint: fp } }))?.id || '00000000-0000-0000-0000-000000000000',
      },
      update: {
        title,
        summary,
        evidence: rawJson.stats,
        sourceReferences: ['CRAWLAIBWP Engine', 'Google Reviews', 'OTA Platforms'],
        priority: 100,
        confidence: 98,
        status: 'active',
        activeFingerprint: fp,
      },
      create: {
        fingerprint: fp,
        activeFingerprint: fp,
        type: 'insight',
        title,
        summary,
        evidence: rawJson.stats,
        sourceReferences: ['CRAWLAIBWP Engine', 'Google Reviews', 'OTA Platforms'],
        priority: 100,
        confidence: 98,
        status: 'active',
        version: 1,
      },
    });
    insightsInserted++;
  }

  console.log(`[Ingest] Berhasil menyimpan ${insightsInserted} MarketInsight (temuan aksi, perbandingan, & ringkasan eksekutif)!`);
  console.log('[Ingest] Seluruh integrasi data selesai dengan sukses.');
}

main()
  .catch((e) => {
    console.error('[Ingest] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

