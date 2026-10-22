# Sanghyang Highlights



Alat untuk membuat newsletter berita bulanan Sanghyang Resort.

Pilih bulannya, sistem mencarikan beritanya, kamu pilih dan periksa, lalu unduh PDF-nya.



Biasanya selesai dalam 5–10 menit.



---



## Cara menjalankan



**Klik dua kali `Jalankan Sanghyang.bat`** di folder ini.



Akan muncul jendela hitam, lalu browser terbuka sendiri ke alatnya.

Tidak perlu mengetik apa pun.



> **Jendela hitam itu jangan ditutup** selama kamu memakai alatnya.

> Itu bukan error — di situlah alatnya berjalan. Kalau ditutup, alatnya mati.



Setelah PDF-nya terunduh dan kamu sudah selesai, tutup browser lalu tutup

jendela hitam itu.



Kalau browsernya tidak terbuka sendiri, buka browser dan ketik alamat yang

tertulis di jendela hitam, di baris **"ketik alamat ini"**.



### Kalau muncul tulisan "BELUM SIAP DIJALANKAN"



Artinya alatnya belum selesai dipasang di komputer itu.

Klik dua kali **`Setup Pertama Kali.bat`**, tunggu sampai muncul

`SETUP SELESAI`, baru jalankan lagi `Jalankan Sanghyang.bat`.



`Setup Pertama Kali.bat` cuma perlu dijalankan **sekali seumur pemasangan**.



### Fitur Eksekutif: Market Intelligence & Multi-Outlet 2026



Platform kini dilengkapi modul **Market Intelligence & Intelijen Bisnis Multi-Outlet** Anyer–Carita:

- **6 Unit Bisnis Sanghyang:** Kamar & Cottage (Resor), Sunset Grill, Dragon Beach Club, D'Bistro, D'Bar & Karaoke, D'Spa & Onsen Belerang.

- **Grounding Ulasan Riil (Zero Mock Data):** 270+ ulasan otentik bertanggal dari Google Maps, Traveloka, Agoda, TripAdvisor, dan Facebook lengkap dengan kutipan asli.

- **Rekomendasi Aksi Operasional:** Kartu *Maintain* (Pertahankan) & *Improve* (Perlu Ditingkatkan) lengkap dengan langkah tindakan konkret per outlet.

- **Benchmark Head-to-Head:** Komparasi langsung karakter pantai, infinity pool, hiburan malam, dan spa melawan ASTON, Mambruk, Novus Jiva, dan Patra Anyer.

- **Pelacak Tarif Google Hotels:** Perbandingan harga pasar terendah untuk tanggal, durasi menginap, dan jumlah tamu yang sama.

- **Database Persistence & OCC:** PostgreSQL (Supabase BaaS) dengan Prisma ORM 6.19 dan proteksi mutasi atomik Optimistic Concurrency Control (`version Int @default(1)`).



Prasyarat lokal:



```powershell

Copy-Item .env.example .env.local

# isi DATABASE_URL dan DIRECT_URL Supabase di .env.local

npm install

npm run db:generate

npx prisma migrate deploy

npm run dev

```



---



## Cara pakai



### Langkah 1 — Pilih bulan



Saat halaman dibuka, tanggalnya sudah otomatis terisi **bulan lalu** — biasanya itu

yang kamu butuhkan. Kalau mau bulan lain, ubah tanggalnya atau pakai tombol

**Bulan Ini** / **30 Hari Terakhir**.



Klik **Cari Berita**. Tunggu sekitar 10–30 detik. Jangan tutup tabnya.



### Langkah 2 — Pilih berita



Berita dikelompokkan jadi tiga:



| Kelompok | Isi |

|---|---|

| ⭐ **Berita Utama** | Paling cocok untuk newsletter — **mulai dari sini** |

| **Berita Lain** | Masih relevan, buka kalau Berita Utama kurang |

| **Kurang Relevan** | Kemungkinan besar tidak terpakai |



**Centang 4–5 berita** yang mau dipakai. Setiap kali kamu mencentang satu berita,

sistem akan mengambil isinya dan membuat ringkasan otomatis. Ini butuh

**10–40 detik per berita** — tulisan di kartunya akan memberi tahu sedang apa.



Label kecil berwarna hijau (🏖 Wisata, 💰 Ekonomi, dan sebagainya) menjelaskan

kenapa berita itu muncul.



### Langkah 3 — Periksa dan perbaiki



