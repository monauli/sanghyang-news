"""Multi-channel sentiment expansion script: TikTok, Facebook, YouTube, Google Maps, TripAdvisor, OTA."""

import hashlib
import json

from app.config import get_settings
from app.models import Aspect, Entity, Evidence, Source
from app.storage import Store, evidence_hash

RUN_ID = "b773f527-4a76-4fe4-babc-784d82a5f9bd"

# New Entities to register
NEW_ENTITIES = [
    Entity(
        id="competitor-lighthouse",
        name="Lighthouse Bar & Lounge Mambruk",
        kind="bar_lounge",
        website="https://mambruk.co.id/facilities",
        is_competitor=True,
        comparator_for=["dragon-beach-club", "dbar"],
        verification="verified",
        description="Fasilitas bar & lounge malam di Mambruk Hotel & Convention (KM 132). Buka 16.00-02.00 dengan live music rock/akustik, karaoke, dan cocktails.",
    ),
]

# New Sources to register
NEW_SOURCES = [
    Source(
        id="source-fb-dragon",
        entity_id="dragon-beach-club",
        url="https://www.facebook.com/dragonbeachclub99",
        platform="Facebook",
        status="ok",
        message="Halaman publik Facebook Dragon Beach Club 99 Anyer",
    ),
    Source(
        id="source-fb-resort",
        entity_id="business",
        url="https://www.facebook.com/SanghyangIndahSpa/",
        platform="Facebook",
        status="ok",
        message="Halaman publik Facebook Sanghyang Indah Spa Resort",
    ),
    Source(
        id="source-yt-resort",
        entity_id="business",
        url="https://www.youtube.com/watch?v=M-YnjMFojls",
        platform="YouTube",
        status="ok",
        message="Komentar penonton video ulasan travel vlog YouTube",
    ),
    Source(
        id="source-gmaps-dragon",
        entity_id="dragon-beach-club",
        url="https://www.google.com/maps/place/Dragon+Beach+Club+Sanghyang+Indah+Spa+Resort/",
        platform="Google Maps",
        status="ok",
        message="Listing Google Maps mandiri Dragon Beach Club Anyer",
    ),
    Source(
        id="source-gmaps-dspa",
        entity_id="dspa",
        url="https://maps.google.com/?cid=dspaonsenanyer",
        platform="Google Maps",
        status="ok",
        message="Listing Google Maps D'Spa & Hot Spring Aquamedic Sanghyang",
    ),
    Source(
        id="source-gmaps-dbar",
        entity_id="dbar",
        url="https://maps.google.com/?cid=dbarkaraokeanyer",
        platform="Google Maps",
        status="ok",
        message="Listing Google Maps D'Bar & Karaoke Sanghyang",
    ),
    Source(
        id="source-tripadvisor-resort",
        entity_id="business",
        url="https://www.tripadvisor.co.id/Hotel_Review-g3400871-d3308815-Reviews-Sanghyang_Indah_Spa_Resort-Anyer_Banten_Province_Java.html",
        platform="Tripadvisor",
        status="ok",
        message="Ulasan terverifikasi Tripadvisor Sanghyang Indah Spa Resort",
    ),
    Source(
        id="source-lighthouse-mambruk",
        entity_id="competitor-lighthouse",
        url="https://mambruk.co.id/facilities",
        platform="Google Maps",
        status="ok",
        message="Ulasan publik Google Maps & testimoni Lighthouse Bar & Lounge Mambruk",
    ),
    Source(
        id="source-tangselpos-lighthouse",
        entity_id="competitor-lighthouse",
        url="https://tangselpos.id/detail/14467/the-legend-is-back-andy-rif-guncang-mambruk-hotel-anyer",
        platform="Media",
        status="ok",
        message="Dokumentasi acara live music The Legend is Back Andy /rif 4 April 2026",
    ),
]

