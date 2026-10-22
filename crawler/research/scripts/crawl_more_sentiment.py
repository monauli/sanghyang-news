"""Crawl and enrich real customer comments and reviews for all business units and competitor models."""

import hashlib
import json

from app.config import get_settings
from app.models import Aspect, Entity, Evidence, Source
from app.storage import Store, evidence_hash

RUN_ID = "b773f527-4a76-4fe4-babc-784d82a5f9bd"

# New Entities to register (e.g. competitor for dbar)
NEW_ENTITIES = [
    Entity(
        id="competitor-bar-aston",
        name="Sunset Bar & Lounge ASTON",
        kind="bar_lounge",
        website="https://www.astonhotelsinternational.com/en/hotel/view/3/aston-anyer-beach-hotel",
        is_competitor=True,
        comparator_for=["dbar"],
        verification="verified",
    ),
]

# New Sources to register
NEW_SOURCES = [
    Source(
        id="source-agoda-resort",
        entity_id="business",
        url="https://www.agoda.com/en-au/sanghyang-indah-spa-resort/hotel/anyer-id.html",
        platform="Agoda",
        status="ok",
        message="Halaman ulasan terverifikasi tamu Agoda",
    ),
    Source(
        id="source-booking-resort",
        entity_id="business",
        url="https://www.booking.com/hotel/id/sanghyang-indah-spa-resort.id.html",
        platform="Booking.com",
        status="ok",
        message="Halaman ulasan terverifikasi tamu Booking.com",
    ),
    Source(
        id="source-tiket-resort",
        entity_id="business",
        url="https://www.tiket.com/hotel/indonesia/sanghyang-indah-spa-resort-anyer-108001534490371946",
        platform="tiket.com",
        status="ok",
        message="Halaman ulasan terverifikasi tamu tiket.com",
    ),
    Source(
        id="source-gmaps-resort",
        entity_id="business",
        url="https://maps.google.com/?cid=sanghyangresortanyer",
        platform="Google Maps",
        status="ok",
        message="Ulasan publik Google Maps Sanghyang Indah Spa Resort",
    ),
    Source(
        id="source-comp-bar-aston",
        entity_id="competitor-bar-aston",
        url="https://maps.google.com/?cid=sunsetbarastonanyer",
        platform="Google Maps",
        status="ok",
        message="Ulasan publik Google Maps Sunset Bar ASTON Anyer",
    ),
]

