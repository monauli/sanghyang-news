# Market Intelligence Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan persistence, source registry, scrape logging, scraper abstraction, dan admin scraping dasar tanpa memutus workflow newsletter lama.

**Architecture:** Prisma menjadi persistence layer baru di samping alur newsletter yang sudah ada. Scraper pipeline memakai adapter kecil untuk RSS dan HTTP, dengan Puppeteer hanya sebagai fallback saat hasil HTTP kosong/terlalu pendek. Admin API/page mengelola source dan manual news run; kontrak API lama tidak berubah.

**Tech Stack:** Next.js 16 App Router, TypeScript, PostgreSQL, Prisma, React, Puppeteer yang sudah terpasang, existing article extractor.

**Spec:** `docs/superpowers/specs/2026-09-22-market-intelligence-foundation-design.md`

**Workspace note:** audit menemukan folder ini belum memiliki `.git`; commit steps below are checkpoints to use if/when the repository is initialized, not a reason to stop implementation.

## Global Constraints

- Workflow `/`, `/review`, `/preview`, dan API newsletter lama tetap berfungsi.
- Phase 1 hanya mencakup news foundation; tidak membuat F&B, event, competitor, review, trend, insight, atau recommendation.
- Browser automation hanya fallback, bukan scraper utama.
- Duplicate article tidak boleh menimpa record pertama.
- URL yang datang dari browser tetap memakai validasi URL aman yang ada.
- Credential dan production secret tidak diubah atau dikomit.
- Tidak ada scheduled job pada Phase 1.

## Review Focus

- Database belum tersedia atau `DATABASE_URL` kosong harus menghasilkan error setup yang jelas, bukan membuka akses atau merusak newsletter lama. Test: repository startup/configuration failure.
- Dua RSS item dengan URL sama harus menyimpan satu artikel dan menghitung satu duplicate. Test: deterministic URL dedupe.
- Dua item tanpa URL stabil dengan judul/source/date/content sama harus dianggap duplicate. Test: composite dedupe.
- Satu source gagal sementara source lain berhasil harus menghasilkan run `partial`, bukan menggagalkan seluruh run. Test: per-source error accounting.
- Browser fallback tidak boleh dipanggil untuk artikel dengan content HTTP valid dan harus dipanggil untuk content pendek. Test: spy/mock browser launcher.

---

### Task 1: Add Prisma foundation and schema

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `.env.example`
- Create: `lib/db.ts`
- Create: `lib/db-types.ts`
- Test: `scripts/test-db-config.ts`

**Interfaces:**
- Produces Prisma models `Source`, `Article`, `ScrapeRun`, `ScrapeError` and singleton `db` from `lib/db.ts`.
- `Source.category`: `news | fnb | event | competitor | review`.
- `Source.method`: `rss | http | browser | manual`.
- `ScrapeRun.job`: `news` for this phase.

- [ ] **Step 1: Add the smallest dependencies and database scripts**

Add `prisma` and `tsx` as dev dependencies and `@prisma/client` as a dependency. Add scripts:

```json
"db:generate": "prisma generate",
"db:migrate": "prisma migrate dev",
"db:seed": "tsx prisma/seed.ts"
```

Do not add a second ORM or migration tool.

- [ ] **Step 2: Write the schema**

Define the four models with UUID ids, timestamps, foreign keys, indexes, and the unique constraint for source `(domain, method)`. Add unique/index support for article `canonicalUrl`, `contentHash`, and lookup fields needed by dedupe. Keep fields nullable when the RSS/HTTP source cannot guarantee them.

- [ ] **Step 3: Add env example and DB singleton**

