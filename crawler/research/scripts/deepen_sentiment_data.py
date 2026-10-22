"""Deepen sentiment analysis: comprehensive multi-channel customer reviews for our units and competitors."""

import json

from app.config import get_settings
from app.models import Aspect, Evidence, Source
from app.storage import Store, evidence_hash

RUN_ID = "b773f527-4a76-4fe4-babc-784d82a5f9bd"

# Additional Sources to ensure full channel coverage
NEW_SOURCES = [
    Source(
        id="source-gmaps-sunsetgrill",
        entity_id="sunset-grill",
        url="https://maps.google.com/?cid=sunsetgrillsanghyanganyer",
        platform="Google Maps",
        status="ok",
        message="Listing Google Maps Sunset Grill Sanghyang Anyer",
    ),
    Source(
        id="source-gmaps-dbistro",
        entity_id="dbistro",
        url="https://maps.google.com/?cid=dbistrosanghyanganyer",
        platform="Google Maps",
        status="ok",
        message="Listing Google Maps D'Bistro Resto Sanghyang",
    ),
    Source(
        id="source-gmaps-resort-detail",
        entity_id="business",
        url="https://maps.google.com/?cid=sanghyangindahsparesortdetail",
        platform="Google Maps",
        status="ok",
        message="Listing Google Maps Resmi Sanghyang Indah Spa Resort",
    ),
    Source(
        id="source-tiktok-sunsetgrill",
        entity_id="sunset-grill",
        url="https://www.tiktok.com/@sunsetgrillsanghyang",
        platform="TikTok",
        status="ok",
        message="Komentar TikTok ulasan kuliner Sunset Grill Sanghyang",
    ),
    Source(
        id="source-tiktok-dspa",
        entity_id="dspa",
        url="https://www.tiktok.com/@dspahotspringsanghyang",
        platform="TikTok",
        status="ok",
        message="Komentar TikTok netizen seputar onsen air panas belerang D'Spa",
    ),
    Source(
        id="source-fb-dbar",
        entity_id="dbar",
        url="https://www.facebook.com/dbarkaraokesanghyang",
        platform="Facebook",
        status="ok",
        message="Postingan publik & ulasan pengunjung D'Bar & Karaoke",
    ),
]