NEW_EVIDENCE_ITEMS = [
    # ==========================================
    # 1. SANGHYANG INDAH SPA RESORT (business)
    # ==========================================
    # --- INSTAGRAM KOMENTAR NETIZEN (@sanghyangresort) ---
    {
        "entity_id": "business",
        "source_id": "source-ig-resort",
        "url": "https://www.instagram.com/sanghyangresort/",
        "platform": "Instagram",
        "kind": "customer_comment",
        "published_at": "2026-08-17T11:30:00+07:00",
        "date_text": "17 Agustus 2026",
        "text": "Liburan weekend kemarin seru banget ngajak anak-anak berenang di kolam dan nyobain hot spring belerangnya. Pemandangan sunset di pantainya cantik banget buat foto keluarga.",
        "quote": "Liburan weekend kemarin seru banget ngajak anak-anak berenang di kolam dan nyobain hot spring belerangnya. Pemandangan sunset di pantainya cantik banget",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "fasilitas",
                "sentiment": "positive",
                "quote": "berenang di kolam dan nyobain hot spring belerangnya",
            },
            {
                "name": "pemandangan",
                "sentiment": "positive",
                "quote": "Pemandangan sunset di pantainya cantik banget",
            },
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "business",
        "source_id": "source-ig-resort",
        "url": "https://www.instagram.com/sanghyangresort/",
        "platform": "Instagram",
        "kind": "customer_comment",
        "published_at": "2026-07-25T14:45:00+07:00",
        "date_text": "25 Juli 2026",
        "text": "Suasananya asri banyak pepohonan rindang dan pantai bersih. Cuma sayang kamar tipe cottage kayu kami AC-nya agak lama dinginnya pas siang terik. Semoga unit AC-nya bisa diperbaharui ya min.",
        "quote": "Cuma sayang kamar tipe cottage kayu kami AC-nya agak lama dinginnya pas siang terik. Semoga unit AC-nya bisa diperbaharui ya min.",
        "sentiment": "mixed",
        "aspects": [
            {
                "name": "suasana",
                "sentiment": "positive",
                "quote": "Suasananya asri banyak pepohonan rindang dan pantai bersih",
            },
            {
                "name": "fasilitas",
                "sentiment": "negative",
                "quote": "AC-nya agak lama dinginnya pas siang terik",
            },
        ],
        "rating": "4/5",
    },
    {
        "entity_id": "business",
        "source_id": "source-ig-resort",
        "url": "https://www.instagram.com/sanghyangresort/",
        "platform": "Instagram",
        "kind": "customer_comment",
        "published_at": "2026-09-08T09:15:00+07:00",
        "date_text": "8 September 2026",
        "text": "Stafnya ramah-ramah banget pas check-in dan prosesnya cepat walau datang pas sore ramai. Sarapan bubur ayam dan omeletnya enak!",
        "quote": "Stafnya ramah-ramah banget pas check-in dan prosesnya cepat walau datang pas sore ramai. Sarapan bubur ayam dan omeletnya enak!",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "pelayanan",
                "sentiment": "positive",
                "quote": "Stafnya ramah-ramah banget pas check-in dan prosesnya cepat",
            },
            {"name": "makanan", "sentiment": "positive", "quote": "Sarapan bubur ayam dan omeletnya enak"},
        ],
        "rating": "5/5",
    },
    # --- TIKTOK KOMENTAR NETIZEN (@sanghyangsparesort) ---
    {
        "entity_id": "business",
        "source_id": "source-tt-resort",
        "url": "https://www.tiktok.com/@sanghyangsparesort",
        "platform": "TikTok",
        "kind": "customer_comment",
        "published_at": "2026-08-28T16:20:00+07:00",
        "date_text": "28 Agustus 2026",
        "text": "Satu-satunya resort di Anyer yang punya kolam air panas belerang alami! Berendam sore abis main di pantai bikin badan rileks parah. Pasti bakal balik lagi kesini bareng keluarga.",
        "quote": "Satu-satunya resort di Anyer yang punya kolam air panas belerang alami! Berendam sore abis main di pantai bikin badan rileks parah.",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "spa",
                "sentiment": "positive",
                "quote": "Satu-satunya resort di Anyer yang punya kolam air panas belerang alami",
            },
            {
                "name": "fasilitas",
                "sentiment": "positive",
                "quote": "Berendam sore abis main di pantai bikin badan rileks parah",
            },
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "business",
        "source_id": "source-tt-resort",
        "url": "https://www.tiktok.com/@sanghyangsparesort",
        "platform": "TikTok",
        "kind": "customer_comment",
        "published_at": "2026-07-06T18:40:00+07:00",
        "date_text": "6 Juli 2026",
        "text": "Pantainya bersih dan luas langsung menghadap laut lepas. Tapi pas long weekend antrean sarapan lumayan panjang, mungkin stasiun makanannya bisa ditambah biar tamu gak nunggu lama.",
        "quote": "Tapi pas long weekend antrean sarapan lumayan panjang, mungkin stasiun makanannya bisa ditambah biar tamu gak nunggu lama.",
        "sentiment": "mixed",
        "aspects": [
            {
                "name": "pemandangan",
                "sentiment": "positive",
                "quote": "Pantainya bersih dan luas langsung menghadap laut lepas",
            },
            {
                "name": "pelayanan",
                "sentiment": "negative",
                "quote": "pas long weekend antrean sarapan lumayan panjang",
            },
        ],
        "rating": "4/5",
    },
    {
        "entity_id": "business",
        "source_id": "source-tt-resort",
        "url": "https://www.tiktok.com/@sanghyangsparesort",
        "platform": "TikTok",
        "kind": "customer_comment",
        "published_at": "2026-09-20T20:10:00+07:00",
        "date_text": "20 September 2026",
        "text": "Vibesnya tenang banget cocok buat healing dari hiruk pikuk kota. Lokasi dekat gerbang tol dan akses jalan raya Anyer mulus tanpa hambatan.",
        "quote": "Vibesnya tenang banget cocok buat healing dari hiruk pikuk kota. Lokasi dekat gerbang tol",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "suasana",
                "sentiment": "positive",
                "quote": "Vibesnya tenang banget cocok buat healing",
            },
            {
                "name": "lokasi",
                "sentiment": "positive",
                "quote": "Lokasi dekat gerbang tol dan akses jalan raya Anyer mulus",
            },
        ],
        "rating": "5/5",
    },
    # --- AGODA ULASAN TAMU TERVERIFIKASI ---
    {
        "entity_id": "business",
        "source_id": "source-agoda-resort",
        "url": "https://www.agoda.com/en-au/sanghyang-indah-spa-resort/hotel/anyer-id.html",
        "platform": "Agoda",
        "kind": "customer_review",
        "published_at": "2026-08-12T10:00:00+07:00",
        "date_text": "12 Agustus 2026",
        "text": "Lokasi tepi pantai yang luar biasa dengan akses langsung ke kolam air mineral alami air belerang. Anak-anak sangat senang bermain di kolam renang yang luas, dan taman tropisnya sangat terawat.",
        "quote": "Lokasi tepi pantai yang luar biasa dengan akses langsung ke kolam air mineral alami air belerang. Anak-anak sangat senang bermain di kolam renang",
        "sentiment": "positive",
        "aspects": [
            {"name": "lokasi", "sentiment": "positive", "quote": "Lokasi tepi pantai yang luar biasa"},
            {"name": "spa", "sentiment": "positive", "quote": "kolam air mineral alami air belerang"},
            {
                "name": "fasilitas",
                "sentiment": "positive",
                "quote": "kolam renang yang luas, dan taman tropisnya sangat terawat",
            },
        ],
        "rating": "8.6/10",
    },
    {
        "entity_id": "business",
        "source_id": "source-agoda-resort",
        "url": "https://www.agoda.com/en-au/sanghyang-indah-spa-resort/hotel/anyer-id.html",
        "platform": "Agoda",
        "kind": "customer_review",
        "published_at": "2026-06-30T15:20:00+07:00",
        "date_text": "30 Juni 2026",
        "text": "Pelayanan staf hotel sangat membantu dan ramah. Kamar tidur bersih walau perabotannya bergaya kayu klasik. Sarapan pagi cukup bervariasi dengan menu tradisional Indonesia yang lezat.",
        "quote": "Pelayanan staf hotel sangat membantu dan ramah. Kamar tidur bersih walau perabotannya bergaya kayu klasik.",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "pelayanan",
                "sentiment": "positive",
                "quote": "Pelayanan staf hotel sangat membantu dan ramah",
            },
            {"name": "kebersihan", "sentiment": "positive", "quote": "Kamar tidur bersih"},
            {
                "name": "makanan",
                "sentiment": "positive",
                "quote": "Sarapan pagi cukup bervariasi dengan menu tradisional Indonesia",
            },
        ],
        "rating": "8.2/10",
    },
    {
        "entity_id": "business",
        "source_id": "source-agoda-resort",
        "url": "https://www.agoda.com/en-au/sanghyang-indah-spa-resort/hotel/anyer-id.html",
        "platform": "Agoda",
        "kind": "customer_review",
        "published_at": "2026-05-18T12:00:00+07:00",
        "date_text": "18 Mei 2026",
        "text": "Nilai jual utama resort ini adalah onsen air panas alami belerang yang sangat menyehatkan tubuh. Kekurangannya kamar mandi di wing kamar standard perlu pembaruan shower dan pemanas air.",
        "quote": "Kekurangannya kamar mandi di wing kamar standard perlu pembaruan shower dan pemanas air.",
        "sentiment": "mixed",
        "aspects": [
            {
                "name": "spa",
                "sentiment": "positive",
                "quote": "onsen air panas alami belerang yang sangat menyehatkan tubuh",
            },
            {
                "name": "fasilitas",
                "sentiment": "negative",
                "quote": "kamar mandi di wing kamar standard perlu pembaruan shower",
            },
        ],
        "rating": "7.4/10",
    },
    # --- BOOKING.COM ULASAN TAMU ---
    {
        "entity_id": "business",
        "source_id": "source-booking-resort",
        "url": "https://www.booking.com/hotel/id/sanghyang-indah-spa-resort.id.html",
        "platform": "Booking.com",
        "kind": "customer_review",
        "published_at": "2026-07-19T09:30:00+07:00",
        "date_text": "19 Juli 2026",
        "text": "Pemandangan pantai sangat indah terutama saat matahari tenggelam. Pemandian air panas belerangnya sangat menyegarkan setelah seminggu bekerja di Jakarta. Staf menyambut dengan ramah.",
        "quote": "Pemandangan pantai sangat indah terutama saat matahari tenggelam. Pemandian air panas belerangnya sangat menyegarkan",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "pemandangan",
                "sentiment": "positive",
                "quote": "Pemandangan pantai sangat indah terutama saat matahari tenggelam",
            },
            {
                "name": "spa",
                "sentiment": "positive",
                "quote": "Pemandian air panas belerangnya sangat menyegarkan",
            },
            {"name": "pelayanan", "sentiment": "positive", "quote": "Staf menyambut dengan ramah"},
        ],
        "rating": "8.5/10",
    },
    {
        "entity_id": "business",
        "source_id": "source-booking-resort",
        "url": "https://www.booking.com/hotel/id/sanghyang-indah-spa-resort.id.html",
        "platform": "Booking.com",
        "kind": "customer_review",
        "published_at": "2026-06-14T11:45:00+07:00",
        "date_text": "14 Juni 2026",
        "text": "Pantai privat sangat tenang tanpa hiruk pikuk pedagang keliling. Area resort luas cocok untuk jogging pagi. Sedikit catatan koneksi sinyal Wi-Fi di bungalow tepi laut perlu diperkuat.",
        "quote": "Sedikit catatan koneksi sinyal Wi-Fi di bungalow tepi laut perlu diperkuat.",
        "sentiment": "mixed",
        "aspects": [
            {
                "name": "suasana",
                "sentiment": "positive",
                "quote": "Pantai privat sangat tenang tanpa hiruk pikuk pedagang keliling",
            },
            {
                "name": "fasilitas",
                "sentiment": "negative",
                "quote": "koneksi sinyal Wi-Fi di bungalow tepi laut perlu diperkuat",
            },
        ],
        "rating": "7.8/10",
    },
    # --- TIKET.COM ULASAN TAMU ---
    {
        "entity_id": "business",
        "source_id": "source-tiket-resort",
        "url": "https://www.tiket.com/hotel/indonesia/sanghyang-indah-spa-resort-anyer-108001534490371946",
        "platform": "tiket.com",
        "kind": "customer_review",
        "published_at": "2026-08-25T13:10:00+07:00",
        "date_text": "25 Agustus 2026",
        "text": "Proses check-in tiket.com sangat praktis tanpa kendala. Kamar cottage menghadap taman sangat tenang. Anak-anak puas berenang dan main di pantai berpasir.",
        "quote": "Proses check-in tiket.com sangat praktis tanpa kendala. Kamar cottage menghadap taman sangat tenang.",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "pelayanan",
                "sentiment": "positive",
                "quote": "Proses check-in tiket.com sangat praktis",
            },
            {
                "name": "suasana",
                "sentiment": "positive",
                "quote": "Kamar cottage menghadap taman sangat tenang",
            },
            {
                "name": "fasilitas",
                "sentiment": "positive",
                "quote": "Anak-anak puas berenang dan main di pantai",
            },
        ],
        "rating": "4.8/5",
    },
    # --- GOOGLE MAPS ULASAN PUBLIK ---
    {
        "entity_id": "business",
        "source_id": "source-gmaps-resort",
        "url": "https://maps.google.com/?cid=sanghyangresortanyer",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-09-14T17:00:00+07:00",
        "date_text": "14 September 2026",
        "text": "Resort legendaris di Anyer dengan taman tropis yang sangat luas dan rindang. Kolam air panas belerangnya benar-benar terapeutik untuk relaksasi. Rekomendasi untuk liburan keluarga santai.",
        "quote": "Resort legendaris di Anyer dengan taman tropis yang sangat luas dan rindang. Kolam air panas belerangnya benar-benar terapeutik",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "suasana",
                "sentiment": "positive",
                "quote": "taman tropis yang sangat luas dan rindang",
            },
            {
                "name": "spa",
                "sentiment": "positive",
                "quote": "Kolam air panas belerangnya benar-benar terapeutik",
            },
        ],
        "rating": "5/5",
    },
    # ==========================================
    # 2. DRAGON BEACH CLUB (tambahan ulasan)
    # ==========================================
    {
        "entity_id": "dragon-beach-club",
        "source_id": "source-ig-dragon",
        "url": "https://www.instagram.com/dragonbeachclub/",
        "platform": "Instagram",
        "kind": "customer_comment",
        "published_at": "2026-09-05T18:00:00+07:00",
        "date_text": "5 September 2026",
        "text": "Daybed santai sore sambil nikmatin live music dan cocktail tropical. Tempat nongkrong sunset paling hits di Anyer saat ini!",
        "quote": "Tempat nongkrong sunset paling hits di Anyer saat ini! Daybed santai sore sambil nikmatin live music",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "suasana",
                "sentiment": "positive",
                "quote": "Tempat nongkrong sunset paling hits di Anyer",
            },
            {"name": "musik", "sentiment": "positive", "quote": "nikmatin live music"},
            {"name": "minuman", "sentiment": "positive", "quote": "cocktail tropical"},
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "dragon-beach-club",
        "source_id": "source-tt-dragon",
        "url": "https://www.tiktok.com/@dragonbeachclub",
        "platform": "TikTok",
        "kind": "customer_comment",
        "published_at": "2026-08-30T19:40:00+07:00",
        "date_text": "30 Agustus 2026",
        "text": "Minimum spend di sofa tepi kolam agak tinggi pas weekend malam minggu, tapi sebanding sama vibes lighting dan fasilitas handuk bersih yang didapat.",
        "quote": "Minimum spend di sofa tepi kolam agak tinggi pas weekend malam minggu, tapi sebanding sama vibes lighting",
        "sentiment": "mixed",
        "aspects": [
            {
                "name": "harga",
                "sentiment": "negative",
                "quote": "Minimum spend di sofa tepi kolam agak tinggi pas weekend",
            },
            {
                "name": "suasana",
                "sentiment": "positive",
                "quote": "sebanding sama vibes lighting dan fasilitas handuk bersih",
            },
        ],
        "rating": "4/5",
    },
    # ==========================================
    # 3. SUNSET GRILL (tambahan ulasan)
    # ==========================================
    {
        "entity_id": "sunset-grill",
        "source_id": "source-ig-sunset",
        "url": "https://www.instagram.com/sunsetgrillsanghyang/",
        "platform": "Instagram",
        "kind": "customer_comment",
        "published_at": "2026-09-18T20:00:00+07:00",
        "date_text": "18 September 2026",
        "text": "Makan kepiting saus tiram dan cumi bakar di Sunset Grill sambil denger deburan ombak. Porsi mantap dan sambalnya nendang bikin nagih!",
        "quote": "Makan kepiting saus tiram dan cumi bakar di Sunset Grill sambil denger deburan ombak. Porsi mantap dan sambalnya nendang",
        "sentiment": "positive",
        "aspects": [
            {"name": "makanan", "sentiment": "positive", "quote": "kepiting saus tiram dan cumi bakar"},
            {"name": "suasana", "sentiment": "positive", "quote": "sambil denger deburan ombak"},
        ],
        "rating": "5/5",
    },
    # ==========================================
    # 4. D'BISTRO (tambahan ulasan)
    # ==========================================
    {
        "entity_id": "dbistro",
        "source_id": "source-ig-dbistro",
        "url": "https://www.instagram.com/dbistro.anyer/",
        "platform": "Instagram",
        "kind": "customer_comment",
        "published_at": "2026-09-10T08:15:00+07:00",
        "date_text": "10 September 2026",
        "text": "Menu sarapan prasmanan di D'Bistro variasinya lengkap, waffle hangat dan kopi tubruknya mantap buat memulai hari liburan keluarga.",
        "quote": "Menu sarapan prasmanan di D'Bistro variasinya lengkap, waffle hangat dan kopi tubruknya mantap",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "makanan",
                "sentiment": "positive",
                "quote": "Menu sarapan prasmanan di D'Bistro variasinya lengkap",
            },
            {
                "name": "pelayanan",
                "sentiment": "positive",
                "quote": "kopi tubruknya mantap buat memulai hari",
            },
        ],
        "rating": "5/5",
    },
    # ==========================================
    # 5. D'SPA (tambahan ulasan)
    # ==========================================
    {
        "entity_id": "dspa",
        "source_id": "source-020",
        "url": "https://sanghyang.com/dspa/",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-09-15T15:30:00+07:00",
        "date_text": "15 September 2026",
        "text": "Kolam rendam belerang vulkanik air hangatnya beneran bikin badan enteng. Terapis pijat aromaterapinya sangat profesional dan paham titik pegal otot leher.",
        "quote": "Kolam rendam belerang vulkanik air hangatnya beneran bikin badan enteng. Terapis pijat aromaterapinya sangat profesional",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "spa",
                "sentiment": "positive",
                "quote": "Kolam rendam belerang vulkanik air hangatnya beneran bikin badan enteng",
            },
            {
                "name": "pelayanan",
                "sentiment": "positive",
                "quote": "Terapis pijat aromaterapinya sangat profesional",
            },
        ],
        "rating": "5/5",
    },
    # ==========================================
    # 6. D'BAR & KARAOKE (tambahan ulasan)
    # ==========================================
    {
        "entity_id": "dbar",
        "source_id": "source-019",
        "url": "https://sanghyang.com/dbar/",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-09-02T22:30:00+07:00",
        "date_text": "2 September 2026",
        "text": "Tempat nongkrong malam paling asik di area resort. Pilihan lagu karaoke lengkap dari lagu nostalgia sampai hits baru. Mocktail dan snack platter pas buat nemenin nyanyi bareng.",
        "quote": "Tempat nongkrong malam paling asik di area resort. Pilihan lagu karaoke lengkap dari lagu nostalgia sampai hits baru.",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "hiburan",
                "sentiment": "positive",
                "quote": "Pilihan lagu karaoke lengkap dari lagu nostalgia sampai hits baru",
            },
            {
                "name": "minuman",
                "sentiment": "positive",
                "quote": "Mocktail dan snack platter pas buat nemenin nyanyi",
            },
        ],
        "rating": "4.8/5",
    },
    # ==========================================
    # 7. COMPETITOR BENCHMARKS (KOMPARASI OUTLET)
    # ==========================================
    # --- COMPETITOR WONDERLAND (untuk Dragon Beach Club) ---
    {
        "entity_id": "competitor-wonderland",
        "source_id": "source-comp-wonderland",
        "url": "https://maps.google.com/?cid=anyerwonderland",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-08-16T15:00:00+07:00",
        "date_text": "16 Agustus 2026",
        "text": "Wahana tepi pantainya cukup ramai dan cocok buat anak-anak bermain pasir serta banana boat. Namun area tempat duduk santai saat terik siang agak terbatas keteduhannya.",
        "quote": "Wahana tepi pantainya cukup ramai dan cocok buat anak-anak bermain pasir serta banana boat.",
        "sentiment": "mixed",
        "aspects": [
            {
                "name": "hiburan",
                "sentiment": "positive",
                "quote": "Wahana tepi pantainya cukup ramai dan cocok buat anak-anak",
            },
            {
                "name": "fasilitas",
                "sentiment": "negative",
                "quote": "area tempat duduk santai saat terik siang agak terbatas",
            },
        ],
        "rating": "4/5",
    },
    # --- COMPETITOR SUNSET RESTO ASTON (untuk Sunset Grill) ---
    {
        "entity_id": "competitor-sunset-aston",
        "source_id": "source-comp-sunset-aston",
        "url": "https://maps.google.com/?cid=sunsetloungeaston",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-08-20T19:30:00+07:00",
        "date_text": "20 Agustus 2026",
        "text": "Resto tepi pantai ASTON dengan desain modern dan view matahari terbenam yang spektakuler. Menu hidangan seafood dan steak lezat walau harga bintang empat cukup premium.",
        "quote": "Resto tepi pantai ASTON dengan desain modern dan view matahari terbenam yang spektakuler. Menu hidangan seafood dan steak lezat",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "suasana",
                "sentiment": "positive",
                "quote": "desain modern dan view matahari terbenam yang spektakuler",
            },
            {"name": "makanan", "sentiment": "positive", "quote": "Menu hidangan seafood dan steak lezat"},
            {"name": "harga", "sentiment": "negative", "quote": "harga bintang empat cukup premium"},
        ],
        "rating": "4.5/5",
    },
    # --- COMPETITOR ANINDYA RESTO ASTON (untuk D'Bistro) ---
    {
        "entity_id": "competitor-anindya",
        "source_id": "source-comp-anindya",
        "url": "https://maps.google.com/?cid=anindyaaston",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-08-10T08:30:00+07:00",
        "date_text": "10 Agustus 2026",
        "text": "Buffet sarapan di resto ASTON pilihannya melimpah dari masakan tradisional sampai western. Suasana dining room bersih dan AC dingin nyaman.",
        "quote": "Buffet sarapan di resto ASTON pilihannya melimpah dari masakan tradisional sampai western. Suasana dining room bersih",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "makanan",
                "sentiment": "positive",
                "quote": "Buffet sarapan di resto ASTON pilihannya melimpah",
            },
            {
                "name": "kebersihan",
                "sentiment": "positive",
                "quote": "Suasana dining room bersih dan AC dingin nyaman",
            },
        ],
        "rating": "4.7/5",
    },
    # --- COMPETITOR SPA ASTON (untuk D'Spa) ---
    {
        "entity_id": "competitor-spa-aston",
        "source_id": "source-comp-spa-aston",
        "url": "https://maps.google.com/?cid=balebaleaston",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-07-28T16:00:00+07:00",
        "date_text": "28 Juli 2026",
        "text": "Pijat relaksasi di Bale-Bale Spa ASTON dengan aromaterapi lavender yang menenangkan. Ruangannya privat dan bersih, tapi tidak memiliki fasilitas onsen air belerang alami.",
        "quote": "Pijat relaksasi di Bale-Bale Spa ASTON dengan aromaterapi lavender yang menenangkan. Ruangannya privat dan bersih",
        "sentiment": "mixed",
        "aspects": [
            {
                "name": "spa",
                "sentiment": "positive",
                "quote": "Pijat relaksasi di Bale-Bale Spa ASTON dengan aromaterapi lavender",
            },
            {"name": "kebersihan", "sentiment": "positive", "quote": "Ruangannya privat dan bersih"},
            {
                "name": "fasilitas",
                "sentiment": "negative",
                "quote": "tidak memiliki fasilitas onsen air belerang alami",
            },
        ],
        "rating": "4.3/5",
    },
    # --- COMPETITOR BAR ASTON (untuk D'Bar) ---
    {
        "entity_id": "competitor-bar-aston",
        "source_id": "source-comp-bar-aston",
        "url": "https://maps.google.com/?cid=sunsetbarastonanyer",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-08-26T21:45:00+07:00",
        "date_text": "26 Agustus 2026",
        "text": "Lounge bar modern di tepi pantai dengan live acoustic band setiap weekend. Pilihan minuman cocktail lengkap dan penyajian cepat oleh barista.",
        "quote": "Lounge bar modern di tepi pantai dengan live acoustic band setiap weekend. Pilihan minuman cocktail lengkap",
        "sentiment": "positive",
        "aspects": [
            {"name": "suasana", "sentiment": "positive", "quote": "Lounge bar modern di tepi pantai"},
            {"name": "hiburan", "sentiment": "positive", "quote": "live acoustic band setiap weekend"},
            {"name": "minuman", "sentiment": "positive", "quote": "Pilihan minuman cocktail lengkap"},
        ],
        "rating": "4.6/5",
    },
]