`.env.example` contains only:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/sanghyang_news"
GEMINI_API_KEY=
APP_PASSWORD=
GEMINI_MODEL=
```

`lib/db.ts` exports a development-safe Prisma singleton and does not log connection secrets.

- [ ] **Step 4: Add a minimal configuration test**

Create `scripts/test-db-config.ts` that asserts `DATABASE_URL` is required by the database client boundary and never prints its value. Run it with the existing TypeScript runner available in the installed dependencies, or use a plain Node-compatible check if no runner exists.

- [ ] **Step 5: Generate and validate Prisma client**

Run:

```powershell
npm install
npm run db:generate
```

Expected: Prisma client generation succeeds without requiring a live database.

- [ ] **Step 6: Commit**

```powershell
git add package.json package-lock.json prisma .env.example lib/db.ts lib/db-types.ts scripts/test-db-config.ts
git commit -m "feat: add market intelligence persistence foundation"
```

---

### Task 2: Add source registry and deterministic article repository

**Files:**
- Create: `lib/market/source-registry.ts`
- Create: `lib/market/article-repository.ts`
- Create: `lib/market/normalize.ts`
- Create: `scripts/test-market-repository.ts`
- Modify: `prisma/seed.ts`

**Interfaces:**

```ts
type SourceCategory = 'news' | 'fnb' | 'event' | 'competitor' | 'review';
type ScrapeMethod = 'rss' | 'http' | 'browser' | 'manual';

type NewArticle = {
  sourceId: string;
  title: string;
  canonicalUrl: string;
  normalizedTitle: string;
  publishedAt?: Date;
  description?: string;
  content?: string;
  imageUrl?: string;
  contentHash?: string;
};

type SaveArticleResult = { saved: boolean; duplicate: boolean; articleId: string };
```

- [ ] **Step 1: Write failing normalization/dedupe checks**

Test that normalization trims/collapses whitespace and lowercases title comparison, content hashes are stable, URL fragments are removed, and equivalent URL/title/date/content records produce the same dedupe key.

- [ ] **Step 2: Implement normalization**

Use the standard `URL` class and Node crypto hash. Preserve the original canonical URL separately; use normalized values only for comparison.

- [ ] **Step 3: Write failing repository checks**

Use an injectable repository client or Prisma test double so the checks do not require network access. Cover source enable/disable, URL duplicate, composite duplicate, and first-record preservation.

- [ ] **Step 4: Implement source registry**

Provide functions:

```ts
listSources(category?: SourceCategory): Promise<Source[]>;
getEnabledSources(category: SourceCategory): Promise<Source[]>;
setSourceEnabled(id: string, enabled: boolean): Promise<Source>;
```

Seed one enabled `Google News` source using the existing RSS method. Do not seed competitor or review sources yet.

- [ ] **Step 5: Implement article repository**

Provide `saveArticle()` that checks canonical URL first and composite fingerprint second. It must return duplicate metadata and never update the original record when a duplicate is found.

- [ ] **Step 6: Run tests and commit**

```powershell
npm run db:generate
npx tsx scripts/test-market-repository.ts
git add lib/market prisma/seed.ts scripts/test-market-repository.ts
git commit -m "feat: add source registry and article deduplication"
```

---

### Task 3: Add scrape run/error logging

**Files:**
- Create: `lib/market/scrape-log.ts`
- Create: `scripts/test-scrape-log.ts`

**Interfaces:**

```ts
type ScrapeJob = 'news';
type ScrapeRunStatus = 'running' | 'success' | 'partial' | 'failed';
type ScrapeStage = 'fetch' | 'parse' | 'extract' | 'persist';