Klik **Lihat & Edit** pada berita yang sudah dicentang. Di situ kamu bisa:



- Memperbaiki **judul**

- Memperbaiki **ringkasan** (jumlah katanya terlihat di pojok kanan)

- **Mengganti gambar** kalau gambarnya kurang bagus

- Memperbaiki **link sumber**

- Menekan **Buat Ulang Ringkasan** kalau hasilnya kurang pas



### Langkah 4 — Susun dan unduh



Klik **Buat Newsletter**. Di halaman berikutnya kamu bisa:



- Mengubah **tanggal terbit**

- Mengubah **urutan artikel** dengan tombol ↑ dan ↓

- Melihat **pratinjau** — tampilannya persis seperti PDF nanti



Terakhir klik **Download PDF**.



---



## ⚠️ Peringatan penting



### 1. Jangan tutup tab sebelum PDF terunduh



Semua pekerjaanmu tersimpan di tab browser itu saja. Kalau tabnya ditutup atau

browsernya dimatikan sebelum PDF selesai diunduh, **semuanya hilang** dan kamu

harus mengulang dari awal.



### 2. SELALU baca ulang ringkasannya sebelum mengunduh



Ringkasan dibuat oleh AI. **AI bisa salah** — salah nama, salah angka, salah tanggal,

atau menulis kalimat yang tidak ada di berita aslinya.



Newsletter ini membawa nama Sanghyang. Baca setiap ringkasan sampai habis

sebelum mengunduh. Ini bagian pekerjaanmu, bukan pekerjaan komputer.



Perhatikan khusus label ini:



- **⚠️ Sumber terbatas** — berita aslinya pendek, ringkasannya lebih rawan salah.

  Periksa lebih teliti.

- **⚠️ Mirip dengan berita #…** — ada berita lain yang isinya serupa.

  Pilih salah satu saja supaya tidak dobel.

- **⚠️ Gambar resolusi rendah** — gambarnya akan terlihat pecah di PDF.

  Sebaiknya diganti.



### 3. Kalau ada banner kuning di atas halaman



Kalau muncul tulisan **"Sebagian pencarian gagal — hasil mungkin tidak lengkap"**,

artinya ada berita yang mungkin tidak ikut terkumpul. Kalau berita yang kamu cari

tidak ketemu, kembali ke halaman awal dan **ulangi pencariannya**.



### 4. Kalau PDF gagal terunduh



Kalau komputermu punya **Internet Download Manager (IDM)**, matikan dulu IDM-nya

lalu coba unduh lagi. IDM suka mencegat unduhan PDF sampai berkasnya jadi kosong.



---



## Kalau ada masalah



| Yang terjadi | Yang harus dilakukan |

|---|---|

| **"Link belum bisa dipastikan"** | Buka **Lihat & Edit**, buka beritanya sendiri di browser, salin alamatnya, tempel ke kolom **Link sumber**, lalu klik **Ambil Ulang dari Link** |

| **"Situs ini tidak bisa dibaca otomatis"** | Ada situs berita yang memblokir. Buka **Lihat & Edit**, buka beritanya di browser, salin isi beritanya, tempel ke kotak yang muncul, lalu klik **Buat Ulang Ringkasan** |

| **"Gagal merangkum"** | Klik **Buat Ulang Ringkasan**. Kalau masih gagal, tulis sendiri ringkasannya di kotak itu — hasilnya tetap bisa masuk PDF |

| **Gambarnya kosong** | Klik **Upload gambar** dan pilih gambar sendiri (JPG/PNG, maksimal 5 MB) |

| **Tombol "Buat Newsletter" abu-abu** | Ada berita terpilih yang belum punya ringkasan atau belum punya link. Tulisan di atas tombol memberi tahu berapa yang belum siap |

| **Berita yang dicari tidak ada** | Coba buka kelompok **Berita Lain**. Kalau tetap tidak ada, ulangi pencarian |

| **Pencarian sangat lama (>2 menit)** | Tutup tab, buka lagi alamat yang tertulis di jendela hitam, ulangi |

| **Halaman kosong / error** | Kembali ke alamat yang tertulis di jendela hitam dan mulai lagi dari awal |

| **Jendela hitamnya tertutup sendiri** | Buka lagi `Jalankan Sanghyang.bat`. Pekerjaan di tab browser hilang, harus mulai dari awal |

| **"APLIKASI SUDAH BERJALAN"** | Bukan error. Kamu klik `Jalankan Sanghyang.bat` dua kali. Browser sudah dibuka; tutup jendela yang baru ini saja, **jangan tutup yang satunya** |

