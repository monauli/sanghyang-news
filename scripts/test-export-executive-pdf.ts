import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { POST } from '../app/api/market-intelligence/export-pdf/route';
import type { ExecutiveReportData } from '../templates/executive-report';

async function testExecutivePdfExport() {
  console.log('[Test PDF] Menguji pembuatan Laporan Eksekutif PDF...');

  const mockPayload: ExecutiveReportData = {
    publishDate: '2026-10-22',
    periodText: '30 Hari Terakhir (Oktober 2026)',
    executiveSummary: 'Analisis pasar multi-outlet Anyer–Carita menunjukkan Dragon Beach Club memimpin sentimen nightlife dengan 88% positif. D\'Spa Onsen Belerang menjadi USP terkuat.',
    sanghyang: { rating: 4.4, reviewCount: 2937 },
    outlets: [
      {
        name: 'Dragon Beach Club (Sanghyang)',
        location: 'Pantai Sanghyang, Anyer',
        rating: 4.6,
        reviewCount: 310,
        sentimentDistribution: { positive: 270, neutral: 30, negative: 10, total: 310 },
        channelBreakdown: {
          google: { count: 180, positive: 160, rating: 4.6 },
          ota: { count: 40, positive: 35, rating: 4.5 },
          social: { count: 90, positive: 80, positiveRatio: 89 },
        },
        topAspects: [
          { aspect: 'musik', count: 45, positiveRatio: 90, negativeRatio: 5 },
          { aspect: 'sunset', count: 60, positiveRatio: 95, negativeRatio: 2 },
        ],
      },
      {
        name: 'Sunset Grill (Sanghyang)',
        location: 'Sanghyang Indah Spa Resort',
        rating: 4.5,
        reviewCount: 450,
        sentimentDistribution: { positive: 380, neutral: 50, negative: 20, total: 450 },
        channelBreakdown: {
          google: { count: 320, positive: 280, rating: 4.5 },
          ota: { count: 70, positive: 60, rating: 4.4 },
          social: { count: 60, positive: 50, positiveRatio: 83 },
        },
        topAspects: [
          { aspect: 'makanan', count: 80, positiveRatio: 88, negativeRatio: 8 },
        ],
      },
      {
        name: "D'Spa & Onsen Belerang (Sanghyang)",
        location: 'Sanghyang Indah Spa Resort',
        rating: 4.7,
        reviewCount: 190,
        sentimentDistribution: { positive: 175, neutral: 10, negative: 5, total: 190 },
        channelBreakdown: {
          google: { count: 120, positive: 110, rating: 4.7 },
          ota: { count: 50, positive: 45, rating: 4.6 },
          social: { count: 20, positive: 18, positiveRatio: 90 },
        },
        topAspects: [
          { aspect: 'spa', count: 50, positiveRatio: 96, negativeRatio: 2 },
        ],
      },
    ],
    marketRateComparison: [
      {
        hotel: 'Sanghyang Indah Spa Resort',
        price: 750000,
        currency: 'IDR',
        guests: 2,
        checkIn: '2026-10-24T00:00:00Z',
        checkOut: '2026-10-25T00:00:00Z',
        difference: 0,
      },
      {
        hotel: 'ASTON Anyer Beach Hotel',
        price: 1350000,
        currency: 'IDR',
        guests: 2,
        checkIn: '2026-10-24T00:00:00Z',
        checkOut: '2026-10-25T00:00:00Z',
        difference: 600000,
      },
    ],
    actionFindings: [
      {
        outletName: 'Dragon Beach Club',
        action: 'maintain',
        priority: 'high',
        title: 'Pertahankan DJ Lineup & Suasana Sunset',
        summary: 'Tamu sangat menyukai atmosfer santai tepi pantai dengan sajian musik lounge dan DJ.',
        steps: ['Pertahankan jadwal DJ mulai 16:30 WIB', 'Jaga kualitas audio di area dek pantai'],
      },
      {
        outletName: 'Kamar & Cottage',
        action: 'improve',
        priority: 'high',
        title: 'Peningkatan Kecepatan Pendinginan AC Kamar',
        summary: 'Beberapa ulasan menyebutkan AC membutuhkan waktu lama untuk mendinginkan ruangan saat siang terik.',
        steps: ['Jadwalkan servis rutin berkala setiap 2 minggu', 'Periksa filter udara seluruh cottage'],
      },
    ],
    comparisons: [
      {
        competitorName: 'ASTON Anyer Beach Hotel',
        aspect: 'Pantai & Overwater Pier',
        summary: 'Sanghyang memiliki garis pantai pasir putih luas dan onsen air belerang alami.',
        entityStrengths: ['Pantai pasir landai ramah anak', 'Onsen air panas belerang alami'],
        competitorStrengths: ['Dermaga overwater pier ikonik'],
      },
    ],
  };

  const req = new Request('http://localhost:3000/api/market-intelligence/export-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mockPayload),
  });

  const res = await POST(req);
  assert.equal(res.status, 200, 'Status response harus 200');
  assert.equal(res.headers.get('Content-Type'), 'application/pdf', 'Content-Type harus application/pdf');

  const buf = Buffer.from(await res.arrayBuffer());
  assert.ok(buf.length > 5000, `Ukuran PDF harus > 5KB (didapat: ${buf.length} bytes)`);

  const header = buf.subarray(0, 5).toString('ascii');
  assert.equal(header, '%PDF-', 'Header file harus %PDF-');

  const outPath = path.resolve(process.cwd(), 'scripts/.uji-laporan-eksekutif.pdf');
  fs.writeFileSync(outPath, buf);
  console.log(`✅ Laporan Eksekutif PDF berhasil dibuat: ${outPath} (${buf.length} bytes)`);
}

testExecutivePdfExport()
  .catch((err) => {
    console.error('❌ Uji PDF gagal:', err);
    process.exit(1);
  });

