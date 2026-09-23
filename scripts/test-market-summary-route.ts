import assert from 'node:assert/strict';
import { validateSummaryParams } from '../app/api/market-intelligence/summary/route';
assert.equal(validateSummaryParams('30d', 'all', null), true);
assert.equal(validateSummaryParams('bad', 'all', null), false);
assert.equal(validateSummaryParams('30d', 'unknown', null), false);
assert.equal(validateSummaryParams('30d', 'all', ''), false);
assert.equal(validateSummaryParams('30d', 'all', 'TripAdvisor'), true);
console.log('market summary route checks passed');
