/** Ambang logika & UI. Mendukung override dinamis melalui konfigurasi lingkungan (Zero Hardcode). */

// Pengelompokan skor (BACKEND.md §7)
export const SCORE_TINGGI = process.env.SCORE_TINGGI ? Number(process.env.SCORE_TINGGI) : 8; // 🟢 >= 8 → tampil default
export const SCORE_SEDANG = process.env.SCORE_SEDANG ? Number(process.env.SCORE_SEDANG) : 3; // 🟡 3-7 → tampil di bawah, ⚪ < 3 disembunyikan

// Ambang kemiripan judul untuk penanda gugus berita serupa.
export const DUPE_THRESHOLD = process.env.DUPE_THRESHOLD ? Number(process.env.DUPE_THRESHOLD) : 0.45;
