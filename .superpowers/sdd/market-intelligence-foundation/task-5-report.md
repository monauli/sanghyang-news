# Task 5 implementation report

## Status

Implemented the manual news-scrape service and protected admin API.

## Commit

`c88535b feat: add manual news scraping API`

## Tests

- `npx tsx scripts/test-admin-scraping.ts` — passed
- `npx tsx scripts/test-market-repository.ts` — passed
- `npx tsx scripts/test-scrape-log.ts` — passed
- `npx tsx scripts/test-market-scrapers.ts` — passed
- `npx tsc --noEmit` — passed
- `npm run lint` — passed with two pre-existing warnings in `scripts/test-kuota.ts` and `spike5.mjs`
- `npm run build` — passed
- `git diff --check` — passed

## Concerns

- The concurrent-run guard is process-local. Multi-instance deployment needs a database lease.
- Phase 1 seeds one source. With multiple enabled sources, `runId` identifies the first source run while the returned status aggregates all source runs; a future batch-run model can make polling aggregate state explicit.

## Fix round 1

### Status

Resolved the reviewer findings. Recent `running` runs now block matching enabled sources through Prisma, returned run IDs aggregate all source runs, detail resolves the same aggregate, and scrape errors are redacted before persistence and response serialization. Runs that begin processing finalize even if individual error logging fails.

### Commits

- `7362141 fix: harden news scraping runs`
- `a38bd08 fix: label redacted auth headers`

### Tests

- `npx tsx scripts/test-admin-scraping.ts` — passed
- `npx tsx scripts/test-scrape-log.ts` — passed
- `npx tsx scripts/test-market-repository.ts` — passed
- `npx tsx scripts/test-market-scrapers.ts` — passed
- `npx tsc --noEmit` — passed
- `npm run lint` — passed with two pre-existing warnings in `scripts/test-kuota.ts` and `spike5.mjs`
- `npm run build` — passed
- `git diff --check` — passed

### Concerns

- The durable running-run lookup prevents overlap after a run is visible, but a database uniqueness/lease mechanism would be needed to close the narrow cross-instance check-then-create race.

## Fix round 2

### Status

Added an atomic `ScrapeLock` claim for the news job, released in `finally`; sanitized stored error URLs with the same boundary sanitizer; and restored source isolation for failed starts and retryable finalization failures.

### Commit

`035a120 fix: atomically lock news scraping`

### Tests

- `npm run db:generate` — passed
- `npx tsx scripts/test-admin-scraping.ts` — passed
- `npx tsx scripts/test-scrape-log.ts` — passed
- `npx tsx scripts/test-market-repository.ts` — passed
- `npx tsx scripts/test-market-scrapers.ts` — passed
- `npx tsc --noEmit` — passed
- `npm run lint` — passed with two pre-existing warnings in `scripts/test-kuota.ts` and `spike5.mjs`
- `npm run build` — passed
- `git diff --check` — passed

### Concerns

- A process that dies before `finally` runs leaves its lock behind. `acquiredAt` is retained for operational recovery; a future lease expiry needs a deliberate timeout policy.

## Fix round 3

### Status

Added the checked-in initial PostgreSQL migration generated from the complete current Prisma schema, including `ScrapeLock`, plus a deterministic migration-content check.

### Commit

`6baa24e chore: add initial Prisma migration`

### Tests

- `npx tsx scripts/test-prisma-migration.ts` — passed
- `npm run db:generate` — passed
- `npx tsx scripts/test-admin-scraping.ts` — passed
- `npx tsx scripts/test-scrape-log.ts` — passed
- `npx tsx scripts/test-market-repository.ts` — passed
- `npx tsx scripts/test-market-scrapers.ts` — passed
- `npx tsc --noEmit` — passed
- `npm run lint` — passed with two pre-existing warnings in `scripts/test-kuota.ts` and `spike5.mjs`
- `npm run build` — passed
- `git diff --check` — passed

### Concerns

- The migration is intentionally a baseline for new databases. Existing deployed databases need their migration history reconciled before `prisma migrate deploy` is used.

## Fix round 4

### Status

Strengthened the checked-in migration check to assert critical per-table columns, all source/run/error relations, and the `ScrapeLock` job, acquisition timestamp, and primary key.

### Tests

- `npx tsx scripts/test-prisma-migration.ts` — passed
- `npm run db:generate` — passed
- `npx tsc --noEmit` — passed
- `npm run lint` — passed with two pre-existing warnings in `scripts/test-kuota.ts` and `spike5.mjs`

### Concerns

- The migration remains a baseline for new databases; deployed databases need migration-history reconciliation before `prisma migrate deploy`.