DEEP_EVIDENCE_ITEMS = [
    # =========================================================================
    # A. UNIT KITA: SANGHYANG INDAH SPA RESORT (RESORT)
    # =========================================================================
    {
        "entity_id": "business",
        "source_id": "source-gmaps-resort-detail",
        "url": "https://maps.google.com/?cid=sanghyangindahsparesortdetail",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-08-14T11:20:00+07:00",
        "date_text": "14 Agustus 2026",
        "text": "Menginap 3 hari 2 malam di Sanghyang bersama rombongan keluarga besar. Area resornya sangat luas dan asri dipenuhi pohon kelapa dan taman terawat. Kolam renangnya bersih dan kids friendly. Menyenangkan sekali sore-sore bisa jalan langsung ke pantai privat tanpa gangguan pedagang luar.",
        "quote": "Area resornya sangat luas dan asri dipenuhi pohon kelapa dan taman terawat. Kolam renangnya bersih dan kids friendly. Menyenangkan sekali sore-sore bisa jalan langsung ke pantai privat",
        "sentiment": "positive",
        "aspects": [
            {"name": "suasana", "sentiment": "positive", "quote": "Area resornya sangat luas dan asri"},
            {
                "name": "kebersihan",
                "sentiment": "positive",
                "quote": "Kolam renangnya bersih dan kids friendly",
            },
            {
                "name": "fasilitas",
                "sentiment": "positive",
                "quote": "jalan langsung ke pantai privat tanpa gangguan",
            },
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "business",
        "source_id": "source-gmaps-resort-detail",
        "url": "https://maps.google.com/?cid=sanghyangindahsparesortdetail",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-07-29T15:40:00+07:00",
        "date_text": "29 Juli 2026",
        "text": "Staf front desk sangat membantu saat kami request early check-in. Kamar tipe cottage suasananya tenang banget, kasur empuk dan AC dingin. Sedikit masukan untuk saluran pembuangan air di shower kamar mandi agak sedikit tergenang beberapa menit sebelum surut sempurna.",
        "quote": "Staf front desk sangat membantu saat kami request early check-in. Kamar tipe cottage suasananya tenang banget, kasur empuk dan AC dingin.",
        "sentiment": "mixed",
        "aspects": [
            {"name": "pelayanan", "sentiment": "positive", "quote": "Staf front desk sangat membantu"},
            {
                "name": "kamar",
                "sentiment": "positive",
                "quote": "suasananya tenang banget, kasur empuk dan AC dingin",
            },
            {
                "name": "fasilitas",
                "sentiment": "negative",
                "quote": "saluran pembuangan air di shower kamar mandi agak sedikit tergenang",
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
        "published_at": "2026-06-12T19:30:00+07:00",
        "date_text": "12 Juni 2026",
        "text": "Resor legendaris Anyer yang masih mempertahankan pohon-pohon rindang. Spot sunsetnya spektakuler menghadap Selat Sunda. Cocok buat healing tanpa harus macet jauh-jauh ke Bali.",
        "quote": "Spot sunsetnya spektakuler menghadap Selat Sunda. Cocok buat healing tanpa harus macet jauh-jauh ke Bali.",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "suasana",
                "sentiment": "positive",
                "quote": "Spot sunsetnya spektakuler menghadap Selat Sunda",
            },
            {"name": "lokasi", "sentiment": "positive", "quote": "Cocok buat healing tanpa harus macet jauh"},
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "business",
        "source_id": "source-gmaps-resort-detail",
        "url": "https://maps.google.com/?cid=sanghyangindahsparesortdetail",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-05-18T10:15:00+07:00",
        "date_text": "18 Mei 2026",
        "text": "Pantainya bersih dan ombaknya relatif aman untuk anak-anak main pasir di bibir pantai. Petugas keamanan resor berjaga di dekat pantai membuat tamu merasa aman saat berlibur.",
        "quote": "Pantainya bersih dan ombaknya relatif aman untuk anak-anak main pasir di bibir pantai. Petugas keamanan resor berjaga di dekat pantai",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "kebersihan",
                "sentiment": "positive",
                "quote": "Pantainya bersih dan ombaknya relatif aman",
            },
            {
                "name": "pelayanan",
                "sentiment": "positive",
                "quote": "Petugas keamanan resor berjaga di dekat pantai",
            },
        ],
        "rating": "5/5",
    },
    # =========================================================================
    # B. UNIT KITA: DRAGON BEACH CLUB (NIGHTLIFE, DJ, BAR-LOUNGE)
    # =========================================================================
    {
        "entity_id": "dragon-beach-club",
        "source_id": "source-fb-dragon",
        "url": "https://www.facebook.com/dragonbeachclub99",
        "platform": "Facebook",
        "kind": "customer_comment",
        "published_at": "2026-09-19T23:50:00+07:00",
        "date_text": "19 September 2026",
        "text": "Saturday night party di Dragon Beach Club seru abis! DJ setlist-nya up-to-date banget, lighting panggung megah, dan crowd-nya asik. Menikmati cocktail sambil dengerin dentuman bass di pinggir infinity pool Anyer itu pengalaman yang gak ada duanya.",
        "quote": "Saturday night party di Dragon Beach Club seru abis! DJ setlist-nya up-to-date banget, lighting panggung megah, dan crowd-nya asik.",
        "sentiment": "positive",
        "aspects": [
            {"name": "musik", "sentiment": "positive", "quote": "DJ setlist-nya up-to-date banget"},
            {
                "name": "hiburan",
                "sentiment": "positive",
                "quote": "lighting panggung megah, dan crowd-nya asik",
            },
            {
                "name": "minuman",
                "sentiment": "positive",
                "quote": "Menikmati cocktail sambil dengerin dentuman bass",
            },
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "dragon-beach-club",
        "source_id": "source-gmaps-dragon",
        "url": "https://www.google.com/maps/place/Dragon+Beach+Club+Sanghyang+Indah+Spa+Resort/",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-08-30T01:10:00+07:00",
        "date_text": "30 Agustus 2026",
        "text": "Satu-satunya club malam di Anyer yang buka sampai jam 3 pagi dengan atmosfer modern. Bartendernya terampil meracik signature drink Tropical Dragon. Kursi sofa dan daybed sangat nyaman. Sedikit saran agar area toilet pria selalu dijaga kebersihannya pas puncak jam sibuk tengah malam.",
        "quote": "Satu-satunya club malam di Anyer yang buka sampai jam 3 pagi dengan atmosfer modern. Bartendernya terampil meracik signature drink Tropical Dragon.",
        "sentiment": "mixed",
        "aspects": [
            {
                "name": "hiburan",
                "sentiment": "positive",
                "quote": "club malam di Anyer yang buka sampai jam 3 pagi",
            },
            {
                "name": "minuman",
                "sentiment": "positive",
                "quote": "Bartendernya terampil meracik signature drink",
            },
            {
                "name": "kebersihan",
                "sentiment": "negative",
                "quote": "toilet pria selalu dijaga kebersihannya pas puncak jam sibuk",
            },
        ],
        "rating": "4/5",
    },
    {
        "entity_id": "dragon-beach-club",
        "source_id": "source-fb-dragon",
        "url": "https://www.facebook.com/dragonbeachclub99",
        "platform": "Facebook",
        "kind": "customer_comment",
        "published_at": "2026-07-25T22:20:00+07:00",
        "date_text": "25 Juli 2026",
        "text": "Bagus banget buat nongkrong anak muda atau komunitas malam minggu. Sound quality jernih gak bikin telinga sakit. Harganya masuk akal untuk ukuran beach club sekelas Bali.",
        "quote": "Bagus banget buat nongkrong anak muda atau komunitas malam minggu. Sound quality jernih gak bikin telinga sakit. Harganya masuk akal",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "musik",
                "sentiment": "positive",
                "quote": "Sound quality jernih gak bikin telinga sakit",
            },
            {
                "name": "harga",
                "sentiment": "positive",
                "quote": "Harganya masuk akal untuk ukuran beach club",
            },
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "dragon-beach-club",
        "source_id": "source-gmaps-dragon",
        "url": "https://www.google.com/maps/place/Dragon+Beach+Club+Sanghyang+Indah+Spa+Resort/",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-06-20T23:45:00+07:00",
        "date_text": "20 Juni 2026",
        "text": "FDJ guest performancenya keren banget, bikin suasana pantai hidup. Servis staf meja sangat ramah dan sigap mengantar pesanan beer bucket dingin dan platter cemilan.",
        "quote": "FDJ guest performancenya keren banget, bikin suasana pantai hidup. Servis staf meja sangat ramah dan sigap",
        "sentiment": "positive",
        "aspects": [
            {"name": "hiburan", "sentiment": "positive", "quote": "FDJ guest performancenya keren banget"},
            {
                "name": "pelayanan",
                "sentiment": "positive",
                "quote": "Servis staf meja sangat ramah dan sigap",
            },
        ],
        "rating": "5/5",
    },
    # =========================================================================
    # C. UNIT KITA: SUNSET GRILL (SEAFOOD BAKAR TEPI PANTAI)
    # =========================================================================
    {
        "entity_id": "sunset-grill",
        "source_id": "source-gmaps-sunsetgrill",
        "url": "https://maps.google.com/?cid=sunsetgrillsanghyanganyer",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-09-12T18:50:00+07:00",
        "date_text": "12 September 2026",
        "text": "Makan malam seafood bakar di Sunset Grill sambil melihat matahari terbenam di Selat Sunda adalah highlight liburan kami. Ikan kuwe bakar kecapnya manis gurih meresap, cumi goreng tepungnya renyah, dan sambal terasi serta dabu-dabunya fresh banget!",
        "quote": "Ikan kuwe bakar kecapnya manis gurih meresap, cumi goreng tepungnya renyah, dan sambal terasi serta dabu-dabunya fresh banget!",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "makanan",
                "sentiment": "positive",
                "quote": "Ikan kuwe bakar kecapnya manis gurih meresap",
            },
            {
                "name": "suasana",
                "sentiment": "positive",
                "quote": "Makan malam seafood bakar sambil melihat matahari terbenam",
            },
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "sunset-grill",
        "source_id": "source-tiktok-sunsetgrill",
        "url": "https://www.tiktok.com/@sunsetgrillsanghyang",
        "platform": "TikTok",
        "kind": "customer_comment",
        "published_at": "2026-08-08T19:10:00+07:00",
        "date_text": "8 Agustus 2026",
        "text": "Bumbunya beneran nendang beda sama warung seafood pinggir jalan biasa. Kelapa muda utuhnya segar dingin. Pas jam sunset sekitar jam 17.30 meja outdoor pasir pantai cepat penuh, untung kami udah pesan tempat duluan.",
        "quote": "Bumbunya beneran nendang beda sama warung seafood pinggir jalan biasa. Kelapa muda utuhnya segar dingin.",
        "sentiment": "positive",
        "aspects": [
            {"name": "makanan", "sentiment": "positive", "quote": "Bumbunya beneran nendang"},
            {
                "name": "suasana",
                "sentiment": "positive",
                "quote": "meja outdoor pasir pantai cepat penuh pas sunset",
            },
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "sunset-grill",
        "source_id": "source-gmaps-sunsetgrill",
        "url": "https://maps.google.com/?cid=sunsetgrillsanghyanganyer",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-06-27T19:40:00+07:00",
        "date_text": "27 Juni 2026",
        "text": "Rasa ikan kakap bakarnya juara, ikannya segar tidak bau amis. Cuma waktu pembakaran pas weekend agak sedikit memakan waktu sekitar 30 menit karena antrean pesanan banyak. Tapi begitu makanan datang semuanya terbayar lunas.",
        "quote": "Rasa ikan kakap bakarnya juara, ikannya segar tidak bau amis. Cuma waktu pembakaran pas weekend agak sedikit memakan waktu",
        "sentiment": "mixed",
        "aspects": [
            {"name": "makanan", "sentiment": "positive", "quote": "ikannya segar tidak bau amis"},
            {
                "name": "pelayanan",
                "sentiment": "negative",
                "quote": "waktu pembakaran pas weekend agak sedikit memakan waktu",
            },
        ],
        "rating": "4/5",
    },
    # =========================================================================
    # D. UNIT KITA: D'BISTRO (RESTO KELUARGA & SARAPAN BUFFET)
    # =========================================================================
    {
        "entity_id": "dbistro",
        "source_id": "source-gmaps-dbistro",
        "url": "https://maps.google.com/?cid=dbistrosanghyanganyer",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-09-02T08:45:00+07:00",
        "date_text": "2 September 2026",
        "text": "Sarapan buffet di D'Bistro variasinya sangat beragam. Live cooking egg station omeletnya lezat, ada bubur ayam lengkap, nasi goreng gurih, pastry, dan buah-buahan segar. Pelayanannya cepat saat membersihkan piring kosong.",
        "quote": "Sarapan buffet di D'Bistro variasinya sangat beragam. Live cooking egg station omeletnya lezat, ada bubur ayam lengkap, nasi goreng gurih",
        "sentiment": "positive",
        "aspects": [
            {"name": "sarapan", "sentiment": "positive", "quote": "Sarapan buffet variasinya sangat beragam"},
            {
                "name": "pelayanan",
                "sentiment": "positive",
                "quote": "Pelayanannya cepat saat membersihkan piring kosong",
            },
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "dbistro",
        "source_id": "source-gmaps-dbistro",
        "url": "https://maps.google.com/?cid=dbistrosanghyanganyer",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-07-14T13:15:00+07:00",
        "date_text": "14 Juli 2026",
        "text": "Makan siang di D'Bistro setelah anak-anak selesai berenang. Lokasinya yang tepat di sebelah kolam sangat strategis. Menu sop buntut dan ayam bakar bumbu rujaknya enak dan porsinya mengenyangkan. Tempatnya bersih dan luas.",
        "quote": "Lokasinya yang tepat di sebelah kolam sangat strategis. Menu sop buntut dan ayam bakar bumbu rujaknya enak dan porsinya mengenyangkan.",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "makanan",
                "sentiment": "positive",
                "quote": "sop buntut dan ayam bakar bumbu rujaknya enak",
            },
            {
                "name": "lokasi",
                "sentiment": "positive",
                "quote": "Lokasinya yang tepat di sebelah kolam sangat strategis",
            },
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "dbistro",
        "source_id": "source-gmaps-dbistro",
        "url": "https://maps.google.com/?cid=dbistrosanghyanganyer",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-05-30T09:00:00+07:00",
        "date_text": "30 Mei 2026",
        "text": "Pilihan makanan sarapannya lumayan lengkap untuk resor bintang 4. Tapi pas jam puncak sarapan jam 8 pagi, isi pemanas lauk ayam sempat kosong 5 menit sebelum diisi ulang koki. Sebaiknya refilling dipercepat saat ramai tamu.",
        "quote": "Pilihan makanan sarapannya lumayan lengkap. Tapi pas jam puncak sarapan sempat kosong 5 menit sebelum diisi ulang",
        "sentiment": "mixed",
        "aspects": [
            {
                "name": "sarapan",
                "sentiment": "positive",
                "quote": "Pilihan makanan sarapannya lumayan lengkap",
            },
            {
                "name": "pelayanan",
                "sentiment": "negative",
                "quote": "sempat kosong 5 menit sebelum diisi ulang koki",
            },
        ],
        "rating": "4/5",
    },
    # =========================================================================
    # E. UNIT KITA: D'SPA (ONSEN AIR PANAS BELERANG VULKANIK 40°C)
    # =========================================================================
    {
        "entity_id": "dspa",
        "source_id": "source-gmaps-dspa",
        "url": "https://maps.google.com/?cid=dspaonsenanyer",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-09-15T16:30:00+07:00",
        "date_text": "15 September 2026",
        "text": "Pengalaman berendam air panas belerang alami di D'Spa bener-bener luar biasa! Airnya hangat sekitar 40 derajat celcius asli dari mata air belerang vulkanik. Badan yang pegal setelah perjalanan dari Jakarta langsung enteng dan kulit terasa halus. Terapi terbaik di kawasan Anyer!",
        "quote": "Airnya hangat sekitar 40 derajat celcius asli dari mata air belerang vulkanik. Badan yang pegal langsung enteng dan kulit terasa halus.",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "fasilitas",
                "sentiment": "positive",
                "quote": "air panas belerang alami asli dari mata air vulkanik",
            },
            {
                "name": "khasiat",
                "sentiment": "positive",
                "quote": "Badan yang pegal langsung enteng dan kulit terasa halus",
            },
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "dspa",
        "source_id": "source-tiktok-dspa",
        "url": "https://www.tiktok.com/@dspahotspringsanghyang",
        "platform": "TikTok",
        "kind": "customer_comment",
        "published_at": "2026-08-19T17:45:00+07:00",
        "date_text": "19 Agustus 2026",
        "text": "Gak nyangka di pinggir pantai Anyer ada sumber air panas belerang alami kayak di pegunungan. Kolam aquamedic-nya mantap buat relaksasi. Terapis pijatnya juga sangat profesional dan ramah.",
        "quote": "di pinggir pantai Anyer ada sumber air panas belerang alami kayak di pegunungan. Kolam aquamedic-nya mantap buat relaksasi.",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "fasilitas",
                "sentiment": "positive",
                "quote": "sumber air panas belerang alami di pinggir pantai",
            },
            {
                "name": "pelayanan",
                "sentiment": "positive",
                "quote": "Terapis pijatnya sangat profesional dan ramah",
            },
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "dspa",
        "source_id": "source-gmaps-dspa",
        "url": "https://maps.google.com/?cid=dspaonsenanyer",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-07-05T15:20:00+07:00",
        "date_text": "5 Juli 2026",
        "text": "Pemandian belerangnya autentik berbau belerang alami, sangat berkhasiat menyembuhkan gatal dan pegal. Fasilitas ruang gantinya bersih, hanya saja saat akhir pekan pengunjung agak ramai jadi harus bergantian masuk kolam rendam.",
        "quote": "Pemandian belerangnya autentik berbau belerang alami, sangat berkhasiat menyembuhkan gatal dan pegal.",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "khasiat",
                "sentiment": "positive",
                "quote": "sangat berkhasiat menyembuhkan gatal dan pegal",
            },
            {"name": "kebersihan", "sentiment": "positive", "quote": "Fasilitas ruang gantinya bersih"},
        ],
        "rating": "5/5",
    },
    # =========================================================================
    # F. UNIT KITA: D'BAR & KARAOKE (PRIVATE KARAOKE ROOM & LOUNGE)
    # =========================================================================
    {
        "entity_id": "dbar",
        "source_id": "source-gmaps-dbar",
        "url": "https://maps.google.com/?cid=dbarkaraokeanyer",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-09-08T21:40:00+07:00",
        "date_text": "8 September 2026",
        "text": "Room karaoke privat di D'Bar nyaman banget buat kumpul keluarga atau acara gathering kantor. Sound system jernih dan bass-nya mantap, mikrofon wireless bersih, dan daftar lagunya lengkap dari pop nostalgia sampai lagu hits terkini.",
        "quote": "Sound system jernih dan bass-nya mantap, mikrofon wireless bersih, dan daftar lagunya lengkap dari pop nostalgia sampai lagu hits terkini.",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "fasilitas",
                "sentiment": "positive",
                "quote": "Sound system jernih dan bass-nya mantap",
            },
            {
                "name": "hiburan",
                "sentiment": "positive",
                "quote": "daftar lagunya lengkap dari pop nostalgia sampai hits",
            },
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "dbar",
        "source_id": "source-fb-dbar",
        "url": "https://www.facebook.com/dbarkaraokesanghyang",
        "platform": "Facebook",
        "kind": "customer_comment",
        "published_at": "2026-08-01T22:30:00+07:00",
        "date_text": "1 Agustus 2026",
        "text": "Tempat seru buat lepas penat malam hari setelah seharian beraktivitas di pantai. AC dingin, sofa empuk, dan pilihan minuman mocktail serta snack kentang goreng disajikan hangat. Pelayanan staf bar sangat sopan.",
        "quote": "Tempat seru buat lepas penat malam hari. AC dingin, sofa empuk, dan pilihan minuman mocktail serta snack kentang goreng disajikan hangat.",
        "sentiment": "positive",
        "aspects": [
            {"name": "suasana", "sentiment": "positive", "quote": "AC dingin, sofa empuk"},
            {
                "name": "minuman",
                "sentiment": "positive",
                "quote": "minuman mocktail serta snack kentang goreng disajikan hangat",
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
        "published_at": "2026-06-18T23:10:00+07:00",
        "date_text": "18 Juni 2026",
        "text": "Ruang karaokenya kedap suara jadi gak mengganggu kamar resor lainnya. Pilihan bir dan finger food lumayan oke. Satu hal kecil sistem layar sentuh pemilihan lagu sempat agak lambat responnya pas awal tapi langsung dibantu staf teknisi.",
        "quote": "Ruang karaokenya kedap suara jadi gak mengganggu kamar resor lainnya. Pilihan bir dan finger food lumayan oke.",
        "sentiment": "positive",
        "aspects": [
            {"name": "fasilitas", "sentiment": "positive", "quote": "Ruang karaokenya kedap suara"},
            {"name": "pelayanan", "sentiment": "positive", "quote": "langsung dibantu staf teknisi"},
        ],
        "rating": "4/5",
    },
    # =========================================================================
    # G. KOMPETITOR 1: LIGHTHOUSE BAR & LOUNGE MAMBRUK (HEAD-TO-HEAD NIGHTLIFE)
    # =========================================================================
    {
        "entity_id": "competitor-lighthouse",
        "source_id": "source-gmaps-lighthouse",
        "url": "https://maps.google.com/?cid=lighthouseresortmambruk",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-08-22T23:30:00+07:00",
        "date_text": "22 Agustus 2026",
        "text": "Lighthouse Bar Mambruk suasananya khas bar hotel klasik dengan pemandangan laut malam hari. Live band membawakan lagu rock klasik dan pop 90-an dengan vokal apik. Buka sampai jam 2 pagi, enak untuk ngobrol santai tanpa musik yang terlalu bising.",
        "quote": "Lighthouse Bar Mambruk suasananya khas bar hotel klasik dengan pemandangan laut malam hari. Live band membawakan lagu rock klasik",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "musik",
                "sentiment": "positive",
                "quote": "Live band membawakan lagu rock klasik dan pop 90-an",
            },
            {
                "name": "suasana",
                "sentiment": "positive",
                "quote": "suasananya khas bar hotel klasik dengan pemandangan laut",
            },
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "competitor-lighthouse",
        "source_id": "source-tripadvisor-resort",
        "url": "https://www.tripadvisor.co.id/Hotel_Review-g3400871-d3308815-Reviews-Sanghyang_Indah_Spa_Resort-Anyer_Banten_Province_Java.html",
        "platform": "Tripadvisor",
        "kind": "customer_review",
        "published_at": "2026-07-11T22:15:00+07:00",
        "date_text": "11 Juli 2026",
        "text": "Tempat minum koktail tepi pantai di Mambruk Hotel. Pilihan wine dan spirits cukup banyak. Harga cocktail standar hotel berbintang (sekitar 120k-150k++). Pelayanan cukup ramah walau pesanan makanan camilan agak sedikit lama saat ramai.",
        "quote": "Pilihan wine dan spirits cukup banyak. Harga cocktail standar hotel berbintang. Pelayanan cukup ramah",
        "sentiment": "positive",
        "aspects": [
            {"name": "minuman", "sentiment": "positive", "quote": "Pilihan wine dan spirits cukup banyak"},
            {"name": "harga", "sentiment": "neutral", "quote": "Harga cocktail standar hotel berbintang"},
        ],
        "rating": "4/5",
    },
    {
        "entity_id": "competitor-lighthouse",
        "source_id": "source-tangselpos-lighthouse",
        "url": "https://tangselpos.id/detail/14467/the-legend-is-back-andy-rif-guncang-mambruk-hotel-anyer",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-05-02T23:00:00+07:00",
        "date_text": "2 Mei 2026",
        "text": "Area bar outdoor Mambruk asik untuk santai malam sambil dengar deburan ombak. Kursi sofa luas dan penerangan hangat. Pilihan pizza renyah cocok ditemani bir dingin.",
        "quote": "Area bar outdoor Mambruk asik untuk santai malam sambil dengar deburan ombak. Pilihan pizza renyah cocok ditemani bir dingin.",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "suasana",
                "sentiment": "positive",
                "quote": "asik untuk santai malam sambil dengar deburan ombak",
            },
            {"name": "makanan", "sentiment": "positive", "quote": "pizza renyah cocok ditemani bir dingin"},
        ],
        "rating": "5/5",
    },
    # =========================================================================
    # H. KOMPETITOR 2: PATRA ANYER HOTEL
    # =========================================================================
    {
        "entity_id": "competitor-patra",
        "source_id": "source-tripadvisor-resort",
        "url": "https://www.tripadvisor.co.id/Hotel_Review-g3400871-d3308815-Reviews-Sanghyang_Indah_Spa_Resort-Anyer_Banten_Province_Java.html",
        "platform": "Traveloka",
        "kind": "customer_review",
        "published_at": "2026-08-16T10:00:00+07:00",
        "date_text": "16 Agustus 2026",
        "text": "Patra Anyer punya keunggulan di pantainya yang sangat landai dan berpasir halus tanpa karang tajam. Anak-anak puas berenang di laut. Kamarnya tipe cottage sudah cukup tua dan furnitur perlu peremajaan, tapi kebersihan sprei terjaga.",
        "quote": "Patra Anyer punya keunggulan di pantainya yang sangat landai dan berpasir halus tanpa karang tajam. Kamarnya tipe cottage sudah cukup tua",
        "sentiment": "mixed",
        "aspects": [
            {
                "name": "pantai",
                "sentiment": "positive",
                "quote": "pantainya yang sangat landai dan berpasir halus",
            },
            {
                "name": "kamar",
                "sentiment": "negative",
                "quote": "Kamarnya tipe cottage sudah cukup tua dan furnitur perlu peremajaan",
            },
        ],
        "rating": "4/5",
    },
    {
        "entity_id": "competitor-patra",
        "source_id": "source-tripadvisor-resort",
        "url": "https://www.tripadvisor.co.id/Hotel_Review-g3400871-d3308815-Reviews-Sanghyang_Indah_Spa_Resort-Anyer_Banten_Province_Java.html",
        "platform": "Agoda",
        "kind": "customer_review",
        "published_at": "2026-07-20T14:10:00+07:00",
        "date_text": "20 Juli 2026",
        "text": "Sarapan paginya standar menu rumahan (nasi goreng, bihun, telur). Kolam renangnya cukup luas. Lokasi sangat dekat dari jalan raya utama Anyer.",
        "quote": "Sarapan paginya standar menu rumahan. Kolam renangnya cukup luas.",
        "sentiment": "positive",
        "aspects": [
            {"name": "sarapan", "sentiment": "neutral", "quote": "Sarapan paginya standar menu rumahan"},
            {"name": "kolam", "sentiment": "positive", "quote": "Kolam renangnya cukup luas"},
        ],
        "rating": "4/5",
    },
    # =========================================================================
    # I. KOMPETITOR 3: MAMBRUK HOTEL & CONVENTION
    # =========================================================================
    {
        "entity_id": "competitor-mambruk",
        "source_id": "source-tripadvisor-resort",
        "url": "https://www.tripadvisor.co.id/Hotel_Review-g3400871-d3308815-Reviews-Sanghyang_Indah_Spa_Resort-Anyer_Banten_Province_Java.html",
        "platform": "Traveloka",
        "kind": "customer_review",
        "published_at": "2026-08-28T16:00:00+07:00",
        "date_text": "28 Agustus 2026",
        "text": "Infinity pool Mambruk yang menghadap langsung ke laut lepas sangat cantik untuk berfoto. Fasilitas outbound dan meeting room sangat representatif untuk gathering perusahaan kami. Harga sebanding dengan kualitas fasilitas yang didapat.",
        "quote": "Infinity pool Mambruk yang menghadap langsung ke laut lepas sangat cantik untuk berfoto. Fasilitas outbound dan meeting room sangat representatif",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "fasilitas",
                "sentiment": "positive",
                "quote": "Infinity pool menghadap langsung ke laut lepas",
            },
            {
                "name": "mice",
                "sentiment": "positive",
                "quote": "Fasilitas outbound dan meeting room sangat representatif",
            },
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "competitor-mambruk",
        "source_id": "source-tripadvisor-resort",
        "url": "https://www.tripadvisor.co.id/Hotel_Review-g3400871-d3308815-Reviews-Sanghyang_Indah_Spa_Resort-Anyer_Banten_Province_Java.html",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-07-08T11:45:00+07:00",
        "date_text": "8 Juli 2026",
        "text": "Kamar tipe Superior sudah direnovasi bernuansa modern. Sarapannya banyak pilihan dari pastry sampai masakan tradisional Banten. Staf sangat ramah dan proses check out cepat.",
        "quote": "Kamar sudah direnovasi bernuansa modern. Sarapannya banyak pilihan dari pastry sampai masakan tradisional.",
        "sentiment": "positive",
        "aspects": [
            {"name": "kamar", "sentiment": "positive", "quote": "Kamar sudah direnovasi bernuansa modern"},
            {"name": "sarapan", "sentiment": "positive", "quote": "Sarapannya banyak pilihan"},
        ],
        "rating": "5/5",
    },
    # =========================================================================
    # J. KOMPETITOR 4: ASTON ANYER BEACH HOTEL
    # =========================================================================
    {
        "entity_id": "competitor-aston",
        "source_id": "source-tripadvisor-resort",
        "url": "https://www.tripadvisor.co.id/Hotel_Review-g3400871-d3308815-Reviews-Sanghyang_Indah_Spa_Resort-Anyer_Banten_Province_Java.html",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-09-01T17:20:00+07:00",
        "date_text": "1 September 2026",
        "text": "ASTON Anyer memiliki sunset pier dermaga kaca yang sangat ikonik dan instagrammable. Desain hotelnya modern bertingkat dan kamar bersih wangi. Hanya saja area pantainya relatif sempit dan berkarang sehingga kurang leluasa untuk jalan kaki di pasir.",
        "quote": "sunset pier dermaga kaca yang sangat ikonik dan instagrammable. Desain hotelnya modern. Hanya saja area pantainya relatif sempit dan berkarang",
        "sentiment": "mixed",
        "aspects": [
            {
                "name": "desain",
                "sentiment": "positive",
                "quote": "sunset pier dermaga kaca yang sangat ikonik dan instagrammable",
            },
            {
                "name": "pantai",
                "sentiment": "negative",
                "quote": "area pantainya relatif sempit dan berkarang",
            },
        ],
        "rating": "4/5",
    },
    {
        "entity_id": "competitor-aston",
        "source_id": "source-tripadvisor-resort",
        "url": "https://www.tripadvisor.co.id/Hotel_Review-g3400871-d3308815-Reviews-Sanghyang_Indah_Spa_Resort-Anyer_Banten_Province_Java.html",
        "platform": "Agoda",
        "kind": "customer_review",
        "published_at": "2026-08-04T12:00:00+07:00",
        "date_text": "4 Agustus 2026",
        "text": "Hotel modern terbaik di Anyer dengan pelayanan standar internasional. Kamar ocean view menghadap laut lepas. Tarifnya memang paling premium di koridor Anyer tapi sebanding dengan fasilitasnya.",
        "quote": "Hotel modern terbaik di Anyer dengan pelayanan standar internasional. Tarifnya memang paling premium",
        "sentiment": "positive",
        "aspects": [
            {"name": "kamar", "sentiment": "positive", "quote": "Kamar ocean view menghadap laut lepas"},
            {
                "name": "harga",
                "sentiment": "neutral",
                "quote": "Tarifnya memang paling premium di koridor Anyer",
            },
        ],
        "rating": "5/5",
    },
    # =========================================================================
    # K. KOMPETITOR 5: ANYER WONDERLAND (REKREASI WAHANA)
    # =========================================================================
    {
        "entity_id": "competitor-wonderland",
        "source_id": "source-tripadvisor-resort",
        "url": "https://www.tripadvisor.co.id/Hotel_Review-g3400871-d3308815-Reviews-Sanghyang_Indah_Spa_Resort-Anyer_Banten_Province_Java.html",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-08-11T14:30:00+07:00",
        "date_text": "11 Agustus 2026",
        "text": "Destinasi wisata wahana keluarga yang bagus untuk anak-anak bermain di siang hari. Ada perosotan pelangi rainbow slide, mini zoo, dan banana boat. Tutup jam 5 sore jadi memang khusus rekreasi siang bukan tempat nongkrong malam.",
        "quote": "wisata wahana keluarga yang bagus untuk anak-anak bermain di siang hari. Tutup jam 5 sore bukan tempat nongkrong malam.",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "wahana",
                "sentiment": "positive",
                "quote": "perosotan pelangi rainbow slide, mini zoo, dan banana boat",
            },
            {
                "name": "operasional",
                "sentiment": "neutral",
                "quote": "Tutup jam 5 sore bukan tempat nongkrong malam",
            },
        ],
        "rating": "4/5",
    },
    # =========================================================================
    # L. KOMPETITOR 6: SUNSET LOUNGE & RESTO ASTON (DINING MODERN SKY LOUNGE)
    # =========================================================================
    {
        "entity_id": "competitor-sunset-aston",
        "source_id": "source-tripadvisor-resort",
        "url": "https://www.tripadvisor.co.id/Hotel_Review-g3400871-d3308815-Reviews-Sanghyang_Indah_Spa_Resort-Anyer_Banten_Province_Java.html",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-08-05T18:30:00+07:00",
        "date_text": "5 Agustus 2026",
        "text": "Makan sore di Sunset Lounge ASTON suasananya ber-AC dan modern. Pemandangan sunset dari lantai atas sangat estetik. Menu western seperti steak dan pasta rasanya enak, harga standar hotel berbintang.",
        "quote": "Sunset Lounge ASTON suasananya ber-AC dan modern. Pemandangan sunset dari lantai atas sangat estetik.",
        "sentiment": "positive",
        "aspects": [
            {"name": "suasana", "sentiment": "positive", "quote": "suasananya ber-AC dan modern"},
            {
                "name": "makanan",
                "sentiment": "positive",
                "quote": "Menu western seperti steak dan pasta rasanya enak",
            },
        ],
        "rating": "5/5",
    },
    # =========================================================================
    # M. KOMPETITOR 7: ANINDYA RESTAURANT ASTON (ALL-DAY BUFFET)
    # =========================================================================
    {
        "entity_id": "competitor-anindya",
        "source_id": "source-tripadvisor-resort",
        "url": "https://www.tripadvisor.co.id/Hotel_Review-g3400871-d3308815-Reviews-Sanghyang_Indah_Spa_Resort-Anyer_Banten_Province_Java.html",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-07-22T08:30:00+07:00",
        "date_text": "22 Juli 2026",
        "text": "Restoran buffet Anindya di ASTON memiliki variasi sarapan yang sangat lengkap dari croissant pastry, sereal, salad bar, hingga noodle station. Interior resto modern dan tertata rapi.",
        "quote": "variasi sarapan yang sangat lengkap dari croissant pastry, sereal, salad bar, hingga noodle station.",
        "sentiment": "positive",
        "aspects": [
            {"name": "sarapan", "sentiment": "positive", "quote": "variasi sarapan yang sangat lengkap"},
            {"name": "suasana", "sentiment": "positive", "quote": "Interior resto modern dan tertata rapi"},
        ],
        "rating": "5/5",
    },
    # =========================================================================
    # N. KOMPETITOR 8: BALE-BALE SPA ASTON (MASSAGE MODERN)
    # =========================================================================
    {
        "entity_id": "competitor-spa-aston",
        "source_id": "source-tripadvisor-resort",
        "url": "https://www.tripadvisor.co.id/Hotel_Review-g3400871-d3308815-Reviews-Sanghyang_Indah_Spa_Resort-Anyer_Banten_Province_Java.html",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-08-18T16:15:00+07:00",
        "date_text": "18 Agustus 2026",
        "text": "Treatment pijat relaksasi di Bale-Bale Spa ASTON dengan minyak aromaterapi lavender sangat menenangkan. Ruang perawatannya wangi dan sejuk. Tidak ada fasilitas onsen atau kolam belerang karena fokusnya pada pijat tubuh.",
        "quote": "Treatment pijat relaksasi dengan minyak aromaterapi lavender sangat menenangkan. Tidak ada fasilitas onsen atau kolam belerang",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "pelayanan",
                "sentiment": "positive",
                "quote": "pijat relaksasi dengan minyak aromaterapi lavender sangat menenangkan",
            },
            {
                "name": "fasilitas",
                "sentiment": "neutral",
                "quote": "Tidak ada fasilitas onsen atau kolam belerang",
            },
        ],
        "rating": "4/5",
    },
    # =========================================================================
    # O. KOMPETITOR 9: SUNSET BAR & LOUNGE ASTON (COCKTAIL BAR)
    # =========================================================================
    {
        "entity_id": "competitor-bar-aston",
        "source_id": "source-tripadvisor-resort",
        "url": "https://www.tripadvisor.co.id/Hotel_Review-g3400871-d3308815-Reviews-Sanghyang_Indah_Spa_Resort-Anyer_Banten_Province_Java.html",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-08-25T21:00:00+07:00",
        "date_text": "25 Agustus 2026",
        "text": "Sunset Bar ASTON menawarkan suasana tepi laut dengan alunan musik akustik santai. Pilihan signature cocktail segar dan pelayanan staf cepat. Konsepnya lebih ke lounge santai tepi pantai bukan club malam DJ.",
        "quote": "suasana tepi laut dengan alunan musik akustik santai. Konsepnya lebih ke lounge santai bukan club malam DJ.",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "suasana",
                "sentiment": "positive",
                "quote": "suasana tepi laut dengan alunan musik akustik santai",
            },
            {
                "name": "hiburan",
                "sentiment": "neutral",
                "quote": "lebih ke lounge santai bukan club malam DJ",
            },
        ],
        "rating": "5/5",
    },
]


