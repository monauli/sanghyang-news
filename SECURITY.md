# Kebijakan Keamanan (Security Policy): Sanghyang News

Proyek ini menerapkan standar kepatuhan rekayasa perangkat lunak dan praktik pengungkapan kerentanan yang bertanggung jawab (*Responsible Vulnerability Disclosure*).

---

## 1. Pelaporan Kerentanan Keamanan

Jika Anda menemukan celah keamanan, kerentanan sistem, atau potensi kebocoran data:
- **JANGAN** membuat public issue di GitHub.
- Segera kirimkan laporan rinci ke tim teknis Sanghyang Resort atau pengelola repositori.

---

## 2. Responsible Disclosure SLA Penanganan & Notifikasi

- **Konfirmasi Penerimaan**: Tim teknis merespons laporan dalam waktu maksimal $\le 24$ jam.
- **Investigasi & Remediasi**: Penilaian dampak dan isolasi celah dieksekusi secara prioritas.
- **Notifikasi Insiden Terkoordinasi**: Pemberitahuan tertulis dan mitigasi kerentanan disampaikan kepada pihak terkait dalam target SLA maksimal 72 jam sesuai standar regulasi statutory UU PDP No. 27/2022 Pasal 46 dan ISO 27001.

---

## 3. Praktik Pengamanan Kode (The 4 Zeros)

1. **Zero Plaintext Secrets**: Seluruh kunci API (`GEMINI_API_KEY`) dan password wajib menggunakan variabel lingkungan terenkripsi dan file `.env` yang diproteksi oleh `.gitignore`.
2. **Zero Insecure Scraping**: Validasi alamat aman (SSRF Protection via `urlAman`) wajib aktif pada setiap permintaan HTTP crawler/extractor.
3. **Zero Data Loss**: Migrasi skema data mutable terlindungi dengan Optimistic Concurrency Control (OCC) versioning.

