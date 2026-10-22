# MEMORY.md - Sanghyang News Project Facts (Hermes Protocol)

## Active Project & Stack Overview
- **Project**: Sanghyang News (Market Intelligence & Multi-Outlet Platform Anyer-Carita).
- **Status**: Production Deployed (Vercel `https://sanghyang-news.vercel.app`), Branch `master`.
- **Database**: PostgreSQL (Supabase BaaS) Ref: `lpnvlsmvndhfgodutpmu` (Region: `ap-south-1`).
- **Tech Stack**: Next.js 16.3.2 App Router (Turbopack, Node 24), Prisma 6.19, Puppeteer, Gemini 2.5 Flash.

## Architectural & Compliance Invariants (@[.agents])
- **Dual URL Protocol**: `url = env("DATABASE_URL")` (pooler 6543) dan `directUrl = env("DIRECT_URL")` (port 5432).
- **OCC Versioning**: 9 model mutable memiliki `version Int @default(1)` untuk proteksi mutasi atomik.
- **The 4 Zeros Invariant**: Zero Mock Data (ulasan autentik), Zero Hardcoded Dates (tanggal dinamis besok & weekend), Zero Data Loss (riwayat tarif tersimpan tanpa `deleteMany`), Zero Duplicate (hash sha256).

## Multi-Outlet & Autonomous Nightly Crawl Engine
- Super-Repo: Basis data internal Crawl4AI di `crawler/research/data/research.sqlite` terhubung ke Supabase.
- 6 Outlet Sanghyang: Kamar/Resort, Sunset Grill, Dragon Beach Club, D'Bistro, D'Bar & Karaoke, D'Spa & Onsen Belerang.
- Nightly Autonomous Scrape (00:15 WIB via `.github/workflows/nightly-market-scrape.yml`):
  1. Google News Anyer/Banten (`lib/market/run-news.ts`).
  2. Tarif Dinamis Google Hotels (`lib/market/collect-rates.ts` untuk besok & weekend).
  3. Incremental Reviews Ingestion Google Maps (`lib/market/scrape-new-reviews.ts`).
  4. Radar Postingan IG/TikTok Kompetitor (`lib/market/scrape-social-buzz.ts`).
  5. Audit Status Promo & Event (`lib/market/sync-social-promos.ts`).
  6. Heartbeat pencatatan data ke Supabase `marketInsight`.
- Cloud-to-Local Mirror: `npm run sync:cloud-to-local` mengekspor snapshot cloud ke `data/synced-cloud-snapshot.json`.
- Pengujian Kualitas: `npm run test:all` memverifikasi 6 gerbang DevSecOps & pipeline nightly.
