# MEMORY.md - Sanghyang News Project Facts (Hermes Protocol)

## Active Project & Stack Overview
- **Project**: Sanghyang News (Market Intelligence & Multi-Outlet Anyer-Carita).
- **Status**: Live (Vercel `sanghyang-news.vercel.app`), Branch `master`.
- **Database**: PostgreSQL (Supabase BaaS Mumbai `lpnvlsmvndhfgodutpmu`).
- **Stack**: Next.js 16.3.2 App Router (Turbopack, Node 24), Prisma 6.19, Puppeteer, Gemini 2.5 Flash.

## Invariants & Compliance (@[.agents])
- **Dual URL Protocol**: Pooler 6543 (`DATABASE_URL`) & Direct 5432 (`DIRECT_URL`).
- **OCC Versioning**: 9 model mutable memiliki `version Int @default(1)` untuk proteksi mutasi atomik.
- **The 4 Zeros**: Zero Mock Data, Zero Hardcoded Dates (besok & weekend), Zero Data Loss, Zero Duplicate (sha256).

## Multi-Outlet, Nightly Pipeline & AI Engine
- 6 Outlet: Resort, Sunset Grill, Dragon Beach Club, D'Bistro, D'Bar & Karaoke, D'Spa & Onsen Belerang.
- Nightly Scrape (00:15 WIB via `.github/workflows/nightly-market-scrape.yml`):
  1. Berita Anyer/Banten (`lib/market/run-news.ts`).
  2. Tarif Dinamis Google Hotels (`lib/market/collect-rates.ts` besok & weekend).
  3. Ulasan Baru Google Maps (`lib/market/scrape-new-reviews.ts`).
  4. Radar IG/TikTok (`lib/market/scrape-social-buzz.ts`) & Promo Sync (`lib/market/sync-social-promos.ts`).
  5. Heartbeat Supabase `marketInsight`.
- Cloud-to-Local Mirror: `npm run sync:cloud-to-local` ekspor snapshot cloud ke `data/synced-cloud-snapshot.json`.
- Marketing Accelerator: AI Content Draft Generator (`lib/market/ai-content-generator.ts`, modal 3-tab Reels/TikTok/Carousel) via Gemini.
- Morning Briefing Engine: Alerting Telegram/Webhook otomatis pkl 07:00 WIB (`lib/market/morning-briefing.ts`, `npm run alert:morning`).
- Pengujian Kualitas: `npm run test:all` memverifikasi 7 test suites DevSecOps & pipeline nightly.