startRun(sourceId: string, job: ScrapeJob): Promise<ScrapeRun>;
finishRun(id: string, result: { status: ScrapeRunStatus; discovered: number; saved: number; duplicates: number; errors: number }): Promise<ScrapeRun>;
recordScrapeError(input: { runId: string; sourceId: string; url?: string; stage: ScrapeStage; message: string; statusCode?: number }): Promise<ScrapeError>;
listRecentRuns(limit: number): Promise<ScrapeRun[]>;
```

- [ ] **Step 1: Write failing accounting checks**

Assert a successful run stores counts, a partial run stores errors while retaining saved records, and error messages are bounded/safe for UI display.

- [ ] **Step 2: Implement logging functions**

Use Prisma transactions only where a run update and its error count must remain consistent. Keep the implementation synchronous at the call boundary; no queue or scheduler.

- [ ] **Step 3: Add source health updates**

On successful completion update `lastRunAt`, `lastSuccessAt`, and reset `failureCount`. On failed/partial completion update `lastRunAt` and increment `failureCount`.

- [ ] **Step 4: Run checks and commit**

```powershell
npx tsx scripts/test-scrape-log.ts
git add lib/market/scrape-log.ts scripts/test-scrape-log.ts
git commit -m "feat: add scrape run and error logging"
```

---

### Task 4: Introduce scraper adapters and browser fallback

**Files:**
- Create: `lib/market/scraper.ts`
- Create: `lib/market/rss-scraper.ts`
- Create: `lib/market/http-scraper.ts`
- Create: `lib/market/browser-fallback.ts`
- Modify: `lib/extractor.ts`
- Create: `scripts/test-market-scrapers.ts`

**Interfaces:**

```ts
type ScrapeContext = { source: Source; runId: string };
type ScrapedArticle = {
  title: string;
  canonicalUrl: string;
  publishedAt?: Date;
  description?: string;
  content?: string;
  imageUrl?: string;
};