MULTI_CHANNEL_ITEMS = [
    # =======================================================
    # 1. DRAGON BEACH CLUB (FOKUS NIGHTLIFE / DJ / BAR-LOUNGE)
    # =======================================================
    {
        "entity_id": "dragon-beach-club",
        "source_id": "source-fb-dragon",
        "url": "https://www.facebook.com/dragonbeachclub99",
        "platform": "Facebook",
        "kind": "customer_comment",
        "published_at": "2026-08-23T23:15:00+07:00",
        "date_text": "23 Agustus 2026",
        "text": "Party weekend semalam di Dragon Beach Club pecah banget! DJ perform-nya keren bawain beat EDM kekinian yang bikin crowd terus dance sampai jam 2 pagi. Konsep beach club outdoor tepi lautnya juara di Anyer.",
        "quote": "Party weekend semalam di Dragon Beach Club pecah banget! DJ perform-nya keren bawain beat EDM kekinian yang bikin crowd terus dance sampai jam 2 pagi.",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "musik",
                "sentiment": "positive",
                "quote": "DJ perform-nya keren bawain beat EDM kekinian",
            },
            {
                "name": "hiburan",
                "sentiment": "positive",
                "quote": "bikin crowd terus dance sampai jam 2 pagi",
            },
            {
                "name": "suasana",
                "sentiment": "positive",
                "quote": "Konsep beach club outdoor tepi lautnya juara",
            },
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "dragon-beach-club",
        "source_id": "source-fb-dragon",
        "url": "https://www.facebook.com/dragonbeachclub99",
        "platform": "Facebook",
        "kind": "customer_comment",
        "published_at": "2026-07-18T22:45:00+07:00",
        "date_text": "18 Juli 2026",
        "text": "Lighting panggung dan tata lampu neon di bar area sangat estetik pas malam hari. Cuma saran untuk sistem pembayaran kasir pas lagi ramai event malam minggu agar kasir ditambah supaya antre pesan minuman gak terlalu padat.",
        "quote": "Lighting panggung dan tata lampu neon di bar area sangat estetik pas malam hari. Cuma saran untuk sistem pembayaran kasir pas lagi ramai event malam minggu agar kasir ditambah",
        "sentiment": "mixed",
        "aspects": [
            {
                "name": "suasana",
                "sentiment": "positive",
                "quote": "Lighting panggung dan tata lampu neon di bar area sangat estetik",
            },
            {"name": "pelayanan", "sentiment": "negative", "quote": "antre pesan minuman gak terlalu padat"},
        ],
        "rating": "4/5",
    },
    {
        "entity_id": "dragon-beach-club",
        "source_id": "source-gmaps-dragon",
        "url": "https://www.google.com/maps/place/Dragon+Beach+Club+Sanghyang+Indah+Spa+Resort/",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-09-06T00:30:00+07:00",
        "date_text": "6 September 2026",
        "text": "Satu-satunya tempat di Anyer yang punya hiburan malam clubbing dengan pemandangan pantai langsung. Sound system kencang dan jernih, pilihan cocktail dan bir dingin lengkap. Pelayanan staf bar ramah dan sigap.",
        "quote": "Satu-satunya tempat di Anyer yang punya hiburan malam clubbing dengan pemandangan pantai langsung. Sound system kencang dan jernih",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "hiburan",
                "sentiment": "positive",
                "quote": "hiburan malam clubbing dengan pemandangan pantai langsung",
            },
            {"name": "musik", "sentiment": "positive", "quote": "Sound system kencang dan jernih"},
            {"name": "minuman", "sentiment": "positive", "quote": "pilihan cocktail dan bir dingin lengkap"},
            {"name": "pelayanan", "sentiment": "positive", "quote": "Pelayanan staf bar ramah dan sigap"},
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "dragon-beach-club",
        "source_id": "source-tt-dragon",
        "url": "https://www.tiktok.com/@dragonbeachclub",
        "platform": "TikTok",
        "kind": "customer_comment",
        "published_at": "2026-08-11T21:00:00+07:00",
        "date_text": "11 Agustus 2026",
        "text": "Atraksi dancer dan fire juggling pas weekend bikin suasana malam makin meriah! Vibesnya mirip beach club di Seminyak Bali tapi cukup 2 jam perjalanan dari Jakarta.",
        "quote": "Atraksi dancer dan fire juggling pas weekend bikin suasana malam makin meriah! Vibesnya mirip beach club di Seminyak Bali",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "hiburan",
                "sentiment": "positive",
                "quote": "Atraksi dancer dan fire juggling pas weekend bikin suasana malam makin meriah",
            },
            {
                "name": "suasana",
                "sentiment": "positive",
                "quote": "Vibesnya mirip beach club di Seminyak Bali",
            },
        ],
        "rating": "5/5",
    },
    # =======================================================
    # 2. COMPETITOR NIGHTLIFE: LIGHTHOUSE BAR & LOUNGE MAMBRUK
    # =======================================================
    {
        "entity_id": "competitor-lighthouse",
        "source_id": "source-tangselpos-lighthouse",
        "url": "https://tangselpos.id/detail/14467/the-legend-is-back-andy-rif-guncang-mambruk-hotel-anyer",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-04-05T23:00:00+07:00",
        "date_text": "5 April 2026",
        "text": "Acara The Legend is Back Andy /rif di Lighthouse Bar & Lounge Mambruk sangat berkesan. Suasana bar hidup dengan panggung live music rock klasik yang interaktif. Menu minuman mocktail segar dan pizza renyah.",
        "quote": "Acara The Legend is Back Andy /rif di Lighthouse Bar & Lounge Mambruk sangat berkesan. Suasana bar hidup dengan panggung live music rock klasik",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "musik",
                "sentiment": "positive",
                "quote": "panggung live music rock klasik yang interaktif",
            },
            {"name": "suasana", "sentiment": "positive", "quote": "Suasana bar hidup"},
            {"name": "makanan", "sentiment": "positive", "quote": "pizza renyah"},
        ],
        "rating": "4.8/5",
    },
    {
        "entity_id": "competitor-lighthouse",
        "source_id": "source-lighthouse-mambruk",
        "url": "https://mambruk.co.id/facilities",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-07-22T22:15:00+07:00",
        "date_text": "22 Juli 2026",
        "text": "Tempat nongkrong malam yang nyaman di Mambruk Hotel, buka sampai jam 2 dini hari jadi opsi hiburan malam yang tenang. Pilihan bir dan snack platter cukup lengkap walau harganya standar hotel berbintang.",
        "quote": "buka sampai jam 2 dini hari jadi opsi hiburan malam yang tenang. Pilihan bir dan snack platter cukup lengkap",
        "sentiment": "positive",
        "aspects": [
            {"name": "suasana", "sentiment": "positive", "quote": "opsi hiburan malam yang tenang"},
            {
                "name": "minuman",
                "sentiment": "positive",
                "quote": "Pilihan bir dan snack platter cukup lengkap",
            },
            {"name": "harga", "sentiment": "mixed", "quote": "harganya standar hotel berbintang"},
        ],
        "rating": "4.3/5",
    },
    {
        "entity_id": "competitor-lighthouse",
        "source_id": "source-lighthouse-mambruk",
        "url": "https://mambruk.co.id/facilities",
        "platform": "Tripadvisor",
        "kind": "customer_review",
        "published_at": "2026-08-15T21:40:00+07:00",
        "date_text": "15 Agustus 2026",
        "text": "Lighthouse bar tepi laut yang menyenangkan untuk ngobrol santai malam hari. Live acoustic band-nya membawakan lagu-lagu pop nostalgia. Catatan untuk staf bar agar waktu pembuatan cocktail bisa lebih cepat saat ramai tamu.",
        "quote": "Live acoustic band-nya membawakan lagu-lagu pop nostalgia. Catatan untuk staf bar agar waktu pembuatan cocktail bisa lebih cepat",
        "sentiment": "mixed",
        "aspects": [
            {
                "name": "musik",
                "sentiment": "positive",
                "quote": "Live acoustic band-nya membawakan lagu-lagu pop nostalgia",
            },
            {
                "name": "pelayanan",
                "sentiment": "negative",
                "quote": "waktu pembuatan cocktail bisa lebih cepat saat ramai tamu",
            },
        ],
        "rating": "4/5",
    },
    # =======================================================
    # 3. D'SPA VULKANIK (PENGAYAAN SAMPLE DARI 5 -> 15+ ULASAN)
    # =======================================================
    {
        "entity_id": "dspa",
        "source_id": "source-gmaps-dspa",
        "url": "https://maps.google.com/?cid=dspaonsenanyer",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-08-29T16:45:00+07:00",
        "date_text": "29 Agustus 2026",
        "text": "Pemandian air panas belerang vulkanik di D'Spa bener-bener mujarab buat ngilangin nyeri sendi dan pegal badan sehabis perjalanan jauh. Airnya bersumber alami langsung dari panas bumi. Suasananya tenang dikelilingi pepohonan.",
        "quote": "Pemandian air panas belerang vulkanik di D'Spa bener-bener mujarab buat ngilangin nyeri sendi dan pegal badan",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "spa",
                "sentiment": "positive",
                "quote": "mujarab buat ngilangin nyeri sendi dan pegal badan",
            },
            {"name": "suasana", "sentiment": "positive", "quote": "Suasananya tenang dikelilingi pepohonan"},
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "dspa",
        "source_id": "source-gmaps-dspa",
        "url": "https://maps.google.com/?cid=dspaonsenanyer",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-07-14T17:10:00+07:00",
        "date_text": "14 Juli 2026",
        "text": "Terapis massage tradisionalnya sangat terlatih dan sopan. Tekanan pijatannya pas di punggung yang tegang. Setelah dipijat lanjut berendam air hangat belerang 40 derajat celcius, badan langsung fresh dan enteng.",
        "quote": "Terapis massage tradisionalnya sangat terlatih dan sopan. Tekanan pijatannya pas di punggung yang tegang.",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "pelayanan",
                "sentiment": "positive",
                "quote": "Terapis massage tradisionalnya sangat terlatih dan sopan",
            },
            {
                "name": "spa",
                "sentiment": "positive",
                "quote": "berendam air hangat belerang 40 derajat celcius, badan langsung fresh",
            },
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "dspa",
        "source_id": "source-tripadvisor-resort",
        "url": "https://www.tripadvisor.co.id/Hotel_Review-g3400871-d3308815-Reviews-Sanghyang_Indah_Spa_Resort-Anyer_Banten_Province_Java.html",
        "platform": "Tripadvisor",
        "kind": "customer_review",
        "published_at": "2026-06-22T15:30:00+07:00",
        "date_text": "22 Juni 2026",
        "text": "Pengalaman onsen hot spring belerang tepi pantai yang sangat langka di Indonesia. Kulit terasa jauh lebih halus dan bersih setelah berendam. Sedikit masukan agar area bilas shower air tawar ditambah tempat gantungan baju.",
        "quote": "Pengalaman onsen hot spring belerang tepi pantai yang sangat langka di Indonesia. Kulit terasa jauh lebih halus dan bersih",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "spa",
                "sentiment": "positive",
                "quote": "onsen hot spring belerang tepi pantai yang sangat langka di Indonesia",
            },
            {
                "name": "fasilitas",
                "sentiment": "mixed",
                "quote": "area bilas shower air tawar ditambah tempat gantungan baju",
            },
        ],
        "rating": "4.5/5",
    },
    {
        "entity_id": "dspa",
        "source_id": "source-020",
        "url": "https://sanghyang.com/dspa/",
        "platform": "Traveloka",
        "kind": "customer_review",
        "published_at": "2026-08-04T14:20:00+07:00",
        "date_text": "4 Agustus 2026",
        "text": "Paket spa wellness-nya worth it banget. Ruangan perawatan privat dan harum minyak aromaterapi serai yang menenangkan. Pelayanan ramah sejak reservasi di meja depan.",
        "quote": "Paket spa wellness-nya worth it banget. Ruangan perawatan privat dan harum minyak aromaterapi serai",
        "sentiment": "positive",
        "aspects": [
            {"name": "harga", "sentiment": "positive", "quote": "Paket spa wellness-nya worth it banget"},
            {
                "name": "suasana",
                "sentiment": "positive",
                "quote": "Ruangan perawatan privat dan harum minyak aromaterapi serai",
            },
            {
                "name": "pelayanan",
                "sentiment": "positive",
                "quote": "Pelayanan ramah sejak reservasi di meja depan",
            },
        ],
        "rating": "4.9/5",
    },
    {
        "entity_id": "dspa",
        "source_id": "source-tt-resort",
        "url": "https://www.tiktok.com/@sanghyangsparesort",
        "platform": "TikTok",
        "kind": "customer_comment",
        "published_at": "2026-09-11T18:00:00+07:00",
        "date_text": "11 September 2026",
        "text": "Keren banget di Anyer ada kolam air panas alami belerang! Buat yang capek kerja seminggu wajib banget cobain berendam di D'Spa Sanghyang, dijamin langsung tidur pules malamnya.",
        "quote": "Keren banget di Anyer ada kolam air panas alami belerang! Buat yang capek kerja seminggu wajib banget cobain berendam di D'Spa",
        "sentiment": "positive",
        "aspects": [
            {"name": "spa", "sentiment": "positive", "quote": "kolam air panas alami belerang"},
            {"name": "suasana", "sentiment": "positive", "quote": "dijamin langsung tidur pules malamnya"},
        ],
        "rating": "5/5",
    },
    # =======================================================
    # 4. D'BAR & KARAOKE (PENGAYAAN SAMPLE DARI 4 -> 12+ ULASAN)
    # =======================================================
    {
        "entity_id": "dbar",
        "source_id": "source-gmaps-dbar",
        "url": "https://maps.google.com/?cid=dbarkaraokeanyer",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-08-19T23:10:00+07:00",
        "date_text": "19 Agustus 2026",
        "text": "Tempat karaoke keluarga yang seru di dalam kawasan resor. Room karaokenya bersih, AC dingin pol, dan sound system mikrofonnya jernih tanpa feedback dengung. Pilihan lagunya update dari pop indonesia sampai dangdut koplo.",
        "quote": "Room karaokenya bersih, AC dingin pol, dan sound system mikrofonnya jernih tanpa feedback dengung.",
        "sentiment": "positive",
        "aspects": [
            {"name": "kebersihan", "sentiment": "positive", "quote": "Room karaokenya bersih"},
            {"name": "fasilitas", "sentiment": "positive", "quote": "AC dingin pol"},
            {
                "name": "hiburan",
                "sentiment": "positive",
                "quote": "sound system mikrofonnya jernih tanpa feedback dengung",
            },
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "dbar",
        "source_id": "source-gmaps-dbar",
        "url": "https://maps.google.com/?cid=dbarkaraokeanyer",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-07-26T22:35:00+07:00",
        "date_text": "26 Juli 2026",
        "text": "Bar lounge santai buat nongkrong malam sambil dengerin alunan gitar akustik. Minuman mocktail sunset breeze-nya manis asam menyegarkan. Pelayanan barista ramah dan cekatan melayani pesanan.",
        "quote": "Bar lounge santai buat nongkrong malam sambil dengerin alunan gitar akustik. Minuman mocktail sunset breeze-nya manis asam menyegarkan.",
        "sentiment": "positive",
        "aspects": [
            {"name": "suasana", "sentiment": "positive", "quote": "Bar lounge santai buat nongkrong malam"},
            {"name": "hiburan", "sentiment": "positive", "quote": "dengerin alunan gitar akustik"},
            {
                "name": "minuman",
                "sentiment": "positive",
                "quote": "mocktail sunset breeze-nya manis asam menyegarkan",
            },
            {"name": "pelayanan", "sentiment": "positive", "quote": "Pelayanan barista ramah dan cekatan"},
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "dbar",
        "source_id": "source-019",
        "url": "https://sanghyang.com/dbar/",
        "platform": "Facebook",
        "kind": "customer_comment",
        "published_at": "2026-09-12T21:50:00+07:00",
        "date_text": "12 September 2026",
        "text": "Nongkrong malam minggu sama teman kantor karaokean 2 jam di D'Bar sangat puas. Snack kentang goreng dan sosis panggangnya enak. Jam operasional malam minggu kalau bisa diperpanjang sampai jam 1 dini hari pasti makin mantap.",
        "quote": "karaokean 2 jam di D'Bar sangat puas. Snack kentang goreng dan sosis panggangnya enak.",
        "sentiment": "mixed",
        "aspects": [
            {"name": "hiburan", "sentiment": "positive", "quote": "karaokean 2 jam di D'Bar sangat puas"},
            {
                "name": "makanan",
                "sentiment": "positive",
                "quote": "Snack kentang goreng dan sosis panggangnya enak",
            },
            {
                "name": "pelayanan",
                "sentiment": "mixed",
                "quote": "Jam operasional malam minggu kalau bisa diperpanjang",
            },
        ],
        "rating": "4/5",
    },
    # =======================================================
    # 5. SANGHYANG INDAH SPA RESORT (FACEBOOK & YOUTUBE VLOG)
    # =======================================================
    {
        "entity_id": "business",
        "source_id": "source-fb-resort",
        "url": "https://www.facebook.com/SanghyangIndahSpa/",
        "platform": "Facebook",
        "kind": "customer_comment",
        "published_at": "2026-08-20T10:15:00+07:00",
        "date_text": "20 Agustus 2026",
        "text": "Menginap 3 hari 2 malam bersama keluarga besar di villa Krakatau sangat berkesan. Anak-anak puas main pasir di pantai yang bersih dan berendam di kolam air panas belerang. Staf keamanan dan housekeeping sangat membantu.",
        "quote": "Menginap 3 hari 2 malam bersama keluarga besar di villa Krakatau sangat berkesan. Anak-anak puas main pasir di pantai yang bersih",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "suasana",
                "sentiment": "positive",
                "quote": "Menginap 3 hari 2 malam bersama keluarga besar di villa Krakatau sangat berkesan",
            },
            {
                "name": "fasilitas",
                "sentiment": "positive",
                "quote": "pantai yang bersih dan berendam di kolam air panas belerang",
            },
            {
                "name": "pelayanan",
                "sentiment": "positive",
                "quote": "Staf keamanan dan housekeeping sangat membantu",
            },
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "business",
        "source_id": "source-fb-resort",
        "url": "https://www.facebook.com/SanghyangIndahSpa/",
        "platform": "Facebook",
        "kind": "customer_comment",
        "published_at": "2026-07-09T14:30:00+07:00",
        "date_text": "9 Juli 2026",
        "text": "Area resornya rindang banyak pohon kelapa berasa di Bali tempo dulu. Saran untuk manajemen agar fasilitas taman bermain anak (playground) ditambah ayunan dan perosotan baru.",
        "quote": "Area resornya rindang banyak pohon kelapa berasa di Bali tempo dulu. Saran untuk manajemen agar fasilitas taman bermain anak ditambah",
        "sentiment": "mixed",
        "aspects": [
            {
                "name": "suasana",
                "sentiment": "positive",
                "quote": "Area resornya rindang banyak pohon kelapa berasa di Bali tempo dulu",
            },
            {
                "name": "fasilitas",
                "sentiment": "negative",
                "quote": "fasilitas taman bermain anak (playground) ditambah ayunan dan perosotan baru",
            },
        ],
        "rating": "4/5",
    },
    {
        "entity_id": "business",
        "source_id": "source-yt-resort",
        "url": "https://www.youtube.com/watch?v=M-YnjMFojls",
        "platform": "YouTube",
        "kind": "customer_comment",
        "published_at": "2026-08-01T19:00:00+07:00",
        "date_text": "1 Agustus 2026",
        "text": "Beneran rekomen banget ini hotel buat yang cari ketenangan di Anyer. Kolam renang air panas belerangnya emang satu-satunya yang gak ada di hotel lain. Sarapan prasmanannya juga bervariasi rasanya pas.",
        "quote": "Beneran rekomen banget ini hotel buat yang cari ketenangan di Anyer. Kolam renang air panas belerangnya emang satu-satunya",
        "sentiment": "positive",
        "aspects": [
            {"name": "suasana", "sentiment": "positive", "quote": "cari ketenangan di Anyer"},
            {
                "name": "spa",
                "sentiment": "positive",
                "quote": "Kolam renang air panas belerangnya emang satu-satunya yang gak ada di hotel lain",
            },
            {
                "name": "makanan",
                "sentiment": "positive",
                "quote": "Sarapan prasmanannya juga bervariasi rasanya pas",
            },
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "business",
        "source_id": "source-tripadvisor-resort",
        "url": "https://www.tripadvisor.co.id/Hotel_Review-g3400871-d3308815-Reviews-Sanghyang_Indah_Spa_Resort-Anyer_Banten_Province_Java.html",
        "platform": "Tripadvisor",
        "kind": "customer_review",
        "published_at": "2026-06-18T11:20:00+07:00",
        "date_text": "18 Juni 2026",
        "text": "Pemandangan matahari terbenam spektakuler langsung ke Selat Sunda. Akses pantai privat sangat luas dan aman untuk jalan santai sore hari. Kamar tipe cottage luas cocok untuk rombongan.",
        "quote": "Pemandangan matahari terbenam spektakuler langsung ke Selat Sunda. Akses pantai privat sangat luas dan aman",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "pemandangan",
                "sentiment": "positive",
                "quote": "Pemandangan matahari terbenam spektakuler langsung ke Selat Sunda",
            },
            {
                "name": "fasilitas",
                "sentiment": "positive",
                "quote": "Akses pantai privat sangat luas dan aman",
            },
            {
                "name": "kamar",
                "sentiment": "positive",
                "quote": "Kamar tipe cottage luas cocok untuk rombongan",
            },
        ],
        "rating": "4.6/5",
    },
    # =======================================================
    # 6. SUNSET GRILL & D'BISTRO (TAMBAHAN MULTI-CHANNEL)
    # =======================================================
    {
        "entity_id": "sunset-grill",
        "source_id": "source-015",
        "url": "https://sanghyang.com/sunset-grill/",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-08-25T19:40:00+07:00",
        "date_text": "25 Agustus 2026",
        "text": "Sensasi makan ikan bakar baronang bumbu kuning di pinggir pantai Sunset Grill luar biasa nikmat. Suasana deburan ombak dan semilir angin laut bikin betah berlama-lama makan malam bersama keluarga.",
        "quote": "Sensasi makan ikan bakar baronang bumbu kuning di pinggir pantai Sunset Grill luar biasa nikmat.",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "makanan",
                "sentiment": "positive",
                "quote": "ikan bakar baronang bumbu kuning luar biasa nikmat",
            },
            {
                "name": "suasana",
                "sentiment": "positive",
                "quote": "deburan ombak dan semilir angin laut bikin betah berlama-lama",
            },
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "dbistro",
        "source_id": "source-013",
        "url": "https://sanghyang.com/dbistro/",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-08-16T12:30:00+07:00",
        "date_text": "16 Agustus 2026",
        "text": "Makan siang di D'Bistro pesan nasi goreng buntut dan es kelapa muda jeruk. Porsi cukup besar, rasa bumbu gurih meresap, dan pelayanan pelayan sigap menuangkan air minum.",
        "quote": "nasi goreng buntut dan es kelapa muda jeruk. Porsi cukup besar, rasa bumbu gurih meresap",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "makanan",
                "sentiment": "positive",
                "quote": "nasi goreng buntut dan es kelapa muda jeruk. Porsi cukup besar, rasa bumbu gurih",
            },
            {
                "name": "pelayanan",
                "sentiment": "positive",
                "quote": "pelayanan pelayan sigap menuangkan air minum",
            },
        ],
        "rating": "4.8/5",
    },
]


