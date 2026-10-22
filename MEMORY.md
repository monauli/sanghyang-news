# MEMORY.md - Sanghyang News Project Facts (Hermes Protocol)

## Active Project & Stack Overview
- **Project**: Sanghyang News (Market Intelligence & Multi-Outlet Platform Anyer-Carita).
- **Status**: Production Deployed (Vercel `https://sanghyang-news.vercel.app`), Branch `master`.
- **Database**: PostgreSQL (Supabase BaaS) Project Ref: `lpnvlsmvndhfgodutpmu` (Region: `ap-south-1`).
- **Primary Tech Stacks**:
  - Backend: Next.js 16.3.2 App Router (Turbopack, Node 24 LTS)
  - ORM: Prisma 6.19
  - Scraping & AI: Puppeteer-core, Article Extractor, Google Gemini 2.5 Flash

## Architectural & Compliance Invariants (@[.agents])
- **Dual URL Protocol**: `url = env("DATABASE_URL")` (pooler 6543) dan `directUrl = env("DIRECT_URL")` (port 5432).
- **OCC Versioning**: 9 model mutable memiliki kolom `version Int @default(1)` untuk proteksi mutasi atomik.
- **Migration Protocol**: 15 migrasi SQL di `prisma/migrations/`, deploy via `npx prisma migrate deploy`.
- **Zero Mock Data**: Seluruh 273 ulasan pelanggan memiliki URL terverifikasi, tanggal riil, dan kutipan autentik.

## CRAWLAIBWP Multi-Outlet Integration
- Super-Repo All-in-One: Seluruh kode mesin perayap Crawl4AI ditempatkan di `crawler/research/` dengan basis data SQLite internal.
- 6 Outlet Sanghyang: Kamar/Resort, Sunset Grill, Dragon Beach Club, D'Bistro, D'Bar & Karaoke, D'Spa & Onsen Belerang.
- 16 Entitas terdaftar, 273 ulasan pelanggan riil (Google Maps, Traveloka, Agoda, TripAdvisor), 16 MarketInsight (10 temuan maintain/improve + 5 komparasi head-to-head + 1 ringkasan eksekutif riset).
- Satu Pintu Sinkronisasi: `npm run sync:crawlai` mengekspor dari `crawler/research/data/research.sqlite` langsung ke Supabase.
- Pengujian Kualitas: `npm run test:all` memverifikasi 100% kepatuhan The 4 Zeros dan API Multi-Outlet.
