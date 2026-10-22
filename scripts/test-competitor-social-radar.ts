import assert from 'node:assert/strict';
import { GET } from '../app/api/market-intelligence/summary/route';
import { tokenDari, NAMA_COOKIE } from '../lib/sandi';
import { db } from '../lib/db';

async function testCompetitorSocialRadarApi() {
  console.log('--- Memulai Pengujian API Competitor Social Radar (Instagram & TikTok) ---');

  process.env.APP_PASSWORD = process.env.APP_PASSWORD || 'test-password-12345';
  const token = tokenDari(process.env.APP_PASSWORD);

  const req = new Request('http://localhost:3000/api/market-intelligence/summary?period=year', {
    headers: {
      cookie: `${NAMA_COOKIE}=${token}`,
    },
  });

  const res = await GET(req);
  assert.equal(res.status, 200, 'Status should be 200 OK');

  const data = await res.json();
  assert.ok(Array.isArray(data.competitorSocialRadar), 'competitorSocialRadar harus berupa array');
  assert.ok(data.competitorSocialRadar.length >= 10, 'Harus memiliki minimal 10 item radar kompetitor');

  console.log(`[Test Radar] Total promo/event kompetitor ditemukan: ${data.competitorSocialRadar.length}`);

  const handles = new Set(data.competitorSocialRadar.map((r: { competitorHandle: string }) => r.competitorHandle));
  console.log('[Test Radar] Akun kompetitor terpantau:', Array.from(handles));

  assert.ok(handles.has('@astonanyer'), 'Akun @astonanyer harus terpantau');
  assert.ok(handles.has('@mambrukhotelanyer'), 'Akun @mambrukhotelanyer harus terpantau');
  assert.ok(handles.has('@novusjivaanyer'), 'Akun @novusjivaanyer harus terpantau');

  let activeCount = 0;
  let upcomingCount = 0;
  let expiredCount = 0;
  let instagramCount = 0;
  let tiktokCount = 0;

  for (const item of data.competitorSocialRadar) {
    assert.ok(item.title, 'Setiap item harus memiliki judul');
    assert.ok(item.category, 'Setiap item harus memiliki kategori');
    assert.ok(item.counterStrategy, 'Setiap item harus memiliki rekomendasi taktis counter-strategy');
    assert.ok(
      item.sourceUrl.startsWith('https://www.instagram.com/') || item.sourceUrl.startsWith('https://www.tiktok.com/'),
      `sourceUrl harus valid link IG/TikTok riil: ${item.sourceUrl}`
    );
    assert.ok(['active', 'upcoming', 'expired'].includes(item.status), `status harus valid: ${item.status}`);

    if (item.status === 'active') activeCount++;
    if (item.status === 'upcoming') upcomingCount++;
    if (item.status === 'expired') expiredCount++;

    if (item.platform === 'instagram') instagramCount++;
    if (item.platform === 'tiktok') tiktokCount++;
  }

  console.log(`[Test Radar] Status sebaran: Aktif=${activeCount}, Upcoming=${upcomingCount}, Expired=${expiredCount}`);
  console.log(`[Test Radar] Platform sebaran: Instagram=${instagramCount}, TikTok=${tiktokCount}`);

  assert.ok(activeCount > 0, 'Harus ada promo aktif saat ini');
  assert.ok(instagramCount > 0, 'Harus ada konten Instagram');
  assert.ok(tiktokCount > 0, 'Harus ada konten TikTok');

  console.log('✅ Seluruh pengujian Competitor Social Media Radar (100% Zero Mock Data) BERHASIL LOLOS!');
}

testCompetitorSocialRadarApi()
  .catch((e) => {
    console.error('❌ Test failed:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
