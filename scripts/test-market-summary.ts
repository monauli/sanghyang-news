import assert from 'node:assert/strict';
import { transformMarketSummary } from '../lib/market/summary';

const now = new Date('2026-09-23T00:00:00.000Z');
const result = transformMarketSummary({ now, period: '30d', competitors: 2, marketItems: 1, rows: [
  { date: '2026-09-22T00:00:00Z', category: 'F&B', source: 'News', headline: 'Food', sentiment: 'positive' },
  { date: '2026-09-21T00:00:00Z', reviewDate: '2025-01-01T00:00:00Z', category: 'Reviews', source: 'TripAdvisor', headline: 'Captured recently', sentiment: 'neutral' },
  { date: '2026-08-01T00:00:00Z', category: 'Reviews', source: 'TripAdvisor', headline: 'Old', sentiment: 'neutral' },
] });
assert.deepEqual(result.sourceNames, ['News', 'TripAdvisor']);
assert.equal(result.counts.fnb, 1);
assert.equal(result.counts.reviews, 1);
assert.equal(result.counts.marketItems, 1);
assert.equal(result.recentRows[0].headline, 'Food');
assert.equal(result.recentRows[1].reviewDate, '2025-01-01T00:00:00Z');
assert.equal(result.trend.reviews.reduce((a, b) => a + b, 0), 1);
console.log('market summary checks passed');
