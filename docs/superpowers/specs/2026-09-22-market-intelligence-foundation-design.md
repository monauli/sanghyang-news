# Sanghyang Market Intelligence Foundation Design

**Date:** 2026-09-22  
**Scope:** Phase 1 foundation only

## Goal

Menambahkan persistence dan pipeline scraping yang bisa dilacak tanpa memutus workflow newsletter lama.

## Current Constraints

- Aplikasi saat ini hanya memiliki alur Google News RSS → filter/scoring → resolve → extract → Gemini → PDF.
- Belum ada database, source registry, scrape history, atau admin scraping page.
- Workflow newsletter lama harus tetap berjalan.
- Tidak ada competitor, review, F&B, event, trend, atau recommendation module di Phase 1.
- Tidak boleh menyimpan credential atau mengubah production credential.

## Architecture

Phase 1 menambahkan lapisan persistence di samping alur lama. Adapter scraper menghasilkan record normalisasi, lalu repository menyimpan artikel, source, scrape run, dan error. Endpoint admin hanya memulai proses manual news dan membaca history; proses newsletter lama tetap memakai modul yang ada sampai migrasi berikutnya.

Pipeline scraper:

```text
Source registry
    ↓
Scraper adapter (RSS / HTTP / browser / manual)
    ↓
Normalized article
    ↓
Deterministic deduplication
    ↓
Article + ScrapeRun + ScrapeError persistence
```

## Data Model

### Source

- `id`: UUID/string primary key
- `name`: display name
- `domain`: normalized domain
- `category`: `news | fnb | event | competitor | review`
- `type`: `rss | http | browser | manual`
- `enabled`: boolean, default true
- `priority`: integer, default 0
- `intervalMinutes`: optional integer
- `lastRunAt`: optional datetime
- `lastSuccessAt`: optional datetime
- `failureCount`: integer, default 0
- `createdAt`, `updatedAt`

Unique key: `(domain, type)`.

### Article

- `id`: UUID/string primary key
- `sourceId`: foreign key to Source
- `title`
- `canonicalUrl`
- `normalizedTitle`
- `publishedAt`: optional datetime
- `description`: optional text
- `content`: optional text
- `imageUrl`: optional string
- `contentHash`: optional string
- `status`: `discovered | extracted | failed | duplicate`
- `createdAt`, `updatedAt`

Deterministic deduplication uses canonical URL first, then a composite of source, normalized title, published date, and content hash. A duplicate must not overwrite the original article.

### ScrapeRun

- `id`: UUID/string primary key
- `sourceId`: foreign key to Source
- `job`: `news`
- `status`: `running | success | partial | failed`
- `startedAt`
- `finishedAt`: optional datetime
- `recordsDiscovered`: integer, default 0
- `recordsSaved`: integer, default 0
- `duplicates`: integer, default 0
- `errors`: integer, default 0
- `createdAt`

### ScrapeError

- `id`: UUID/string primary key
- `runId`: foreign key to ScrapeRun
- `sourceId`: foreign key to Source
- `url`: optional string
- `stage`: `fetch | parse | extract | persist`
- `message`: safe diagnostic message
- `statusCode`: optional integer
- `createdAt`

## Scraper Interface

The shared interface stays small:

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

Adapters in Phase 1:

- RSS adapter wrapping the existing Google News flow.
- HTTP article adapter wrapping the existing extractor.
- Browser fallback inside the extraction path only when HTTP output is empty or shorter than the existing threshold.

No browser is launched for every article. Browser failures become `ScrapeError` records and do not abort unrelated records.

## Admin Surface

Add `/admin/scraping` behind the existing `proxy.ts` auth.

The first version contains:

- enabled source list;
- `Run News Now` action;
- current run status;
- latest runs with discovered/saved/duplicate/error counts;
- error detail text;
- empty and failure states.

The endpoint must reject unsupported jobs, disabled sources, and concurrent runs for the same source.

## Compatibility

- Existing `/api/search`, `/api/resolve`, `/api/extract`, `/api/summarize`, and `/api/export` contracts remain unchanged.
- Existing `sessionStorage` review flow remains unchanged.
- Existing URL safety checks remain mandatory for browser-provided URLs.
- API keys remain server-only.

## Testing

Minimum checks:

- schema generation/migration check;
- source enable/disable behavior;
- deterministic duplicate behavior;
- scrape run success/partial/failure accounting;
- HTTP extraction fallback to browser on short content;
- admin endpoint rejects unauthenticated/invalid requests;
- existing lint, typecheck, build, and regression scripts remain green.

## Explicitly Deferred

- F&B and event collectors.
- Competitor CRUD, price snapshots, promotions, and reviews.
- Trends, insights, opportunities, and Gemini recommendations.
- Scheduled/background scraping.
- Production deployment and credential changes.
