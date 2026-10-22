# CrawlAI business research

Dashboard lokal berbahasa Indonesia untuk riset bisnis dari URL, sentimen pelanggan dan pembanding kompetitor. Menggunakan Crawl4AI dan akses Codex/ChatGPT yang sudah masuk. Tidak memerlukan API key AI tambahan.

```powershell
uv sync --dev
uv run playwright install chromium
codex login status
uv run crawlai-dashboard
```

Buka alamat loopback yang ditampilkan server, masukkan URL bisnis, lalu mulai riset. Periode riset tetap 12 bulan kalender terakhir dan dibekukan saat pekerjaan dibuat. Batas bawaan: 200 halaman dan 30 panggilan Codex per pekerjaan. Pengaturan `CRAWLAI_` tersedia di `.env.example`; jangan masukkan kredensial ke repositori.

Kasus pertama: Sanghyang Indah Spa Resort dan enam outletnya, dengan bukti dan kompetitor dipisahkan per unit. Dashboard menampilkan apa yang perlu diperbaiki/dipertahankan beserta sumbernya. Konten promosi, editorial, cuplikan pencarian dan bukti tanpa tanggal tidak dihitung sebagai sentimen pelanggan dalam periode. Sumber yang terblokir atau tidak tersedia ditampilkan sebagai keterbatasan; hasil bukan sensus seluruh internet.

Pekerjaan dan bukti tersimpan di `data/` melalui SQLite dan DBOS. Ekspor HTML, CSV dan JSON tersedia pada pekerjaan yang selesai. Jalankan kembali server setelah terhenti untuk melanjutkan pekerjaan yang durabel. Data lokal dan artefak riset tidak masuk Git.

## Rilis snapshot privat ke Vercel

Dashboard Vercel hanya membaca snapshot riset terbaru; Crawl4AI dan analisis Codex tetap berjalan lokal. Setelah riset lokal selesai, jalankan `uv run python scripts/export_vercel_snapshot.py`, lalu commit `deploy/snapshot.json` dan `deploy/reports/` ke repo GitHub privat. Sebelum mengaktifkan deployment Git, verifikasi bahwa push `main` benar-benar menghasilkan Preview; jangan gunakan cabang rilis sampai produksi disetujui.

Hubungkan repo ke Vercel dan atur environment variables pada Project Settings, untuk Preview dan Production:

- `CRAWLAI_ADMIN_USER`: `admin` (default).
- `CRAWLAI_ADMIN_PASSWORD`: kata sandi unik minimal 20 karakter; nilai `admin` ditolak.
- `CRAWLAI_SESSION_SECRET`: rahasia acak minimal 32 karakter untuk tanda tangan sesi.

Masukkan nilai rahasia langsung melalui pengaturan Vercel, jangan menyimpan atau mengirimkannya lewat Git, `.env`, atau command line. Sesi berakhir setelah 8 jam. Rilis cloud bersifat baca-saja dan tidak menyediakan endpoint untuk memulai crawl.

Verifikasi sesudah satu riset nyata selesai dan server tetap berjalan:

```powershell
./scripts/install-tools.ps1
uv run python -m scripts.verify --job-id ID_PEKERJAAN
```

Runner berhenti pada gerbang pertama yang gagal. Perbaiki akar masalah lalu jalankan kembali dari Gate 1; alat yang hilang, kerentanan dependensi dan cakupan tes di bawah 80% tidak dianggap lulus. Laporan berada di `artifacts/verification/`. Untuk smoke saja: `uv run python -m scripts.smoke --job-id ID_PEKERJAAN`.

Lihat [rencana yang disetujui](docs/plans/implementation_plan.md), [tinjauan kompatibilitas blueprint](docs/architecture/blueprint-compatibility.md), dan [aturan keamanan](SECURITY.md). Aplikasi lokal dan Preview Vercel memakai snapshot yang sama. Produksi hanya dipublikasikan setelah Preview diverifikasi dan mendapat konfirmasi.