| **"BELUM BISA DIJALANKAN" (banyak program lain)** | Jarang terjadi. Restart komputer lalu coba lagi |



---



## Cara memasang di komputer baru



### Yang dikirim



Salin folder aplikasi ini ke komputer tujuan (flashdisk, Google Drive, apa saja),

**tapi hapus dulu tiga hal ini sebelum menyalin:**



| Jangan ikut dikirim | Kenapa |

|---|---|

| `node_modules/` | Ratusan MB, dan isinya khusus per komputer. `Setup Pertama Kali.bat` mengunduhnya sendiri |

| `.next/` | Hasil build lama. Ikut dibuat ulang saat setup |

| `.env.local` | **Berisi kunci Gemini dan sandi.** Kirim terpisah, atau biarkan setup membuat yang kosong lalu isi di tempat |



Tanpa ketiganya, folder yang dikirim tinggal beberapa MB.



> **Soal `.env.local`:** kalau komputer baru itu memakai kunci Gemini yang sama,

> boleh dikirim (lewat jalur pribadi, jangan lewat chat grup). Kalau kuncinya

> beda, **jangan dikirim** — biarkan `Setup Pertama Kali.bat` membuat berkas

> kosong, lalu isi langsung di komputer itu.

>

> Jangan pernah menaruh `.env.local` di Git. Berkas itu sudah masuk `.gitignore`.



### Langkah pemasangan