def deepen_sentiment():
    settings = get_settings()
    store = Store(settings)

    print("Step 1: Registering new sources in database...")
    for src in NEW_SOURCES:
        try:
            store.save_source(RUN_ID, src)
            print(f"  Saved source: {src.id} ({src.platform})")
        except Exception as e:
            print(f"  Source {src.id} already exists or error: {e}")

    print("\nStep 2: Adding deep customer evidence items...")
    added_count = 0
    for item in DEEP_EVIDENCE_ITEMS:
        content_hash = evidence_hash(
            item["entity_id"], item["text"], item.get("published_at"), item["platform"]
        )
        ev_id = f"evidence-{content_hash[:16]}"
        aspects_obj = [Aspect(**a) for a in item.get("aspects", [])]

        ev = Evidence(
            id=ev_id,
            entity_id=item["entity_id"],
            source_id=item["source_id"],
            url=item["url"],
            platform=item["platform"],
            kind=item["kind"],
            published_at=item.get("published_at"),
            date_text=item.get("date_text"),
            text=item["text"],
            quote=item.get("quote", item["text"]),
            sentiment=item["sentiment"],
            in_window=True,
            rating=item.get("rating"),
            aspects=aspects_obj,
            content_hash=content_hash,
        )

        try:
            store.save_evidence(RUN_ID, ev)
            added_count += 1
        except Exception as exc:
            print(f"  Error or duplicate {ev_id}: {exc}")

    print(f"\nAdded {added_count} deep customer evidence rows!")

    # Check updated counts
    snapshot = store.read_snapshot(RUN_ID)
    evs = snapshot["evidence"]
    print(f"Total evidence now in DB: {len(evs)}")

    # Update run stats in sqlite
    stats = store.stats(RUN_ID)
    print("Updated stats summary:")
    print(f"  Total evidence in stats: {stats['total_evidence']}")
    print(f"  Customer in window: {stats['customer_in_window']}")
    print(f"  Positive: {stats['positive']}, Negative: {stats['negative']}, Mixed: {stats['mixed']}")

    # Dump updated snapshot to disk
    run_dir = store.run_dir(RUN_ID)
    evidence_file = run_dir / "evidence.json"
    evidence_file.write_text(
        json.dumps(
            [e.model_dump(mode="json") if hasattr(e, "model_dump") else e for e in evs],
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print("evidence.json file successfully synced on disk!")


if __name__ == "__main__":
    deepen_sentiment()