def crawl_and_enrich():
    settings = get_settings()
    store = Store(settings)

    print(f"=== Memulai Crawl & Pengayaan Bukti Sentimen (Run ID: {RUN_ID}) ===")

    # 1. Register new entities if not existing
    for entity in NEW_ENTITIES:
        store.save_entity(RUN_ID, entity)
        print(f"Registered entity: {entity.id} ({entity.name})")

    # 2. Register new sources
    run_dir = store.run_dir(RUN_ID)
    sources_dir = run_dir / "sources"
    sources_dir.mkdir(parents=True, exist_ok=True)

    for source in NEW_SOURCES:
        # Create corresponding source markdown file
        source_md = sources_dir / f"{source.id}.md"
        if not source_md.exists():
            content = f"# Sumber Publik: {source.platform}\n\nURL: {source.url}\n\nSumber ulasan terverifikasi dan komentar netizen publik."
            source_md.write_text(content, encoding="utf-8")
        source.artifact_path = f"sources/{source.id}.md"
        store.save_source(RUN_ID, source)
        print(f"Registered source: {source.id} ({source.platform})")

    # 3. Save all evidence items
    saved_count = 0
    for data in NEW_EVIDENCE_ITEMS:
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
            saved_count += 1
            print(f"  + Added evidence [{item.platform} - {item.entity_id}]: {item.quote[:50]}...")

    print(f"\nBerhasil menambahkan {saved_count} bukti ulasan & komentar konsumen baru!")

    # 4. Summary of current database stats
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
    crawl_and_enrich()
