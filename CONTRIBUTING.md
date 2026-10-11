# Panduan Kontribusi (Contributing Guidelines): Sanghyang News

Terima kasih atas minat Anda berkontribusi pada pengembangan repositori ini. Untuk menjaga kualitas, kebersihan struktur, dan keandalan sistem, setiap kontributor wajib mengikuti standar teknis berikut:

---

## 1. Standar Pesan Commit (Conventional Commits 1.0.0)

Format commit yang diizinkan: `<tipe>(<lingkup>): <deskripsi singkat>`
- `feat`: Penambahan fitur atau fungsionalitas baru.
- `fix`: Perbaikan bug atau celah keamanan.
- `refactor`: Perubahan struktur kode tanpa mengubah fungsionalitas eksternal.
- `test`: Penambahan atau perbaikan unit/integration tests.
- `docs`: Pembaruan atau penambahan dokumentasi arsitektur.
- `chore`: Pembaruan dependensi, konfigurasi build, atau tool linter.

---

## 2. Dynamic Quality Gates (Pre-Push & CI/CD Invariants)

Setiap kontribusi wajib melewati Gerbang Kualitas secara otomatis:
1. **Gate 1**: Static Code Linter (`npm run lint`) — 0 warning kritis, 0 error.
2. **Gate 2**: Strict Static Type Checker (`npm run typecheck`) — 0 type errors.
3. **Gate 3**: Automated Test Suite (`npm test`) — 100% lulus.
4. **Gate 4**: Production Build Compilation (`npm run build`) — 0 build failure.
5. **Gate 5**: Turnkey Runtime Probes & Health Checks (`/api/health`) — status HTTP 200.
6. **Gate 6**: AI Governance & Model Provenance — verifikasi `GEMINI_MODEL` dan sanitasi prompt.
7. **Gate 7**: Optimistic Concurrency Control (OCC) — integritas kolom `version` pada skema Prisma.

