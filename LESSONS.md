# Lessons

## 2026-10-21T10:50:55+00:00
Persiapan migrasi Supabase: cleanup 3 worktree lama membebaskan 2GB. Database migration ke Supabase wajib mematuhi skema Dual URL dan OCC @[.agents].

## 2026-10-22T06:45:00+00:00
Integrasi CRAWLAIBWP ke Sanghyang News:
1. Pemetaan 6 unit bisnis internal Sanghyang (Kamar, Sunset Grill, Dragon Beach Club, D'Bistro, D'Bar, D'Spa) dan entitas kompetitor ke tabel Competitor mempermudah pembagian sentimen dan rating dinamis (Zero Hardcode).
2. Bukti ulasan pelanggan riil (267 ulasan) dihubungkan langsung ke CompetitorReview dengan platform asli, tanggal, dan rating terverifikasi (Zero Mock Data).
3. 16 temuan aksi operasional (Maintain/Improve) dan komparasi head-to-head fasilitas tersimpan terstruktur di MarketInsight.
