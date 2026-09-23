import assert from "node:assert/strict";
import { createNewsLockClaimer, NEWS_SCRAPE_LEASE_MS } from "../lib/market/run-news";

const now = new Date("2026-09-23T00:00:00.000Z");
const duplicate = () => Object.assign(new Error("duplicate"), { code: "P2002" });

function client(acquiredAt: Date, reclaimedCount = 1) {
  let createCalls = 0;
  let updateCalls = 0;
  return {
    calls: () => ({ createCalls, updateCalls }),
    scrapeLock: {
      async create() { createCalls++; throw duplicate(); },
      async updateMany(args: { where: { acquiredAt: { lt: Date } }; data: { acquiredAt: Date } }) {
        updateCalls++;
        assert.equal(args.where.acquiredAt.lt.toISOString(), new Date(now.getTime() - NEWS_SCRAPE_LEASE_MS).toISOString());
        assert.equal(args.data.acquiredAt, now);
        assert.equal(acquiredAt < args.where.acquiredAt.lt, reclaimedCount === 1);
        return { count: reclaimedCount };
      },
    },
  };
}

void (async () => {
  const fresh = client(new Date(now.getTime() - NEWS_SCRAPE_LEASE_MS + 1), 0);
  assert.equal(await createNewsLockClaimer(fresh, () => now)(), false);
  assert.deepEqual(fresh.calls(), { createCalls: 1, updateCalls: 1 });

  const expired = client(new Date(now.getTime() - NEWS_SCRAPE_LEASE_MS - 1));
  assert.equal(await createNewsLockClaimer(expired, () => now)(), true);
  assert.deepEqual(expired.calls(), { createCalls: 1, updateCalls: 1 });

  console.log("scrape lock lease checks passed");
})();
