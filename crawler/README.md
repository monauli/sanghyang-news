# Sanghyang Crawl4AI News Crawler Service

Layanan perayap dan ekstraksi berita presisi tinggi berbasis **Crawl4AI 0.9.2+** untuk proyek Sanghyang Highlights (Anyer, Banten).

Modul ini diarsiteki dengan standar yang sama seperti `GoodevaDesk/crawler` dengan dukungan:
- Perayapan headless Chromium berbasis **Crawl4AI** dengan eksekusi JavaScript penuh (mengatasi portal berita yang menggunakan SPA, lazy loading, atau anti-bot ringan).
- Pembersihan teks cerdas, ekstraksi judul hirarkis, dan konversi ke Markdown terstruktur.
- Ekstraksi gambar resolusi tinggi (`og:image`, `twitter:image`, metadata ukuran).
- Deteksi artikel berhalaman (`?page=2`, `/page/2`, `/2`) sesuai karakteristik portal berita Indonesia.
- Proteksi keamanan SSRF berlapis (menolak loopback, cloud metadata, dan IP privat).
- Mode ganda: **CLI Harvester** (`run_crawler.py`) dan **HTTP Microservice API** (`server.py` berbasis FastAPI).
- Turnkey Non-Root Dockerfile.

---

## 1. Struktur Folder

```
crawler/
├── Dockerfile                   # Turnkey non-root container spec
├── requirements.txt             # Dependensi Python (crawl4ai, playwright, fastapi, uvicorn)
├── README.md                    # Dokumentasi lengkap
├── data/
│   └── sample_articles.json     # Data uji & fixture luring
├── src/
│   ├── __init__.py
│   ├── config.py                # Konfigurasi timeout, cache, dan user-agent
│   ├── scraper.py               # Mesin perayap Crawl4AI + sanitasi HTML + SSRF guard
│   ├── server.py                # FastAPI HTTP Service (/health, /crawl, /crawl/batch)
│   └── run_crawler.py           # CLI harvester runner
└── tests/
    ├── __init__.py
    ├── test_scraper.py          # Uji logika ekstraksi, keamanan SSRF, dan pagination
    └── test_server.py           # Uji endpoint API FastAPI
```

---

## 2. Cara Menjalankan

### A. Menjalankan secara Lokal

1. Pasang dependensi dan browser:
   ```bash
   pip install -r requirements.txt
   playwright install --with-deps chromium
   ```

2. Jalankan CLI Harvester untuk 1 URL:
   ```bash
   python -m src.run_crawler --url "https://banten.antaranews.com/berita/..."
   ```

3. Jalankan CLI Harvester untuk batch URL (simpan ke JSON):
   ```bash
   python -m src.run_crawler --urls-file urls.txt --output hasil.json
   ```

4. Jalankan HTTP Microservice:
   ```bash
   python -m src.run_crawler --serve --port 8000
   # atau
   uvicorn src.server:app --host 0.0.0.0 --port 8000 --reload
   ```

### B. Menjalankan dengan Docker

```bash
# Bangun image
docker build -t sanghyang-crawler:latest ./crawler

# Jalankan container
docker run -d -p 8000:8000 --name sanghyang-crawler sanghyang-crawler:latest
```

---

## 3. Spesifikasi API Endpoint

### `GET /health`
Mengecek status kesehatan service:
```json
{
  "status": "healthy",
  "service": "sanghyang-crawl4ai-crawler",
  "engine": "crawl4ai-0.9.2"
}
```

### `POST /crawl`
Merayap satu URL artikel berita:
```json
// Request
{
  "url": "https://radarbanten.co.id/2026/09/proyek-tol-serang-panimbang-seksi-3-dikebut",
  "bypass_cache": true
}

// Response
{
  "url": "https://radarbanten.co.id/...",
  "title": "Proyek Tol Serang-Panimbang Seksi 3 Dikebut Menjelang Akhir Tahun",
  "slug": "proyek-tol-serang-panimbang-seksi-3-dikebut-menjelang-akhir-tahun",
  "full_text": "Pembangunan Jalan Tol Serang-Panimbang Seksi 3 terus dipercepat...",
  "markdown": "# Proyek Tol Serang-Panimbang Seksi 3 Dikebut...",
  "image_url": "https://radarbanten.co.id/wp-content/uploads/2026/09/tol-serpan.jpg",
  "image_width": 800,
  "attempt": "crawl4ai",
  "warnings": [],
  "metadata": {
    "domain": "radarbanten.co.id",
    "author": "Radar Banten"
  }
}
```

### `POST /crawl/batch`
Merayap daftar URL secara paralel:
```json
// Request
{
  "urls": [
    "https://banten.antaranews.com/berita/123",
    "https://radarbanten.co.id/berita/456"
  ]
}
```

---

## 4. Integrasi dengan Sanghyang Next.js (`lib/extractor.ts`)

Jika env `CRAWLER_SERVICE_URL=http://localhost:8000` disetel di `.env.local`, backend Next.js pada route `/api/extract` dapat otomatis meneruskan pengambilan artikel ke service Crawl4AI ini, dengan fallback otomatis ke `@extractus/article-extractor` jika service tidak aktif.

---

## 5. Menjalankan Pengujian (Testing)

```bash
pytest crawler/tests -v
```
Semua 10 pengujian memvalidasi:
- Sanitasi HTML & ekstraksi teks.
- Pembuatan slug URL ramah SEO.
- Deteksi artikel bersambung / berhalaman (`berhalaman`).
- Ekstraksi gambar OpenGraph & dimensi.
- Penangkalan serangan SSRF (loopback & cloud metadata).
- Validasi skema & respons endpoint FastAPI.