interface Scraper {
  scrape(context: ScrapeContext): Promise<ScrapedArticle[]>;
}
```

- [ ] **Step 1: Write adapter and fallback tests**

Mock `fetch` and the browser launcher. Assert RSS maps existing Google News fields, HTTP uses the existing extractor, valid HTTP content does not launch Puppeteer, and short/empty content invokes the browser fallback once.

- [ ] **Step 2: Extract browser launch behind one injectable function**

Reuse installed `puppeteer` for local execution and keep the fallback launcher isolated so tests do not start Chromium. Browser extraction must return the same normalized article shape.

- [ ] **Step 3: Implement RSS adapter**

Wrap existing `searchAll()` output. Do not duplicate keyword/scoring behavior; Phase 1 stores discovered normalized articles and leaves current search behavior intact.

- [ ] **Step 4: Implement HTTP adapter**

Wrap `extractOne()` and preserve existing URL safety. For short/empty content call the browser fallback. Browser failures return a structured error for the run logger rather than throwing through the whole batch.

- [ ] **Step 5: Run regression and scraper checks**

```powershell
npx tsx scripts/test-market-scrapers.ts
npx tsx scripts/test-extractor.ts
npx tsx scripts/test-urlaman.ts
```

- [ ] **Step 6: Commit**

```powershell
git add lib/market lib/extractor.ts scripts/test-market-scrapers.ts
git commit -m "feat: add layered market scrapers"
```

---

### Task 5: Add manual news scrape service and protected API

**Files:**
- Create: `lib/market/run-news.ts`
- Create: `app/api/admin/scraping/route.ts`
- Create: `app/api/admin/scraping/[runId]/route.ts`
- Create: `scripts/test-admin-scraping.ts`

**Interfaces:**

```ts
runNewsNow(): Promise<{ runId: string; status: ScrapeRunStatus }>;
```

- [ ] **Step 1: Write API/service checks**

Assert unsupported methods return 405, malformed body returns 400, concurrent news runs are rejected with 409, and a successful run returns a run id. Auth rejection is covered through existing proxy behavior plus route-level contract tests.

- [ ] **Step 2: Implement run service**

Load enabled news sources, create one run per source, execute the adapter, save articles, record errors, and finalize counts. One source failure must not abort other sources.

- [ ] **Step 3: Implement protected routes**

`POST /api/admin/scraping` starts a news run. `GET /api/admin/scraping` returns enabled sources and recent runs. `GET /api/admin/scraping/:runId` returns one run and its errors. Do not expose API keys or raw credentials.

- [ ] **Step 4: Run checks and commit**

```powershell
npx tsx scripts/test-admin-scraping.ts
git add lib/market/run-news.ts app/api/admin/scraping scripts/test-admin-scraping.ts
git commit -m "feat: add manual news scraping API"
```

---

### Task 6: Add initial admin scraping page

**Files:**
- Create: `app/admin/scraping/page.tsx`
- Modify: `proxy.ts`
- Create: `scripts/test-admin-page.ts`

**Interfaces:**
- Page consumes `GET /api/admin/scraping` and `POST /api/admin/scraping`.
- Page displays only human-readable labels; internal scraper method names and raw stack traces stay hidden.

- [ ] **Step 1: Write page behavior checks**

Assert the page renders source status, Run News Now button, latest run counts, loading state, empty state, and a recoverable error state.

- [ ] **Step 2: Add the route to auth coverage**

Confirm `/admin/scraping` is redirected to `/login` without the existing session cookie and accessible after login. Keep the existing fail-closed `APP_PASSWORD` behavior.

- [ ] **Step 3: Implement minimal page**

Use React state and existing Tailwind styles. Poll only after a user-triggered run and stop when the run reaches a terminal state. Do not add a state library or component library.

- [ ] **Step 4: Run page checks and commit**

```powershell
npx tsx scripts/test-admin-page.ts
git add app/admin/scraping/page.tsx proxy.ts scripts/test-admin-page.ts
git commit -m "feat: add scraping admin page"
```

---

### Task 7: Full Phase 1 verification and documentation

**Files:**
- Modify: `README.md`
- Modify: `BACKEND.md`
- Modify: `FRONTEND.md`
- Modify: `CODEX_HANDOFF_SANGHYANG_MARKET_INTELLIGENCE.md`
- Modify: `package.json` (only if a stable test script is now available)

- [ ] **Step 1: Document local database setup**

Add exact `DATABASE_URL`, migration, seed, and local run commands. State clearly that scheduled jobs and Phase 2 modules are not included.

- [ ] **Step 2: Document scraper and logging contracts**

Update backend documentation with the adapter pipeline, fallback trigger, dedupe behavior, source registry fields, and admin route.

- [ ] **Step 3: Run the complete verification set**

```powershell
npm run lint
npx tsc --noEmit
npm run build
npx tsx scripts/test-market-repository.ts
npx tsx scripts/test-scrape-log.ts
npx tsx scripts/test-market-scrapers.ts
npx tsx scripts/test-admin-scraping.ts
npx tsx scripts/test-admin-page.ts
```

Also run the existing deterministic scripts that do not require live credentials or external services:

```powershell
npx tsx scripts/test-filter.ts
npx tsx scripts/test-scoring.ts
npx tsx scripts/test-jiplak.ts
npx tsx scripts/test-judul.ts
npx tsx scripts/test-urlaman.ts
```

- [ ] **Step 4: Confirm Phase 1 acceptance criteria**

Check old newsletter route behavior, database schema generation, source enable/disable, duplicate preservation, browser fallback, scrape history, fail-closed auth, no committed secrets, lint, typecheck, tests, and production build.

- [ ] **Step 5: Commit documentation and verification**

```powershell
git add README.md BACKEND.md FRONTEND.md CODEX_HANDOFF_SANGHYANG_MARKET_INTELLIGENCE.md package.json
git commit -m "docs: document market intelligence foundation"
```

## Plan Self-Review

- Coverage: every Phase 1 deliverable from the approved spec maps to Tasks 1–7.
- Scope: no Phase 2+ feature is included.
- Interfaces: repository, logging, scraper, run service, and API contracts are named before consumers use them.
- Failure modes: missing DB config, deterministic duplicates, partial runs, short HTTP content, auth, and regression checks are assigned to tests.
- No production deployment or credential mutation is planned.
