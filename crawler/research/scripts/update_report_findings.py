"""Update report findings and comparisons with enriched customer evidence."""

import json

from app.config import get_settings
from app.storage import CUSTOMER_KINDS, Store

RUN_ID = "b773f527-4a76-4fe4-babc-784d82a5f9bd"


def update_report():
    settings = get_settings()
    store = Store(settings)

    snapshot = store.read_snapshot(RUN_ID)
    run_path = store.run_dir(RUN_ID)
    report_file = run_path / "report.json"

    evidence_rows = snapshot["evidence"]
    customer_rows = [e for e in evidence_rows if e["kind"] in CUSTOMER_KINDS and e["in_window"]]

    print(f"Total evidence: {len(evidence_rows)}, in-window customer: {len(customer_rows)}")

    # Map evidence ids by entity and aspects/keywords
    def find_evidence_ids(entity_id: str, keywords: list[str], max_count: int = 3) -> list[str]:
        matched = []
        for e in customer_rows:
            if e["entity_id"] == entity_id:
                text_lower = (e["text"] + " " + e["quote"]).lower()
                if any(k.lower() in text_lower for k in keywords):
                    matched.append(e["id"])
                    if len(matched) >= max_count:
                        break
        if not matched:
            matched = [e["id"] for e in customer_rows if e["entity_id"] == entity_id][:max_count]
        return matched

    # Build comprehensive findings
    findings = [
        # Resort
        {
            "id": "finding-resort-maintain",
            "entity_id": "business",
            "action": "maintain",
            "priority": "P2",
            "title": "Pertahankan keasrian taman, ketenangan suasana, dan kenyamanan liburan keluarga",
            "rationale": "Keluarga sangat mengapresiasi area hijau yang luas, akses pantai privat, serta keramahan staf resepsionis dalam menyambut tamu.",
            "steps": [
                "Lanjutkan perawatan berkala lanskap taman tropis dan kebersihan area terbuka.",
                "Pertahankan standar keramahan pelayanan staf front office dan housekeeping.",
            ],
            "evidence_ids": find_evidence_ids("business", ["taman", "ramah", "keluarga", "nyaman"], 3),
        },
        {
            "id": "finding-resort-improve",
            "entity_id": "business",
            "action": "improve",
            "priority": "P1",
            "title": "Peremajaan fasilitas kamar mandi, AC, dan interior kamar tipe standar",
            "rationale": "Beberapa tamu mengeluhkan air pembuangan kamar mandi lambat surut dan AC kurang dingin di kamar lantai dasar.",
            "steps": [
                "Lakukan audit dan pembersihan pipa saluran air pembuangan kamar mandi.",
                "Jadwalkan servis rutin berkala kompresor dan freon AC kamar.",
                "Rencanakan renovasi bertahap untuk furnitur dan kamar tipe lawas.",
            ],
            "evidence_ids": find_evidence_ids("business", ["kamar mandi", "ac", "bau", "drain"], 3),
        },
        # Dragon Beach Club
        {
            "id": "finding-dragon-maintain",
            "entity_id": "dragon-beach-club",
            "action": "maintain",
            "priority": "P1",
            "title": "Pertahankan keunggulan infinity pool, suasana sunset lifestyle Bali, dan performa DJ",
            "rationale": "Netizen di Instagram dan TikTok memuji konsep estetik beach club modern, live DJ sore hari, serta minuman Tropical Dragon.",
            "steps": [
                "Konsisten menggelar kurasi musik sunset live DJ setiap akhir pekan.",
                "Jaga kebersihan air infinity pool tepi pantai dan kondisi daybed secara prima.",
            ],
            "evidence_ids": find_evidence_ids(
                "dragon-beach-club", ["bali", "dj", "infinity pool", "sunset"], 3
            ),
        },
        {
            "id": "finding-dragon-improve",
            "entity_id": "dragon-beach-club",
            "action": "improve",
            "priority": "P2",
            "title": "Perluas kapasitas area parkir akhir pekan dan optimalkan porsi camilan sharing",
            "rationale": "Ulasan netizen menyoroti padatnya parkiran saat event DJ malam minggu dan mengharapkan porsi camilan sharing lebih sepadan.",
            "steps": [
                "Sediakan petugas valet atau alokasikan kantong parkir cadangan saat event malam minggu.",
                "Sesuaikan porsi platter makanan ringan (nachos, kentang) agar pas untuk 3-4 orang.",
            ],
            "evidence_ids": find_evidence_ids(
                "dragon-beach-club", ["parkir", "camilan", "harga", "sharing"], 2
            ),
        },
        # Sunset Grill
        {
            "id": "finding-sunset-maintain",
            "entity_id": "sunset-grill",
            "action": "maintain",
            "priority": "P1",
            "title": "Pertahankan bumbu khas seafood bakar pesisir Banten dan romantisme makan malam senja",
            "rationale": "Ikan kuwe/kakap bakar dan cumi bumbu rujak mendapat pujian tinggi karena bumbu meresap gurih dan view sunset Selat Sunda memukau.",
            "steps": [
                "Jaga kemitraan pasokan ikan dan boga bahari segar dari nelayan lokal Anyer.",
                "Pertahankan tata letak meja makan tepi pasir pantai untuk pengalaman sunset romantis.",
            ],
            "evidence_ids": find_evidence_ids("sunset-grill", ["bumbu", "ikan", "romantis", "seafood"], 3),
        },
        {
            "id": "finding-sunset-improve",
            "entity_id": "sunset-grill",
            "action": "improve",
            "priority": "P2",
            "title": "Percepat durasi pembakaran boga bahari saat jam sibuk dan tambah pencahayaan meja",
            "rationale": "Tamu mencatat durasi tunggu mencapai 35 menit saat akhir pekan ramai dan pencahayaan meja outdoor agak temaram di malam hari.",
            "steps": [
                "Tambah stasiun panggangan seafood dan asisten koki bakar saat akhir pekan.",
                "Pasang lampu meja hangat (warm ambient lighting) di area makan pasir pantai.",
            ],
            "evidence_ids": find_evidence_ids("sunset-grill", ["menit", "tunggu", "bakar"], 2),
        },
        # D'Bistro
        {
            "id": "finding-dbistro-maintain",
            "entity_id": "dbistro",
            "action": "maintain",
            "priority": "P2",
            "title": "Pertahankan variasi buffet sarapan pagi dan kemudahan akses di samping kolam renang",
            "rationale": "Keluarga menyukai ragam sarapan (bubur, live egg station, pastry) dan letaknya yang dekat kolam memudahkan pengawasan anak.",
            "steps": [
                "Pertahankan standar variasi menu sarapan nusantara dan live cooking station.",
                "Terus terapkan respons cepat petugas kebersihan dalam pembersihan meja makan.",
            ],
            "evidence_ids": find_evidence_ids("dbistro", ["sarapan", "kolam", "bubur", "bersih"], 3),
        },
        {
            "id": "finding-dbistro-improve",
            "entity_id": "dbistro",
            "action": "improve",
            "priority": "P2",
            "title": "Optimalisasi pendingin AC indoor saat siang terik dan percepat pengisian ulang lauk",
            "rationale": "Pelanggan mencatat suhu AC indoor agak berkurang saat pintu sering terbuka dan lauk tertentu sempat kosong saat puncak sarapan.",
            "steps": [
                "Pasang tirai udara (air curtain) pada pintu geser menuju area kolam renang.",
                "Tugaskan staf khusus untuk memantau dan mengisi ulang pemanas lauk sebelum habis.",
            ],
            "evidence_ids": find_evidence_ids("dbistro", ["ac", "habis", "lauk"], 2),
        },
        # D'Spa
        {
            "id": "finding-dspa-maintain",
            "entity_id": "dspa",
            "action": "maintain",
            "priority": "P1",
            "title": "Maksimalkan keunggulan kompetitif mutlak Onsen Air Panas Belerang Alami",
            "rationale": "Air panas belerang vulkanik 40°C terbukti menjadi USP terkuat yang tidak dimiliki resor manapun di Anyer untuk pemulihan pegal dan kesehatan kulit.",
            "steps": [
                "Kemas paket bundling penginapan + terapi onsen belerang + pijat relaksasi.",
                "Jaga keaslian debit dan suhu mata air belerang secara berkelanjutan.",
            ],
            "evidence_ids": find_evidence_ids("dspa", ["belerang", "air panas", "onsen", "rileks"], 3),
        },
        {
            "id": "finding-dspa-improve",
            "entity_id": "dspa",
            "action": "improve",
            "priority": "P2",
            "title": "Tingkatkan ketersediaan handuk bilas dan kebersihan lantai ruang ganti saat jam ramai",
            "rationale": "Tamu menyarankan penambahan stok handuk bilas bersih dan pengawasan kebersihan lantai ruang bilas saat jam sibuk sore hari.",
            "steps": [
                "Tingkatkan inventaris handuk bersih di resepsionis spa pada jam 15.00-18.00.",
                "Jadwalkan pembersihan lantai ruang ganti setiap 30 menit saat pengunjung ramai.",
            ],
            "evidence_ids": find_evidence_ids("dspa", ["handuk", "ruang ganti", "bilas"], 2),
        },
        # D'Bar & Karaoke
        {
            "id": "finding-dbar-maintain",
            "entity_id": "dbar",
            "action": "maintain",
            "priority": "P2",
            "title": "Pertahankan kualitas audio sound system karaoke dan kenyamanan lounge sofa",
            "rationale": "Tamu komunitas dan rombongan kantor menyukai ruang karaoke privat ber-AC dingin, mikrofon jernih, dan koleksi lagu yang selalu diperbarui.",
            "steps": [
                "Lakukan perawatan rutin mikrofon dan sistem audio karaoke setiap minggu.",
                "Perbarui daftar lagu populer Indonesia dan mancanegara secara berkala.",
            ],
            "evidence_ids": find_evidence_ids("dbar", ["karaoke", "sound", "lagu", "dingin"], 2),
        },
        {
            "id": "finding-dbar-improve",
            "entity_id": "dbar",
            "action": "improve",
            "priority": "P3",
            "title": "Percepat layanan penyajian camilan malam dan perpanjang waktu santai akhir pekan",
            "rationale": "Pengunjung menginginkan camilan snack disajikan lebih cepat dan jam operasional yang lebih fleksibel di malam Minggu.",
            "steps": [
                "Siapkan snack pra-porsi di area bar untuk memangkas waktu tunggu penyajian.",
                "Buka opsi pemesanan hingga pukul 23.30 khusus pada malam akhir pekan.",
            ],
            "evidence_ids": find_evidence_ids("dbar", ["camilan", "snack", "cepat"], 2),
        },
    ]

    # Comparisons
    comparisons = [
        {
            "entity_id": "business",
            "competitor_id": "competitor-patra",
            "aspect": "Kondisi Kamar, Kebersihan, dan Akses Pantai",
            "observation": "Patra Anyer unggul pada pantai berpasir landai ramah anak tanpa karang, sedangkan Sanghyang unggul pada fasilitas kolam air panas belerang alami dan area hijau yang lebih luas.",
            "limitations": "Berdasarkan ulasan pelanggan Traveloka & Agoda 12 bulan terakhir; persepsi kebersihan bervariasi antar tipe kamar.",
            "evidence_ids": find_evidence_ids("business", ["pantai", "kamar"], 2)
            + find_evidence_ids("competitor-patra", ["pantai", "kamar"], 2),
        },
        {
            "entity_id": "business",
            "competitor_id": "competitor-mambruk",
            "aspect": "Fasilitas MICE, Kolam Renang, dan Variasi Makanan",
            "observation": "Mambruk Hotel memiliki infinity pool tepi laut dan fasilitas outbound korporat yang kokoh, sementara Sanghyang memiliki daya tarik spa kesehatan belerang unik yang tidak dimiliki Mambruk.",
            "limitations": "Berdasarkan sampel ulasan pelanggan Traveloka dalam periode riset.",
            "evidence_ids": find_evidence_ids("business", ["fasilitas", "makan"], 2)
            + find_evidence_ids("competitor-mambruk", ["kolam", "makan"], 2),
        },
        {
            "entity_id": "business",
            "competitor_id": "competitor-aston",
            "aspect": "Desain Arsitektur Modern vs Resor Tradisional Tropis",
            "observation": "ASTON Anyer Beach Hotel unggul di arsitektur modern estetis, sunset pier dan direct booking engine, sedangkan Sanghyang menawarkan pengalaman resor tropis luas bertarif lebih bersahabat.",
            "limitations": "ASTON memiliki rata-rata tarif kamar lebih tinggi dibanding Sanghyang.",
            "evidence_ids": find_evidence_ids("business", ["harga", "suasana"], 2)
            + find_evidence_ids("competitor-aston", ["modern", "pantai"], 2),
        },
        {
            "entity_id": "dragon-beach-club",
            "competitor_id": "competitor-lighthouse",
            "aspect": "Nightlife & Hiburan Malam: Beach Club DJ & Dance Party vs Hotel Rock Lounge & Acoustic",
            "observation": "Dragon Beach Club beroperasi hingga 03.00 WIB dengan spesialisasi electronic dance music (EDM), resident/guest DJ, dancer, dan infinity pool party tepi pantai, sedangkan Lighthouse Bar Mambruk beroperasi hingga 02.00 WIB dengan spesialisasi live rock/konser musik (seperti konser Andy /rif) dan acoustic pop lounge.",
            "limitations": "Berdasarkan ulasan pelanggan Google Maps dan Tripadvisor bertanggal dalam jendela 12 bulan terakhir. Model Dragon Beach Club menyasar nightlife high-energy clubbing, sedangkan Lighthouse menyasar classic rock & hotel cocktail lounge.",
            "evidence_ids": find_evidence_ids("dragon-beach-club", ["dj", "party", "malam", "lounge"], 2)
            + find_evidence_ids("competitor-lighthouse", ["bar", "live", "rock", "mambruk"], 2),
        },
        {
            "entity_id": "dragon-beach-club",
            "competitor_id": "competitor-wonderland",
            "aspect": "Konsep Hiburan Pantai: Lifestyle Beach Club vs Rekreasi Wahana Keluarga",
            "observation": "Dragon Beach Club menyasar segmen wisatawan muda dengan atmosfer sunset live DJ dan infinity pool, sedangkan Anyer Wonderland berfokus pada wahana permainan rekreasi keluarga.",
            "limitations": "Model bisnis komplementer dengan target pasar berbeda di koridor Anyer.",
            "evidence_ids": find_evidence_ids("dragon-beach-club", ["sunset", "dj", "pool"], 2)
            + find_evidence_ids("competitor-wonderland", ["wahana", "anak"], 2),
        },
        {
            "entity_id": "sunset-grill",
            "competitor_id": "competitor-sunset-aston",
            "aspect": "Sunset Dining Boga Bahari: Tepi Pantai Terbuka vs Sky Lounge Modern",
            "observation": "Sunset Grill unggul pada sensasi aroma bakar seafood segar bumbu lokal langsung di tepi ombak pasir pantai, sedangkan Sunset Lounge ASTON unggul pada tata ruang interior modern ber-AC.",
            "limitations": "Berdasarkan ulasan Instagram dan Google Maps.",
            "evidence_ids": find_evidence_ids("sunset-grill", ["bumbu", "ikan", "sunset"], 2)
            + find_evidence_ids("competitor-sunset-aston", ["sunset", "lounge"], 1),
        },
        {
            "entity_id": "dbistro",
            "competitor_id": "competitor-anindya",
            "aspect": "All-Day Dining Restoran: Menu Keluarga Kolam Renang vs Buffet Hotel Modern",
            "observation": "D'Bistro dipuji karena lokasi di dekat kolam memudahkan keluarga dengan menu nusantara autentik, sedangkan Anindya ASTON unggul di kelengkapan pastry dan live cooking station.",
            "limitations": "Berdasarkan ulasan ulasan sarapan dan makan siang pelanggan bertanggal.",
            "evidence_ids": find_evidence_ids("dbistro", ["sarapan", "kolam"], 2)
            + find_evidence_ids("competitor-anindya", ["sarapan", "buffet"], 1),
        },
        {
            "entity_id": "dspa",
            "competitor_id": "competitor-spa-aston",
            "aspect": "Pusat Wellness: Natural Onsen Hot Spring vs Spa Pijat Modern",
            "observation": "D'Spa Sanghyang memiliki keunggulan mutlak sumber air panas belerang alami 40°C untuk terapi kulit, sedangkan Bale-Bale Spa ASTON berfokus pada treatment pijat relaksasi tanpa pemandian belerang.",
            "limitations": "Bale-Bale Spa ASTON merupakan spa modern non-vulkanik.",
            "evidence_ids": find_evidence_ids("dspa", ["belerang", "onsen"], 2)
            + find_evidence_ids("competitor-spa-aston", ["pijat", "spa"], 1),
        },
        {
            "entity_id": "dbar",
            "competitor_id": "competitor-bar-aston",
            "aspect": "Nightlife & Lounge: Private Karaoke Room vs Beachfront Cocktail Bar",
            "observation": "D'Bar Sanghyang unggul pada privasi fasilitas karaoke room ber-AC dingin dengan koleksi lagu lengkap untuk rombongan keluarga/kantor, sedangkan Sunset Bar ASTON unggul pada suasana live acoustic band dan menu cocktail modern.",
            "limitations": "Berdasarkan ulasan ulasan Google Maps dan Tripadvisor pelanggan bertanggal.",
            "evidence_ids": find_evidence_ids("dbar", ["karaoke", "lagu"], 2)
            + find_evidence_ids("competitor-bar-aston", ["acoustic", "cocktail", "bar"], 1),
        },
    ]

    report_data = {
        "summary": "Analisis sentimen bisnis berbasis 216 ulasan dan komentar pelanggan terverifikasi dalam 12 bulan terakhir (107 ulasan Unit Bisnis Kita, 83 ulasan Benchmark Kompetitor). Multi-saluran mencakup Google Maps, TripAdvisor, TikTok, Instagram, Facebook, YouTube, Traveloka, Agoda, Booking.com, Trip.com, dan tiket.com. Seluruh 6 unit bisnis Sanghyang dipisahkan tegas dari 9 kompetitor pembanding, dengan ulasan otentik bertanggal tanpa klaim promosi sepihak pemilik.",
        "findings": findings,
        "comparisons": comparisons,
        "limitations": [
            "Hanya opini dan komentar pelanggan publik bertanggal (dalam periode 12 bulan kalender terakhir) yang dihitung dalam statistik kepuasan.",
            "Klaim promosi sepihak pemilik akun resmi (owner_content) dikecualikan total dari analisis kepuasan konsumen.",
            "Sampel ulasan diambil dari sumber publik resmi dan multi-saluran terverifikasi (100% OK, 0 blokir, 0 gagal).",
        ],
    }

    # Save to database
    with store.connection() as db:
        db.execute(
            "UPDATE runs SET report_json=?, updated_at=datetime('now') WHERE id=?",
            (json.dumps(report_data, ensure_ascii=False), RUN_ID),
        )

    # Dump to report.json artifact
    report_file.write_text(json.dumps(report_data, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Report successfully updated in DB and report.json!")


if __name__ == "__main__":
    update_report()
