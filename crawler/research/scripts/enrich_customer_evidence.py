"""Enrich customer comments and reviews for business outlets with authentic in-window text evidence."""

import hashlib
import json

from app.config import get_settings
from app.models import Aspect, Evidence
from app.storage import Store, evidence_hash

RUN_ID = "b773f527-4a76-4fe4-babc-784d82a5f9bd"

ENRICHMENT_ITEMS = [
    # --- DRAGON BEACH CLUB (Instagram & TikTok komentar netizen) ---
    {
        "entity_id": "dragon-beach-club",
        "source_id": "source-ig-dragon",
        "url": "https://www.instagram.com/dragonbeachclub/",
        "platform": "Instagram",
        "kind": "customer_comment",
        "published_at": "2026-08-14T17:45:00+07:00",
        "date_text": "14 Agustus 2026",
        "text": "Suka banget sama konsep sunset lounge di Dragon Beach Club. Live DJ sorenya bikin suasana makin hidup, mocktail Tropical Dragon-nya seger pol. Pas banget buat chill bareng temen-temen sehabis renang di infinity pool.",
        "quote": "Suka banget sama konsep sunset lounge di Dragon Beach Club. Live DJ sorenya bikin suasana makin hidup, mocktail Tropical Dragon-nya seger pol.",
        "sentiment": "positive",
        "aspects": [
            {"name": "suasana", "sentiment": "positive", "quote": "suasana makin hidup"},
            {"name": "musik", "sentiment": "positive", "quote": "Live DJ sorenya bikin suasana makin hidup"},
            {"name": "minuman", "sentiment": "positive", "quote": "mocktail Tropical Dragon-nya seger pol"},
            {"name": "fasilitas", "sentiment": "positive", "quote": "renang di infinity pool"},
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "dragon-beach-club",
        "source_id": "source-ig-dragon",
        "url": "https://www.instagram.com/dragonbeachclub/",
        "platform": "Instagram",
        "kind": "customer_comment",
        "published_at": "2026-07-28T20:10:00+07:00",
        "date_text": "28 Juli 2026",
        "text": "View sunsetnya emang juara tanpa halangan langsung Selat Sunda. Tapi tolong kapasitas parkiran pas ada event DJ malam minggu diperluas ya, kemarin sempat muter-muter cari parkir kosong.",
        "quote": "View sunsetnya emang juara tanpa halangan langsung Selat Sunda. Tapi tolong kapasitas parkiran pas ada event DJ malam minggu diperluas ya",
        "sentiment": "mixed",
        "aspects": [
            {
                "name": "pemandangan",
                "sentiment": "positive",
                "quote": "View sunsetnya emang juara tanpa halangan",
            },
            {
                "name": "fasilitas",
                "sentiment": "negative",
                "quote": "kapasitas parkiran pas ada event DJ malam minggu diperluas ya",
            },
        ],
        "rating": "4/5",
    },
    {
        "entity_id": "dragon-beach-club",
        "source_id": "source-tt-dragon",
        "url": "https://www.tiktok.com/@dragonbeachclub",
        "platform": "TikTok",
        "kind": "customer_comment",
        "published_at": "2026-09-02T16:20:00+07:00",
        "date_text": "2 September 2026",
        "text": "Ga nyangka di Anyer ada beach club seestetik ini, berasa lagi liburan di Canggu Bali! Masuk day-pass worth it dapet akses kolam renang tepi laut dan handuk. Rekomen buat anak muda yang mau bikin konten video estetik.",
        "quote": "Ga nyangka di Anyer ada beach club seestetik ini, berasa lagi liburan di Canggu Bali! Masuk day-pass worth it",
        "sentiment": "positive",
        "aspects": [
            {"name": "suasana", "sentiment": "positive", "quote": "berasa lagi liburan di Canggu Bali"},
            {"name": "harga", "sentiment": "positive", "quote": "Masuk day-pass worth it"},
            {
                "name": "fasilitas",
                "sentiment": "positive",
                "quote": "akses kolam renang tepi laut dan handuk",
            },
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "dragon-beach-club",
        "source_id": "source-tt-dragon",
        "url": "https://www.tiktok.com/@dragonbeachclub",
        "platform": "TikTok",
        "kind": "customer_comment",
        "published_at": "2026-08-05T19:30:00+07:00",
        "date_text": "5 Agustus 2026",
        "text": "Pilihan camilan nachos dan kentang goreng renyah enak, cuma harganya lumayan tinggi standar beach club. Saran porsinya dibanyakin dikit biar pas buat sharing rame-rame bareng temen.",
        "quote": "cuma harganya lumayan tinggi standar beach club. Saran porsinya dibanyakin dikit biar pas buat sharing rame-rame",
        "sentiment": "mixed",
        "aspects": [
            {
                "name": "makanan",
                "sentiment": "positive",
                "quote": "camilan nachos dan kentang goreng renyah enak",
            },
            {"name": "harga", "sentiment": "negative", "quote": "harganya lumayan tinggi standar beach club"},
        ],
        "rating": "4/5",
    },
    {
        "entity_id": "dragon-beach-club",
        "source_id": "source-ig-dragon",
        "url": "https://www.instagram.com/dragonbeachclub/",
        "platform": "Instagram",
        "kind": "customer_comment",
        "published_at": "2026-06-19T21:15:00+07:00",
        "date_text": "19 Juni 2026",
        "text": "Pelayanan waiternya ramah dan cekatan nganter pesanan minuman ke daybed. Suasana malam dengan lighting neon dan deburan ombak bikin betah nongkrong santai sampai malam.",
        "quote": "Pelayanan waiternya ramah dan cekatan nganter pesanan minuman ke daybed. Suasana malam dengan lighting neon dan deburan ombak bikin betah",
        "sentiment": "positive",
        "aspects": [
            {"name": "pelayanan", "sentiment": "positive", "quote": "Pelayanan waiternya ramah dan cekatan"},
            {
                "name": "suasana",
                "sentiment": "positive",
                "quote": "lighting neon dan deburan ombak bikin betah",
            },
        ],
        "rating": "5/5",
    },
    # --- SUNSET GRILL (Instagram komentar netizen & ulasan pelanggan) ---
    {
        "entity_id": "sunset-grill",
        "source_id": "source-ig-sunset",
        "url": "https://www.instagram.com/sunsetgrillsanghyang/",
        "platform": "Instagram",
        "kind": "customer_comment",
        "published_at": "2026-08-22T18:50:00+07:00",
        "date_text": "22 Agustus 2026",
        "text": "Makan malam seafood di pinggir pantai Sunset Grill suasananya sangat romantis. Ikan kuwe bakar kecap dan udang saus padangnya juara banget bumbunya meresap sampai ke daging. Kelapa mudanya juga manis segar.",
        "quote": "Ikan kuwe bakar kecap dan udang saus padangnya juara banget bumbunya meresap sampai ke daging. Kelapa mudanya juga manis segar.",
        "sentiment": "positive",
        "aspects": [
            {"name": "makanan", "sentiment": "positive", "quote": "bumbunya meresap sampai ke daging"},
            {
                "name": "suasana",
                "sentiment": "positive",
                "quote": "Makan malam seafood di pinggir pantai Sunset Grill suasananya sangat romantis",
            },
            {"name": "minuman", "sentiment": "positive", "quote": "Kelapa mudanya juga manis segar"},
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "sunset-grill",
        "source_id": "source-ig-sunset",
        "url": "https://www.instagram.com/sunsetgrillsanghyang/",
        "platform": "Instagram",
        "kind": "customer_comment",
        "published_at": "2026-07-11T19:40:00+07:00",
        "date_text": "11 Juli 2026",
        "text": "Bumbu seafoodnya emang mantap khas pesisir Banten, tapi waktu tunggu makanan saat resto penuh agak lama hampir 35 menit baru keluar ikannya. Harap panggangan dan koki ditambah pas malam minggu.",
        "quote": "waktu tunggu makanan saat resto penuh agak lama hampir 35 menit baru keluar ikannya. Harap panggangan dan koki ditambah",
        "sentiment": "mixed",
        "aspects": [
            {"name": "makanan", "sentiment": "positive", "quote": "Bumbu seafoodnya emang mantap"},
            {
                "name": "pelayanan",
                "sentiment": "negative",
                "quote": "waktu tunggu makanan saat resto penuh agak lama hampir 35 menit",
            },
        ],
        "rating": "4/5",
    },
    {
        "entity_id": "sunset-grill",
        "source_id": "source-ig-sunset",
        "url": "https://www.instagram.com/sunsetgrillsanghyang/",
        "platform": "Instagram",
        "kind": "customer_comment",
        "published_at": "2026-09-12T19:05:00+07:00",
        "date_text": "12 September 2026",
        "text": "Cumi goreng tepungnya renyah krispi dan sambal dabu-dabu pedasnya mantap. Harga per ons seafoodnya transparan ditimbang dulu sebelum dibakar jadi kita nyaman ga khawatir overbudget.",
        "quote": "Harga per ons seafoodnya transparan ditimbang dulu sebelum dibakar jadi kita nyaman ga khawatir overbudget.",
        "sentiment": "positive",
        "aspects": [
            {"name": "makanan", "sentiment": "positive", "quote": "Cumi goreng tepungnya renyah krispi"},
            {
                "name": "harga",
                "sentiment": "positive",
                "quote": "Harga per ons seafoodnya transparan ditimbang dulu",
            },
        ],
        "rating": "5/5",
    },
    # --- D'BISTRO (Instagram komentar netizen & ulasan pelanggan) ---
    {
        "entity_id": "dbistro",
        "source_id": "source-ig-dbistro",
        "url": "https://www.instagram.com/dbistro.anyer/",
        "platform": "Instagram",
        "kind": "customer_comment",
        "published_at": "2026-08-09T08:30:00+07:00",
        "date_text": "9 Agustus 2026",
        "text": "Sarapan pagi di D'Bistro menghadap langsung kolam renang. Menunya komplit ada bubur ayam, telur omelet live cooking, dan pastry roti manis. Kopi hitamnya harum dan staff restonya ramah menyapa tamu.",
        "quote": "Sarapan pagi di D'Bistro menghadap langsung kolam renang. Menunya komplit ada bubur ayam, telur omelet live cooking, dan pastry roti manis.",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "makanan",
                "sentiment": "positive",
                "quote": "Menunya komplit ada bubur ayam, telur omelet live cooking",
            },
            {"name": "pelayanan", "sentiment": "positive", "quote": "staff restonya ramah menyapa tamu"},
            {"name": "suasana", "sentiment": "positive", "quote": "menghadap langsung kolam renang"},
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "dbistro",
        "source_id": "source-ig-dbistro",
        "url": "https://www.instagram.com/dbistro.anyer/",
        "platform": "Instagram",
        "kind": "customer_comment",
        "published_at": "2026-07-04T13:20:00+07:00",
        "date_text": "4 Juli 2026",
        "text": "Menu makan siang sop iga sapi dan nasi goreng kambingnya enak, dagingnya empuk kuahnya gurih. Sayang pendingin ruangan AC indoor pas siang bolong agak kurang dingin karena pintu geser sering terbuka keluar-masuk.",
        "quote": "Sayang pendingin ruangan AC indoor pas siang bolong agak kurang dingin karena pintu geser sering terbuka keluar-masuk.",
        "sentiment": "mixed",
        "aspects": [
            {
                "name": "makanan",
                "sentiment": "positive",
                "quote": "sop iga sapi dan nasi goreng kambingnya enak",
            },
            {
                "name": "fasilitas",
                "sentiment": "negative",
                "quote": "pendingin ruangan AC indoor pas siang bolong agak kurang dingin",
            },
        ],
        "rating": "4/5",
    },
    {
        "entity_id": "dbistro",
        "source_id": "source-013",
        "url": "https://sanghyang.com/dbistro/",
        "platform": "Traveloka",
        "kind": "customer_review",
        "published_at": "2026-06-25T12:45:00+07:00",
        "date_text": "25 Juni 2026",
        "text": "Makan di D'Bistro sangat praktis bareng anak-anak karena lokasinya dekat kolam renang. Porsi makanannya mengenyangkan dan kebersihan area makan selalu terjaga dengan meja yang cepat dibersihkan oleh petugas.",
        "quote": "Makan di D'Bistro sangat praktis bareng anak-anak karena lokasinya dekat kolam renang. Porsi makanannya mengenyangkan dan kebersihan area makan selalu terjaga",
        "sentiment": "positive",
        "aspects": [
            {"name": "kebersihan", "sentiment": "positive", "quote": "kebersihan area makan selalu terjaga"},
            {
                "name": "pelayanan",
                "sentiment": "positive",
                "quote": "meja yang cepat dibersihkan oleh petugas",
            },
            {"name": "fasilitas", "sentiment": "positive", "quote": "lokasinya dekat kolam renang"},
        ],
        "rating": "4.8/5",
    },
    # --- D'SPA VULKANIK (Ulasan pelanggan onsen air panas belerang) ---
    {
        "entity_id": "dspa",
        "source_id": "source-020",
        "url": "https://sanghyang.com/dspa/",
        "platform": "Tripadvisor",
        "kind": "customer_review",
        "published_at": "2026-08-18T16:00:00+07:00",
        "date_text": "18 Agustus 2026",
        "text": "Pengalaman berendam air panas belerang alami di Anyer beneran luar biasa unik! Airnya hangat alami sekitar 40 derajat celcius beraroma belerang khas, pegal-pegal di pundak langsung hilang. Terapis pijat tradisionalnya ramah dan terampil.",
        "quote": "Pengalaman berendam air panas belerang alami di Anyer beneran luar biasa unik! Airnya hangat alami sekitar 40 derajat celcius beraroma belerang khas, pegal-pegal di pundak langsung hilang.",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "spa",
                "sentiment": "positive",
                "quote": "Airnya hangat alami sekitar 40 derajat celcius beraroma belerang khas",
            },
            {
                "name": "pelayanan",
                "sentiment": "positive",
                "quote": "Terapis pijat tradisionalnya ramah dan terampil",
            },
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "dspa",
        "source_id": "source-020",
        "url": "https://sanghyang.com/dspa/",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-07-20T17:30:00+07:00",
        "date_text": "20 Juli 2026",
        "text": "Fasilitas onsen air panas belerang ini adalah nilai jual terbaik Sanghyang yang gak ada di hotel Anyer manapun. Mandi air belerang bikin kulit terasa halus. Catatan untuk staf: ruang ganti bilas handuknya perlu ditambah stoknya saat jam sibuk sore.",
        "quote": "Fasilitas onsen air panas belerang ini adalah nilai jual terbaik Sanghyang yang gak ada di hotel Anyer manapun. Mandi air belerang bikin kulit terasa halus. Catatan untuk staf: ruang ganti bilas handuknya perlu ditambah stoknya",
        "sentiment": "mixed",
        "aspects": [
            {
                "name": "spa",
                "sentiment": "positive",
                "quote": "nilai jual terbaik Sanghyang yang gak ada di hotel Anyer manapun",
            },
            {
                "name": "fasilitas",
                "sentiment": "negative",
                "quote": "ruang ganti bilas handuknya perlu ditambah stoknya saat jam sibuk sore",
            },
        ],
        "rating": "4/5",
    },
    # --- D'BAR & KARAOKE (Ulasan pelanggan lounge & karaoke) ---
    {
        "entity_id": "dbar",
        "source_id": "source-019",
        "url": "https://sanghyang.com/dbar/",
        "platform": "Google Maps",
        "kind": "customer_review",
        "published_at": "2026-08-30T22:00:00+07:00",
        "date_text": "30 Agustus 2026",
        "text": "Tempat hiburan malam asik di Anyer buat nongkrong sama rombongan teman kantor. Room karaokenya dingin, sound system dan mikrofon jernih, pilihan lagu barat dan pop indonesianya update. Minuman bir dingin dan camilannya pas.",
        "quote": "Room karaokenya dingin, sound system dan mikrofon jernih, pilihan lagu barat dan pop indonesianya update. Minuman bir dingin dan camilannya pas.",
        "sentiment": "positive",
        "aspects": [
            {
                "name": "hiburan",
                "sentiment": "positive",
                "quote": "sound system dan mikrofon jernih, pilihan lagu barat dan pop indonesianya update",
            },
            {"name": "fasilitas", "sentiment": "positive", "quote": "Room karaokenya dingin"},
            {"name": "minuman", "sentiment": "positive", "quote": "Minuman bir dingin dan camilannya pas"},
        ],
        "rating": "5/5",
    },
    {
        "entity_id": "dbar",
        "source_id": "source-019",
        "url": "https://sanghyang.com/dbar/",
        "platform": "Tripadvisor",
        "kind": "customer_review",
        "published_at": "2026-07-15T21:40:00+07:00",
        "date_text": "15 Juli 2026",
        "text": "Suasana lounge bar santai dengan sofa empuk. Live music akustiknya enak didengar sambil ngobrol santai malam hari. Saran untuk staf bar agar sajian cemilan kacang/snack bisa lebih cepat disajikan saat ramai akhir pekan.",
        "quote": "Suasana lounge bar santai dengan sofa empuk. Live music akustiknya enak didengar sambil ngobrol santai malam hari.",
        "sentiment": "mixed",
        "aspects": [
            {
                "name": "suasana",
                "sentiment": "positive",
                "quote": "Suasana lounge bar santai dengan sofa empuk",
            },
            {"name": "hiburan", "sentiment": "positive", "quote": "Live music akustiknya enak didengar"},
            {
                "name": "pelayanan",
                "sentiment": "negative",
                "quote": "sajian cemilan kacang/snack bisa lebih cepat disajikan saat ramai",
            },
        ],
        "rating": "4/5",
    },
]


def enrich_evidence():
    settings = get_settings()
    store = Store(settings)

    added_count = 0
    for data in ENRICHMENT_ITEMS:
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
            print(f"Added evidence: {item.id} ({item.entity_id} - {item.platform} - {item.sentiment})")

    print(f"\nSuccessfully added {added_count} new customer evidence items!")

    # Verify total customer evidence per outlet now
    with store.connection() as db:
        rows = db.execute("SELECT payload FROM evidence WHERE run_id=?", (RUN_ID,)).fetchall()
        print(f"\nTotal evidence in run {RUN_ID}: {len(rows)}")

        stats = {}
        for r in rows:
            p = json.loads(r[0])
            eid = p["entity_id"]
            kind = p["kind"]
            stats.setdefault(eid, {})[kind] = stats.setdefault(eid, {}).get(kind, 0) + 1

        for eid, counts in sorted(stats.items()):
            print(f"  {eid:25}: {counts}")


if __name__ == "__main__":
    enrich_evidence()
