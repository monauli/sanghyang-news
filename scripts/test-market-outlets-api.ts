import assert from 'node:assert/strict';
import { GET } from '../app/api/market-intelligence/summary/route';
import { db } from '../lib/db';
import { tokenDari, NAMA_COOKIE } from '../lib/sandi';

async function testMarketOutletsApi() {
  process.env.APP_PASSWORD = process.env.APP_PASSWORD || 'test-password-12345';
  const token = tokenDari(process.env.APP_PASSWORD);

  const req = new Request('http://localhost:3000/api/market-intelligence/summary?period=year', {
    headers: {
      cookie: `${NAMA_COOKIE}=${token}`,
    },
  });

  const res = await GET(req);
  assert.equal(res.status, 200, 'Status should be 200');

  const data = await res.json();
  console.log('[Test API] Keys returned:', Object.keys(data));
  console.log('[Test API] Outlets count:', data.outlets?.length);
  console.log('[Test API] Comparisons count:', data.comparisons?.length);
  console.log('[Test API] Action findings count:', data.actionFindings?.length);
  console.log('[Test API] Executive summary present:', Boolean(data.executiveSummary));
  console.log('[Test API] Sanghyang rating:', data.sanghyang?.rating);

  assert.ok(Array.isArray(data.outlets), 'Outlets should be an array');
  assert.ok(data.outlets.length >= 6, 'Should have at least 6 Sanghyang outlets');

  const dbc = data.outlets.find((o: { key: string; reviews: unknown[]; findings: unknown[] }) => o.key === 'dragon-beach-club');
  assert.ok(dbc, 'Dragon Beach Club outlet should exist');
  assert.ok(dbc.reviews.length > 0, 'Dragon Beach Club should have reviews');
  assert.ok(dbc.findings.length > 0, 'Dragon Beach Club should have actionable findings');
  assert.ok(dbc.channelBreakdown, 'Dragon Beach Club should have channelBreakdown');
  assert.ok(Array.isArray(dbc.topAspects), 'Dragon Beach Club should have topAspects array');
  assert.ok(data.syncStatus, 'syncStatus should exist');
  assert.ok(data.syncStatus.lastSyncAt, 'syncStatus.lastSyncAt should exist');

  assert.ok(Array.isArray(data.comparisons), 'Comparisons should be an array');
  assert.ok(data.comparisons.length >= 5, 'Should have at least 5 head-to-head comparisons');

  assert.ok(Array.isArray(data.actionFindings), 'Action findings should be an array');
  assert.ok(data.actionFindings.length >= 10, 'Should have at least 10 action findings');

  console.log('✅ Semua pengujian API Market Intelligence Multi-Outlet berhasil lolos!');
}

testMarketOutletsApi()
  .catch((e) => {
    console.error('❌ Test failed:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

