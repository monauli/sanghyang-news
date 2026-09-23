import assert from "node:assert/strict";
import { createNewsLockClaimer, createNewsLockReleaser, NEWS_SCRAPE_LEASE_MS } from "../lib/market/run-news";

const now = new Date("2026-09-23T00:00:00.000Z");
const duplicate = () => Object.assign(new Error("duplicate"), { code: "P2002" });

function client(acquiredAt: Date, reclaimedCount = 1) {
  let createCalls = 0;
  let updateCalls = 0;
  const deleteWhere: Array<{ job: string; ownerToken: string }> = [];
  return {
    calls: () => ({ createCalls, updateCalls, deleteWhere }),
    scrapeLock: {
      async create() { createCalls++; throw duplicate(); },
      async updateMany(args: { where: { acquiredAt: { lt: Date } }; data: { acquiredAt: Date; ownerToken: string } }) {
        updateCalls++;
        assert.equal(args.where.acquiredAt.lt.toISOString(), new Date(now.getTime() - NEWS_SCRAPE_LEASE_MS).toISOString());
        assert.equal(args.data.acquiredAt, now);
        assert.equal(typeof args.data.ownerToken, "string");
        assert.equal(acquiredAt < args.where.acquiredAt.lt, reclaimedCount === 1);
        return { count: reclaimedCount };
      },
      async deleteMany(args: { where: { job: string; ownerToken: string } }) { deleteWhere.push(args.where); return { count: 1 }; },
    },
  };
}

void (async () => {
  const fresh = client(new Date(now.getTime() - NEWS_SCRAPE_LEASE_MS + 1), 0);
  assert.equal(await createNewsLockClaimer(fresh, () => now)(), null);
  assert.deepEqual(fresh.calls(), { createCalls: 1, updateCalls: 1, deleteWhere: [] });

  const expired = client(new Date(now.getTime() - NEWS_SCRAPE_LEASE_MS - 1));
  assert.match((await createNewsLockClaimer(expired, () => now)()) ?? "", /^[0-9a-f-]{36}$/);
  assert.deepEqual(expired.calls(), { createCalls: 1, updateCalls: 1, deleteWhere: [] });
  await createNewsLockReleaser(expired)("old-owner");
  assert.deepEqual(expired.calls().deleteWhere, [{ job: "news", ownerToken: "old-owner" }]);

  console.log("scrape lock lease checks passed");
})();