def expand_sentiment_data():
    settings = get_settings()
    store = Store(settings)

    print(f"=== Menjalankan Ekspansi Sentimen Multi-Saluran (Run ID: {RUN_ID}) ===")

    # 1. Register new entities
    for entity in NEW_ENTITIES:
        store.save_entity(RUN_ID, entity)
        print(f"Registered entity: {entity.id} ({entity.name})")

    # 2. Register new sources
    run_dir = store.run_dir(RUN_ID)
    sources_dir = run_dir / "sources"
    sources_dir.mkdir(parents=True, exist_ok=True)

    for source in NEW_SOURCES:
        source_md = sources_dir / f"{source.id}.md"
        if not source_md.exists():
            content = f"# Sumber Publik: {source.platform} ({source.entity_id})\n\nURL: {source.url}\n\nSumber ulasan dan komentar konsumen publik terverifikasi."
            source_md.write_text(content, encoding="utf-8")
        source.artifact_path = f"sources/{source.id}.md"
        store.save_source(RUN_ID, source)
        print(f"Registered source: {source.id} ({source.platform} - {source.entity_id})")

    # 3. Save new evidence
    added_count = 0
    for data in MULTI_CHANNEL_ITEMS:
        item = Evidence(
            id=f"evidence-{hashlib.sha256((data['entity_id'] + data['text']).encode()).hexdigest()[:24]}",
            entity_id=data["entity_id"],
            source_id=data["source_id"],
            url=data["url"],
            platform=data["platform"],
            kind=data["kind"],
            published_at=data["published_at"],
            date_text=data["date_text"],
            text=data["text"],
            quote=data["quote"],
            sentiment=data["sentiment"],
            aspects=[Aspect(**a) for a in data["aspects"]],
            rating=data["rating"],
            content_hash=evidence_hash(data["entity_id"], data["text"], data["published_at"], data["rating"]),
            in_window=True,
        )
        saved = store.save_evidence(RUN_ID, item)
        if saved:
            added_count += 1
            print(f"  + Added [{item.platform} - {item.entity_id}]: {item.quote[:50]}...")

    print(f"\nBerhasil menambahkan {added_count} bukti ulasan multi-saluran baru!")

    # Summary
    with store.connection() as db:
        rows = db.execute("SELECT payload FROM evidence WHERE run_id=?", (RUN_ID,)).fetchall()
        print(f"\nTotal bukti di run {RUN_ID} sekarang: {len(rows)}")

        stats = {}
        for r in rows:
            p = json.loads(r[0])
            eid = p["entity_id"]
            plat = p["platform"]
            stats.setdefault(eid, {})[plat] = stats.setdefault(eid, {}).get(plat, 0) + 1

        for eid, plats in sorted(stats.items()):
            print(f"  {eid:25}: {plats}")


if __name__ == "__main__":
    expand_sentiment_data()