1. Pasang **Node.js** versi LTS dari [nodejs.org](https://nodejs.org) — restart komputer setelahnya

2. Salin folder aplikasi ke komputer itu (tanpa tiga hal di atas)

3. Klik dua kali **`Setup Pertama Kali.bat`**, tunggu sampai selesai

4. Kalau muncul `HAMPIR SELESAI`, buka `.env.local` dengan Notepad dan isi

   `GEMINI_API_KEY=` dan `APP_PASSWORD=`

5. Klik dua kali **`Jalankan Sanghyang.bat`** — selesai



Setup butuh internet (mengunduh ±550 MB). Setelah terpasang, aplikasinya tetap

butuh internet untuk mencari berita dan memanggil Gemini, tapi tidak mengunduh

apa pun lagi.



---

---



# Catatan untuk developer



**Stack:** Next.js 16 (Turbopack, App Router) · TypeScript 5 · Prisma ORM 6.19 · PostgreSQL (Supabase BaaS) · Tailwind CSS 4 · Puppeteer · Google Gemini Flash-Lite



**Deployment & Arsitektur:**

- **Vercel Production (Live):** `https://sanghyang-news.vercel.app` terhubung langsung ke database PostgreSQL Supabase (`lpnvlsmvndhfgodutpmu`). Menjalankan dashboard eksekutif, intelijen pasar multi-outlet, dan perbandingan harga Google Hotels.

- **Lokal Komputer Staf:** `Jalankan Sanghyang.bat` tetap tersedia untuk staf menyusun newsletter bulanan secara lokal guna memanfaatkan koneksi IP residensial saat mencari berita portal daerah yang dilindungi Cloudflare.



### Konfigurasi Environment Variables



Simpan pengaturan di berkas `.env.local` (contoh tersedia di `.env.example`):



```bash

# Database PostgreSQL Supabase (Dual URL Protocol)

DATABASE_URL="postgresql://postgres.lpnvlsmvndhfgodutpmu:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

DIRECT_URL="postgresql://postgres.lpnvlsmvndhfgodutpmu:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"



# AI & Autentikasi

GEMINI_API_KEY="AIzaSy..."

APP_PASSWORD="sandi-rahasia-akses-aplikasi"

CRON_SECRET="secret-bearer-cron"

GEMINI_MODEL="gemini-2.5-flash"

PUPPETEER_SKIP_DOWNLOAD=true

```



- `DATABASE_URL` — Connection string pooler Supabase (IPv4 / pgbouncer port 6543) untuk query aplikasi runtime.

- `DIRECT_URL` — Connection string sesi langsung (port 5432) khusus untuk migrasi Prisma (`npx prisma migrate deploy`).

- `APP_PASSWORD` — Sandi bersama untuk masuk. **Wajib diisi.** Jika kosong, `proxy.ts` mengunci seluruh aplikasi dengan HTTP 503 (*Fail-Closed Protocol*).

- `GEMINI_API_KEY` — Kunci API Google AI Studio untuk pembuatan ringkasan berita otomatis.

- `CRON_SECRET` — Secret Bearer untuk mengamankan trigger scraping otomatis pada `GET /api/cron/scrape`.

- `PUPPETEER_SKIP_DOWNLOAD` — `true` di server Vercel agar build tidak mengunduh binary Chromium yang tidak diperlukan.



### ⚠️ Kenapa aplikasi ini dijalankan LOKAL, bukan di-deploy



**Keputusan: dipakai lokal lewat `Jalankan Sanghyang.bat`. Vercel dibiarkan

sebagai cadangan, tidak dipakai sehari-hari.**



Alasannya diukur, bukan diperkirakan. `scripts/test-portal.ts` menguji 70 artikel

yang sama persis — daftar URL identik, kode extract identik, dijalankan berurutan

dalam satu proses — dari koneksi rumah dan dari `/api/extract` yang ter-deploy:



| | artikel terbaca | |

|---|---|---|

| **Lokal** (IP rumah) | **53/70** | **76%** |

| **Vercel** (IP datacenter) | **38/70** | **54%** |



Selisihnya 15 artikel, dan **pertukarannya searah**: 15 artikel lolos di rumah

tapi ditolak di Vercel, **0 artikel** sebaliknya. Deploy murni menurunkan

kemampuan aplikasi.



Penyebabnya bukan kode, tapi **Cloudflare menolak IP datacenter**. Sepuluh portal

menjawab 200 dengan normal dari koneksi rumah dan `HTTP 403` dari Vercel dalam

122–758 ms — ditolak di tepi jaringan sebelum menyentuh server portalnya. Sembilan

dari sepuluh memakai `server: cloudflare`:



```

ekbisbanten.com  bantenhay.com  satelitnews.com  pandeglangnews.co.id

topkonstruksi.com  kabarfajar.com  kbanews.com  ketik.com  kabar6.com

gerbangpatriot.com  <- LiteSpeed, 503, mekanisme lain

```



`ekbisbanten.com` adalah portal paling produktif di seluruh sampel — 5 artikel,

semuanya terbaca di rumah, **nol** di Vercel.



Dua catatan supaya angka ini tidak salah dipakai:



- Sampel 70 punya derau tinggi. Dua undian berbeda dari kolam yang sama

  memberi 53% dan 76% keberhasilan lokal. Yang bisa dipegang adalah **pola per

  domain** dan **selisih lokal vs Vercel dalam satu putaran** (daftar URL sama),

  bukan angka mutlaknya. Daftar sampel tersimpan di `scripts/.portal-sampel.json`

  supaya uji berikutnya bisa dibandingkan lurus.

- Diuji dari region default Vercel. Region lain belum diuji.



Sisi baiknya lokal: tidak ada batas 60 detik, tidak ada cold start, Chromium

asli untuk PDF, dan tidak ada biaya.



### Deploy ke Vercel (cadangan, tidak dipakai)



Masih berfungsi dan sudah diuji di Vercel — PDF jadi, ringkasan jalan. Jangan

dihapus; berguna kalau komputer staf bermasalah. Sadari saja ±22 poin persen

artikel yang tidak terbaca dari sana.



- `vercel.json` — region `sin1` (Singapura), `maxDuration` 60 detik (batas Hobby),

  memori 1769 MB untuk `/api/export` karena Chromium haus memori

- `/api/export` mendeteksi lingkungan lewat `process.env.VERCEL`: di Vercel memakai

  `@sparticuz/chromium` + `puppeteer-core`, di lokal memakai `puppeteer` biasa yang

  membawa Chromium sendiri

- `puppeteer` sengaja ada di **devDependencies** — kalau ikut ter-install di Vercel,

  ukuran fungsinya membengkak percuma. Set `PUPPETEER_SKIP_DOWNLOAD=true` di env

  Vercel supaya build tidak mengunduh Chromium 150 MB yang tidak dipakai



Environment variables yang terpasang di Vercel Dashboard (Production & Preview):



| Variable | Fungsi & Nilai |

|---|---|

| `DATABASE_URL` | Pooler Supabase (port 6543, pgbouncer=true) |

| `DIRECT_URL` | Direct connection Supabase (port 5432) untuk deploy migrasi |

| `APP_PASSWORD` | Sandi otentikasi sesi staf/manajemen |

| `GEMINI_API_KEY` | Kunci Google Gemini AI |

| `CRON_SECRET` | Secret Bearer untuk cron scrape berita |

| `PUPPETEER_SKIP_DOWNLOAD` | `true` (menggunakan `@sparticuz/chromium`) |



**Batas Hobby yang perlu disadari:** merangkum makan 10–39 detik per artikel dan

batasnya 60 detik. Artikel panjang saat Gemini sedang lambat bisa kena timeout —

UI akan menampilkan "Gagal merangkum, silakan tulis manual", tidak crash.



### ⚠️ Risiko utama: resolver



`lib/resolver.ts` memakai endpoint **`batchexecute` milik Google News** untuk

menerjemahkan URL Google News terenkripsi menjadi URL portal asli.



**Ini API internal, bukan API resmi.** Google bisa mengubah atau mematikannya

sewaktu-waktu tanpa pemberitahuan. Kalau itu terjadi, **semua** artikel akan gagal

resolve serentak.



Fungsi `resolveOne()` disalin apa adanya dari riset yang terbukti jalan

(`spike3.mjs` baris 187). Pendekatan lain — mengikuti redirect, membaca atribut

`data-n-au`, men-decode base64 — **sudah diuji dan gagal 0/5**. Jangan ditulis ulang

tanpa riset baru.



Jalan keluarnya sudah tersedia di UI: user bisa mengisi alamat berita secara manual

lalu menekan **Ambil Ulang dari Link**, yang melewati resolver sepenuhnya.



### Struktur Folder & Modul



```

Setup Pertama Kali.bat   dipasang sekali - cek Node, npm install, .env.local, build

Jalankan Sanghyang.bat   dipakai staf sehari-hari - npm start + buka browser

proxy.ts                 penjaga sandi (Edge Auth Guard) — Next 16 memakai proxy.ts

vercel.json              konfigurasi serverless Vercel (region sin1, memory 1769MB)

/prisma                  schema.prisma (OCC versioning), 15 migrasi SQL, seeder

/config                  keywords.ts (19 query pencarian) · thresholds.ts (ambang bobot)

/lib                     googlenews · filter · scoring · resolver · extractor · gemini

/lib/market              insights · summary · classifier · price-scraper · repository

/templates               newsletter.ts (satu sumber pratinjau & cetak PDF)

/app/market-intelligence Dashboard Eksekutif Intelijen Pasar & Multi-Outlet Sanghyang

/app/admin/scraping      Panel kontrol scraping berita & tarif hotel Google

/app/api                 market-intelligence · search · summarize · export · login · cron

/scripts                 ingesti riset CRAWLAIBWP, runner DevSecOps compliance, pengujian

```



### Skrip uji



| Skrip | Gunanya |

|---|---|

| `test-pipeline.ts` | Cari + filter + skoring, plus cek daftar validasi PRD |

| `test-resolver.ts` | Resolve 8 artikel teratas |

| `test-extractor.ts` | Ambil isi + gambar (jalankan `test-resolver.ts` dulu) |

| `test-gemini.ts` | 3 ringkasan penuh + deteksi penjiplakan verbatim |

| `test-error-paths.ts` | Portal 403, link rusak, kunci Gemini salah |

| `test-urlaman.ts` | Penjaga SSRF — alamat internal ditolak, alamat portal diterima |

| `test-export.ts` | Generate PDF lalu bongkar isinya (butuh `npm run dev` jalan) |

| `test-filter.ts` | Saringan lokasi "Serang" (kota vs kata kerja) + pengelompokan berita serupa |

| `test-judul.ts` | Pembersih ekor nama media di judul RSS — termasuk judul bertanda hubung yang harus tetap utuh |

| `test-berhalaman.ts` | Deteksi artikel yang terbagi beberapa halaman, diuji dengan HTML asli lima portal |

| `test-portal.ts` | Survei portal: berapa persen artikel terbaca, dan kenapa yang gagal itu gagal. Bisa membandingkan lokal vs Vercel (`VERCEL_APP_URL=...`). Tidak memanggil Gemini |



### Hal yang perlu diketahui



- **Database PostgreSQL & Supabase BaaS:** Data tersimpan terpusat di Supabase (3.800+ artikel, 200+ entri pasar, 33 profil kompetitor & outlet, 270+ ulasan riil).

- **Optimistic Concurrency Control (OCC):** 9 tabel data dinamis menerapkan kolom `version Int @default(1)` untuk mencegah *race condition* dan menjamin integritas data tanpa *data loss*.

- **Grounding Ulasan Riil (Zero Mock Data):** Seluruh ulasan tamu memiliki tautan asli, tanggal kejadian, platform terverifikasi (Google Maps, Traveloka, Agoda, TripAdvisor, Facebook), dan penilaian sentimen riil.

- **Pemisahan Multi-Outlet:** 6 unit bisnis Sanghyang (Kamar, Sunset Grill, Dragon Beach Club, D'Bistro, D'Bar, D'Spa) dipisahkan secara tegas dari kompetitor dengan metrik operasional dan langkah perbaikan masing-masing.

- **`/api/export` tidak mengirim `Content-Disposition: attachment`** — download

  manager (IDM) mencegatnya dan mengembalikan 204 kosong. Nama berkas diatur

  di sisi klien lewat atribut `download`.

- **Semua fetch sisi server wajib lewat `fetchAman()` di `lib/urlaman.ts`**, jangan

  `fetch()` langsung. Alamatnya di-resolve DNS dulu lalu nomor IP hasilnya yang

  diperiksa — memeriksa nama host saja tidak cukup, karena `localtest.me` dan

  `*.nip.io` adalah nama biasa yang resolve ke `127.0.0.1`. Redirect diikuti manual

  supaya tiap lompatan ikut diperiksa. Yang diblokir: loopback, privat, link-local

  (`169.254.169.254`), CGNAT, ULA, multicast, dan rentang cadangan.

  Sisa celah yang diketahui: DNS rebinding (alamat berubah antara pemeriksaan dan

  fetch) — lihat komentar `ponytail:` di berkasnya.

- **Gemini dipanggil paralel** kalau user mencentang beberapa artikel sekaligus.

  Free tier ±10 RPM; retry backoff sudah ada. Belum jadi masalah pada pemakaian

  1 newsletter/bulan.

- **Ringkasan Gemini disaring ulang** oleh sanitizer di `lib/gemini.ts` untuk

  membuang kalimat sisa AI seperti "This translation preserves…". Jangan dihapus.





---



## Modul Terpadu: CrawlAI Research Engine (`crawler/research/`)



Repositori `SANGHYANG-NEWS` kini menyatukan 3 pilar sistem intelijen pariwisata terpadu (*All-in-One Super-Repository*):

1. **Newsletter Bulanan (`app/`):** Pengumpulan berita RSS regional Anyer–Banten, kurasi manual, ringkasan Gemini AI, dan ekspor cetak PDF berstandar editorial resolusi tinggi.

2. **Market Intelligence & Multi-Outlet (`app/market-intelligence`):** Dashboard eksekutif berbasis PostgreSQL Supabase dengan grounding ulasan riil pelanggan (Google Maps, Traveloka, Agoda, TripAdvisor, Facebook), pelacak tarif Google Hotels, matriks komparasi head-to-head, dan rekomendasi aksi operasional per unit bisnis (Kamar, Sunset Grill, Dragon Beach Club, D'Bistro, D'Bar, D'Spa).

3. **CrawlAI Research Engine (`crawler/research/`):** Mesin *deep web crawler* berbasis Python (Crawl4AI + Playwright + SQLite durabel) untuk ekstraksi sentimen multi-kanal, penambangan ulasan kompetitor Anyer–Carita, dan analisis aspek mendalam.



### 1. Menjalankan CrawlAI Research Engine Lokal



```powershell

cd crawler/research

uv sync --dev

uv run playwright install chromium

uv run crawlai-dashboard

```



- Buka dashboard riset lokal di browser pada port loopback yang ditampilkan terminal.

- Masukkan URL entitas bisnis / kompetitor baru untuk memulai siklus perayapan sentimen.

- Bukti ulasan dan entitas disimpan secara persisten di database internal `crawler/research/data/research.sqlite`.



### 2. Sinkronisasi Data Riset ke Supabase Satu Pintu



Setelah siklus perayapan selesai di mesin crawler internal, sinkronisasikan seluruh ulasan dan temuan baru ke PostgreSQL Supabase cukup dengan satu perintah dari root proyek:



```powershell

npm run sync:crawlai

```



Alur kerja perintah di atas:

1. `scripts/export_crawlai_for_ingest.py` membaca `crawler/research/data/research.sqlite` dan mengekspor run riset terbaru ke `data/crawlai_ingest_data.json`.

2. `scripts/ingest-crawlai-evidence.ts` membaca data JSON dan memperbarui tabel `CompetitorReview` serta `MarketInsight` di Supabase secara atomik dan terlindungi OCC (*Optimistic Concurrency Control*).



### 3. Pengujian Kualitas & Kepatuhan DevSecOps 2026



Repositori ini menerapkan standar integritas ketat *The 4 Zeros* (Zero Mock Data, Zero Hardcode, Zero Fallback, Zero Data Loss):



```powershell

# Uji seluruh gerbang kualitas .agents 2026 (OCC, Zero Hardcode, Zero Mock Data, Grounding Integrity)

npm run test:all



# Uji scraper berita & pelacak tarif Google Hotels

npm run test:market

```



---

## Mesin Perayapan Malam Otonom (*Autonomous Nightly Crawl Engine*)

Sistem menjalankan siklus perayapan data intelijen pasar secara otomatis setiap malam pukul **00:15 WIB** via GitHub Actions (`.github/workflows/nightly-market-scrape.yml`).

### Tahapan Eksekusi Otomatis Tiap Malam:
1. **Google News Anyer/Banten (`lib/market/run-news.ts`):** Mengambil artikel berita terbaru terkait perhotelan, pariwisata, dan event Anyer–Carita.
2. **Tarif Dinamis Google Hotels (`lib/market/collect-rates.ts`):** Mengukur tarif menginap riil untuk 2 titik waktu dinamis: **besok malam** (*last-minute rate*) dan **akhir pekan Sabtu-Minggu** (*weekend peak rate*). Menerapkan *Zero Data Loss* (tanpa `deleteMany`) agar riwayat fluktuasi harga tersimpan permanen sebagai *time-series rate trends*.
3. **Incremental Reviews Scraper (`lib/market/scrape-new-reviews.ts`):** Merayap ulasan publik terbaru dari Google Maps & Traveloka untuk Sanghyang dan kompetitor, dengan deduplikasi hash atomik (Zero Duplicate).
4. **Radar Media Sosial Kompetitor (`lib/market/scrape-social-buzz.ts`):** Memantau postingan dan reels terbaru dari akun Instagram (`@astonanyer`, `@mambrukhotelanyer`, `@novusjivaanyer`, dll.) dan TikTok.
5. **Audit Status Promo & Event (`lib/market/sync-social-promos.ts`):** Mengaudit masa berlaku promo (aktif, segera datang, berakhir).
6. **Heartbeat Recording:** Mencatat ringkasan statistik perayapan ke tabel `MarketInsight` Supabase.

### 4. Sinkronisasi Data Cloud ke Laptop Lokal (*Cloud-to-Local Mirror*)

Untuk memeriksa snapshot data terbaru yang dirayap GitHub Actions di komputer lokal:

```powershell
npm run sync:cloud-to-local
```

Perintah di atas mengekspor ringkasan data dari PostgreSQL Supabase ke berkas JSON lokal di `data/synced-cloud-snapshot.json`.

---

## Radar Media Sosial & Analisis Tren Konten

Halaman **Market Intelligence** menyediakan 3 mode analisis media sosial komprehensif:

1. **🖼️ Galeri Feed & Reels Promosi:** Menampilkan kartu postingan promosi riil kompetitor dengan filter hotel, kategori konten, dan platform (Instagram / TikTok), dilengkapi tombol **`📋 Salin Taktik`** untuk menyalin rekomendasi balasan strategi ke clipboard.
2. **📊 Matriks Komparasi 6 Outlet vs Kompetitor:** Memetakan posisi keunggulan nilai jual (USP) dan format konten terbaik untuk 6 outlet Sanghyang (Kamar, Sunset Grill, Dragon Beach Club, D'Spa Onsen Belerang Alami, D'Bistro, D'Bar).
3. **📈 Tren Konten & Celah Pasar:** Grafik batang distribusi pilar konten (*Content Mix*), peta kekuatan platform (Instagram 87.5% vs TikTok 12.5%), serta 4 Peluang Celah Pasar Utama (*Market Gap Opportunities*).

---

## Kalkulator Simulasi Tarif Dinamis & Optimasi RevPAR

Terintegrasi langsung di dashboard (`/market-intelligence`):
- **Slider Okupansi Interaktif:** Menyesuaikan tarif rekomendasi berdasarkan tingkat keterisian kamar (10% hingga 100%).
- **Tipe Hari Menginap:** Mendukung perhitungan khusus hari kerja (*Weekday*), Jumat sore, Sabtu malam (*Peak Saturday*), dan hari Minggu.
- **Rekomendasi Bundling & Tipe Kamar:** Simulasi tarif untuk Kamar Standard, Deluxe Pool View, Beachfront Villa, hingga Family Suite lengkap dengan proyeksi omset bulanan dan *Price Positioning Index* terhadap rata-rata pasar Anyer.


---

## Mesin Perayapan Malam Otonom (*Autonomous Nightly Crawl Engine*)

Sistem menjalankan siklus perayapan data intelijen pasar secara otomatis setiap malam pukul **00:15 WIB** via GitHub Actions (`.github/workflows/nightly-market-scrape.yml`).

### Tahapan Eksekusi Otomatis Tiap Malam:
1. **Google News Anyer/Banten (`lib/market/run-news.ts`):** Mengambil artikel berita terbaru terkait perhotelan, pariwisata, dan event Anyer–Carita.
2. **Tarif Dinamis Google Hotels (`lib/market/collect-rates.ts`):** Mengukur tarif menginap riil untuk 2 titik waktu dinamis: **besok malam** (*last-minute rate*) dan **akhir pekan Sabtu-Minggu** (*weekend peak rate*). Menerapkan *Zero Data Loss* (tanpa `deleteMany`) agar riwayat fluktuasi harga tersimpan permanen sebagai *time-series rate trends*.
3. **Incremental Reviews Scraper (`lib/market/scrape-new-reviews.ts`):** Merayap ulasan publik terbaru dari Google Maps & Traveloka untuk Sanghyang dan kompetitor, dengan deduplikasi hash atomik (Zero Duplicate).
4. **Radar Media Sosial Kompetitor (`lib/market/scrape-social-buzz.ts`):** Memantau postingan dan reels terbaru dari akun Instagram (`@astonanyer`, `@mambrukhotelanyer`, `@novusjivaanyer`, dll.) dan TikTok.
5. **Audit Status Promo & Event (`lib/market/sync-social-promos.ts`):** Mengaudit masa berlaku promo (aktif, segera datang, berakhir).
6. **Heartbeat Recording:** Mencatat ringkasan statistik perayapan ke tabel `MarketInsight` Supabase.

### 4. Sinkronisasi Data Cloud ke Laptop Lokal (*Cloud-to-Local Mirror*)

Untuk memeriksa snapshot data terbaru yang dirayap GitHub Actions di komputer lokal:

```powershell
npm run sync:cloud-to-local
```

Perintah di atas mengekspor ringkasan data dari PostgreSQL Supabase ke berkas JSON lokal di `data/synced-cloud-snapshot.json`.

---

## Radar Media Sosial & Analisis Tren Konten

Halaman **Market Intelligence** menyediakan 3 mode analisis media sosial komprehensif:

1. **🖼️ Galeri Feed & Reels Promosi:** Menampilkan kartu postingan promosi riil kompetitor dengan filter hotel, kategori konten, dan platform (Instagram / TikTok), dilengkapi tombol **`📋 Salin Taktik`** untuk menyalin rekomendasi balasan strategi ke clipboard.
2. **📊 Matriks Komparasi 6 Outlet vs Kompetitor:** Memetakan posisi keunggulan nilai jual (USP) dan format konten terbaik untuk 6 outlet Sanghyang (Kamar, Sunset Grill, Dragon Beach Club, D'Spa Onsen Belerang Alami, D'Bistro, D'Bar).
3. **📈 Tren Konten & Celah Pasar:** Grafik batang distribusi pilar konten (*Content Mix*), peta kekuatan platform (Instagram 87.5% vs TikTok 12.5%), serta 4 Peluang Celah Pasar Utama (*Market Gap Opportunities*).

---

## Kalkulator Simulasi Tarif Dinamis & Optimasi RevPAR

Terintegrasi langsung di dashboard (`/market-intelligence`):
- **Slider Okupansi Interaktif:** Menyesuaikan tarif rekomendasi berdasarkan tingkat keterisian kamar (10% hingga 100%).
- **Tipe Hari Menginap:** Mendukung perhitungan khusus hari kerja (*Weekday*), Jumat sore, Sabtu malam (*Peak Saturday*), dan hari Minggu.
- **Rekomendasi Bundling & Tipe Kamar:** Simulasi tarif untuk Kamar Standard, Deluxe Pool View, Beachfront Villa, hingga Family Suite lengkap dengan proyeksi omset bulanan dan *Price Positioning Index* terhadap rata-rata pasar Anyer.

