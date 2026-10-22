"""One local durable research workflow; every statistic is computed from captured evidence."""

from __future__ import annotations

import asyncio
import json
import re
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from urllib.parse import quote_plus, urlsplit

from dbos import DBOS, Queue, SetWorkflowID
from pydantic import BaseModel, Field

from app.codex import ResearchError, run_codex
from app.collector import collect_source
from app.config import Settings
from app.models import (
    Aspect,
    Entity,
    Evidence,
    EvidenceKind,
    Report,
    Sentiment,
    Source,
    StrictModel,
    calendar_window,
)
from app.storage import CUSTOMER_KINDS, Store, evidence_hash

_settings: Settings | None = None
_store: Store | None = None
_queue: Queue | None = None
PLATFORMS = ("Google", "Facebook", "Instagram", "TikTok", "YouTube", "X", "Threads", "LinkedIn", "OTA")


class DiscoveredSource(StrictModel):
    entity_id: str
    url: str
    platform: str
    rationale: str


class CoverageGap(StrictModel):
    entity_id: str
    platform: str
    reason: str


class Discovery(StrictModel):
    entities: list[Entity]
    sources: list[DiscoveredSource]
    gaps: list[CoverageGap]
    limitations: list[str]


class ExtractedEvidence(StrictModel):
    entity_id: str
    source_id: str
    kind: EvidenceKind
    published_at: str | None
    date_text: str
    text: str
    quote: str
    sentiment: Sentiment
    aspects: list[Aspect]
    rating: str | None


class Extraction(StrictModel):
    evidence: list[ExtractedEvidence]
    limitations: list[str] = Field(default_factory=list)


def runtime() -> tuple[Settings, Store]:
    if _settings is None or _store is None:
        raise RuntimeError("Pipeline belum diinisialisasi")
    return _settings, _store


def dump_artifact(run_id: str, name: str, value: Any) -> Path:
    _, store = runtime()
    path = store.run_dir(run_id) / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def ai_call[T: BaseModel](run_id: str, label: str, prompt: str, model: type[T], *, search: bool) -> T:
    settings, store = runtime()
    path = store.run_dir(run_id) / "ai" / label
    result_file = path.with_suffix(".result.json")
    if result_file.is_file():
        try:
            return model.model_validate_json(result_file.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            pass
    try:
        store.reserve_codex_call(run_id)
    except RuntimeError as exc:
        raise ResearchError(
            "codex_call_limit", "Batas pemanggilan Codex tercapai; penelitian parsial."
        ) from exc
    return run_codex(settings, prompt, model, path, search=search)


@DBOS.step()
def bootstrap(run_id: str) -> dict[str, Any]:
    settings, store = runtime()
    run = store.get_run(run_id)
    store.update_run(
        run_id, status="running", stage="identity", message="Mengambil website resmi dan identitas bisnis"
    )
    entity = Entity(
        id="business", name=urlsplit(run["url"]).hostname or "Bisnis", kind="business", website=run["url"]
    )
    store.save_entity(run_id, entity)
    source = Source(id="official-root", entity_id="business", url=run["url"], platform="website")
    existing = next((row for row in store.list_sources(run_id) if row["id"] == source.id), None)
    if existing and existing["status"] != "pending":
        captured = Source.model_validate(existing)
    else:
        captured = asyncio.run(collect_source(settings, source, store.run_dir(run_id)))
        store.save_source(run_id, captured)
        store.update_run(run_id, pages_fetched=1)
    markdown = ""
    if captured.artifact_path:
        markdown = (store.run_dir(run_id) / captured.artifact_path).read_text(encoding="utf-8")
    return {"run": run, "official": captured.model_dump(), "markdown": markdown[: settings.max_source_chars]}


@DBOS.step()
def discover(run_id: str, context: dict[str, Any]) -> dict[str, Any]:
    settings, store = runtime()
    store.update_run(
        run_id, stage="discovery", message="Mencari akun publik, ulasan pelanggan dan kompetitor"
    )
    run = context["run"]
    prompt = (
        "Temukan identitas bisnis dari URL dan website resmi berikut. ID entitas utama HARUS business. "
        "Pisahkan unit/outlet yang benar-benar ditautkan website resmi; parent_id unit=business. "
        "Untuk sanghyang.com pisahkan resort dan lima outlet D'Bistro, Sunset Grill, "
        "Dragon Beach Club, D'Bar/Karaoke, D'Spa; pakai nama tepat di website. "
        "Cari sumber publik nyata untuk semua entitas: Google Search/Maps/reviews, Facebook, Instagram, "
        "TikTok, YouTube, X, Threads, LinkedIn, Tripadvisor serta review independen. "
        "Untuk resort utama dan setiap kompetitor penginapan, cari listing ulasan secara TERPISAH di "
        "semua OTA ini: Traveloka, Agoda, Booking.com, Trip.com, dan tiket.com. Jangan berhenti setelah "
        "menemukan Traveloka. Cari juga OTA untuk outlet hanya jika ada listing outlet yang nyata dan terpisah. "
        "Untuk setiap OTA yang tidak memiliki listing atau tidak ditemukan, buat gap khusus entitas/platform "
        "dengan alasan; jika halaman ditemukan tetapi gagal/terblokir, tetap simpan URL agar kegagalannya tercatat. "
        "Cari termasuk ulasan negatif/keluhan dan ulasan positif, "
        "utamakan halaman yang menampilkan teks pelanggan dengan tanggal dalam periode. "
        "Berikan URL halaman langsung, bukan sekadar URL homepage platform atau redirect mesin pencari. "
        "Untuk Traveloka, endpoint ulasan publik boleh dipakai bila cocok: "
        "https://www.traveloka.com/en-en/user/review/consumption/HOTEL/GENERAL/{hotel_id} "
        "atau https://www.traveloka.com/en-en/user/review/consumption/EXPERIENCE/BEAUTY_AND_SPA/{id}; "
        "prioritas Traveloka tidak menggantikan pencarian OTA lainnya. "
        "JANGAN gunakan URL google.com/travel/hotels/entity/... karena selalu dialihkan ke unsupported bot; "
        "gunakan URL ulasan publik Trip.com, Traveloka, Agoda, Booking, Google Maps, atau website direktori publik. "
        "Verifikasi akun dari alamat, nama dan tautan resmi; akun yang belum terbukti tetap candidate. "
        "Pilih 3 kompetitor relevan kategori/lokasi untuk resort (Mambruk, Patra Anyer, ASTON Anyer; "
        "Novus Jiva hanya benchmark premium) dan kompetitor spesifik per outlet bila ditemukan listing publik nyata "
        "(misal beach club alternatif Anyer untuk Dragon Beach Club, resto grill/seafood terdekat untuk Sunset Grill/D’Bistro). "
        "Competitor harus is_competitor=true dan comparator_for ID entitas target yang relevan. "
        "Utamakan competitor_urls user bila diberikan. Jangan mengarang kompetitor outlet saat belum cukup bukti. "
        "Cari sampai 70 URL yang berguna, dengan 3-8 URL teks pelanggan per resort dan pembanding serta "
        "akun resmi outlet. Setiap platform yang tidak ditemukan tulis di gaps beserta alasan. "
        "Penanda verified hanya untuk identitas yang dibuktikan sumber resmi. Hasil discovery bukan sentimen. "
        f"Periode BEKU: {run['start_at']} sampai {run['end_at']}.\n"
        + json.dumps(
            {
                "url": run["url"],
                "competitor_urls": run["request"]["competitor_urls"],
                "official_source": context["official"],
                "official_markdown": context["markdown"],
            },
            ensure_ascii=False,
        )
    )
    result = ai_call(run_id, "discovery", prompt, Discovery, search=True)
    entities = {entity.id: entity for entity in result.entities}
    if "business" not in entities or entities["business"].is_competitor:
        raise ResearchError(
            "discovery_invalid", "Discovery tidak menghasilkan identitas bisnis utama yang valid"
        )
    for entity in entities.values():
        if entity.parent_id and entity.parent_id not in entities:
            raise ResearchError("discovery_invalid", "Parent entitas discovery tidak ditemukan")
        if not set(entity.comparator_for) <= set(entities):
            raise ResearchError("discovery_invalid", "Target pembanding discovery tidak ditemukan")
        if not entity.is_competitor:
            entity.website = entity.website or run["url"]
            if entity.id != "business" and normalize_name(entity.name) not in normalize_name(
                context["markdown"]
            ):
                entity.verification = "candidate"
        store.save_entity(run_id, entity)
    seen = {(row["entity_id"], row["url"]) for row in store.list_sources(run_id)}
    for number, item in enumerate(result.sources):
        url = normalize_source_url(item.url)
        if item.entity_id not in entities or (item.entity_id, url) in seen:
            continue
        source = Source(
            id=f"source-{number:03d}",
            entity_id=item.entity_id,
            url=url,
            platform=canonical_platform(url, item.platform, entities[item.entity_id].website),
            message=item.rationale,
        )
        store.save_source(run_id, source)
        seen.add((item.entity_id, url))
    gap_number = 0
    for gap in result.gaps:
        if gap.entity_id in entities:
            platforms = [
                value.strip()
                for value in re.split(r",|;|/|\band\b|&", gap.platform, flags=re.I)
                if value.strip()
            ]
            for requested in platforms or [gap.platform]:
                platform = canonical_platform("https://www.google.com/", requested)
                query = quote_plus(f"{entities[gap.entity_id].name} {requested}")
                store.save_source(
                    run_id,
                    Source(
                        id=f"gap-{gap_number:03d}",
                        entity_id=gap.entity_id,
                        url=f"https://www.google.com/search?q={query}",
                        platform=platform,
                        status="not_found",
                        message=gap.reason,
                    ),
                )
                gap_number += 1
    pending = [row for row in store.list_sources(run_id) if row["status"] == "pending"]
    # ponytail: one local worker uses round-robin entities; queue sharding only if multi-user scope is approved.
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in pending:
        groups[row["entity_id"]].append(row)
    ordered = []
    while any(groups.values()):
        for rows in groups.values():
            if rows:
                ordered.append(rows.pop(0))
    allowed = settings.max_pages - store.get_run(run_id)["pages_fetched"]
    for row in ordered[max(allowed, 0) :]:
        store.save_source(
            run_id,
            Source.model_validate(row).model_copy(
                update={"status": "limit", "message": "Batas jumlah halaman tercapai"}
            ),
        )
    result.sources = result.sources[:]
    dump_artifact(run_id, "discovery.json", result.model_dump())
    return {
        "source_ids": [row["id"] for row in ordered[: max(allowed, 0)]],
        "limitations": result.limitations,
    }


def normalize_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.casefold())


def normalize_source_url(url: str) -> str:
    traveloka_hotel = re.search(r"https?://(?:www\.)?traveloka\.com/[^/]+/hotel/[^?#]*-(\d+)", url)
    if traveloka_hotel:
        return f"https://www.traveloka.com/en-en/user/review/consumption/HOTEL/GENERAL/{traveloka_hotel.group(1)}"
    return url


def canonical_platform(url: str, requested: str, website: str = "") -> str:
    host = (urlsplit(url).hostname or "").lower().removeprefix("www.").removeprefix("m.")
    site_host = (urlsplit(website).hostname or "").lower().removeprefix("www.").removeprefix("m.")
    if site_host and (host == site_host or host.endswith(f".{site_host}")):
        return "website"
    domains = {
        "facebook.com": "Facebook",
        "instagram.com": "Instagram",
        "tiktok.com": "TikTok",
        "youtube.com": "YouTube",
        "youtu.be": "YouTube",
        "x.com": "X",
        "twitter.com": "X",
        "threads.net": "Threads",
        "linkedin.com": "LinkedIn",
        "tripadvisor.com": "Tripadvisor",
        "agoda.com": "Agoda",
        "traveloka.com": "Traveloka",
        "trip.com": "Trip.com",
        "booking.com": "Booking.com",
        "tiket.com": "tiket.com",
    }
    known = {
        label.casefold(): label
        for label in (*domains.values(), "Google", "Google Maps", "Google Reviews", "website")
    }
    requested_label = known.get(requested.strip().casefold())
    if host.endswith("google.com") or host.endswith("google.co.id"):
        if (
            host.startswith("maps.google.")
            or "map" in requested.casefold()
            or "/maps" in urlsplit(url).path.lower()
        ):
            return "Google Maps"
        if "review" in requested.casefold():
            return "Google Reviews"
        return requested_label or "Google"
    if requested_label:
        return requested_label
    for domain, label in domains.items():
        if host == domain or host.endswith(f".{domain}"):
            return label
    return requested.strip() or "Sumber lain"


@DBOS.step()
def crawl_page(run_id: str, source_id: str) -> dict[str, Any]:
    settings, store = runtime()
    row = next(row for row in store.list_sources(run_id) if row["id"] == source_id)
    source = Source.model_validate(row)
    if source.status == "pending":
        run = store.get_run(run_id)
        store.update_run(run_id, stage="collection", message=f"Mengambil {source.platform}: {source.url}")
        captured = asyncio.run(collect_source(settings, source, store.run_dir(run_id)))
        store.save_source(run_id, captured)
        store.update_run(run_id, pages_fetched=run["pages_fetched"] + 1)
        source = captured
    return source.model_dump()


MONTHS = {
    name: number
    for number, names in enumerate(
        (
            ("january", "januari", "jan"),
            ("february", "februari", "feb"),
            ("march", "maret", "mar"),
            ("april", "apr"),
            ("may", "mei"),
            ("june", "juni", "jun"),
            ("july", "juli", "jul"),
            ("august", "agustus", "aug", "agu"),
            ("september", "sep", "sept"),
            ("october", "oktober", "oct", "okt"),
            ("november", "nov"),
            ("december", "desember", "dec", "des"),
        ),
        1,
    )
    for name in names
}


def anchored_date(
    date_text: str, candidate: str | None, quote: str, markdown: str, fetched_at: str
) -> str | None:
    if not candidate or not date_text or date_text not in markdown or quote not in markdown:
        return None
    quote_positions = [match.start() for match in re.finditer(re.escape(quote), markdown)]
    date_positions = [match.start() for match in re.finditer(re.escape(date_text), markdown)]
    if min(abs(q - d) for q in quote_positions for d in date_positions) > 2000:
        return None
    try:
        proposed = datetime.fromisoformat(candidate.replace("Z", "+00:00"))
    except ValueError:
        return None
    cleaned = date_text.strip().lower()
    cleaned = re.sub(r"\(s\)", "s", cleaned)
    parsed: datetime | None = None
    iso = re.search(r"\b(20\d{2})-(\d{2})-(\d{2})\b", cleaned)
    numeric = re.search(r"\b(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2})\b", cleaned)
    words = re.findall(r"[a-z]+|\d+", cleaned)
    relative = None
    try:
        if iso:
            parsed = datetime(*map(int, iso.groups()), tzinfo=UTC)
        elif numeric:
            day, month, year = map(int, numeric.groups())
            parsed = datetime(year, month, day, tzinfo=UTC)
        else:
            for index, word in enumerate(words):
                if word not in MONTHS:
                    continue
                before = words[index - 1] if index else ""
                after = words[index + 1 : index + 3]
                if before.isdigit() and len(before) <= 2 and after and re.fullmatch(r"20\d{2}", after[0]):
                    parsed = datetime(int(after[0]), MONTHS[word], int(before), tzinfo=UTC)
                    break
                if (
                    len(after) == 2
                    and after[0].isdigit()
                    and len(after[0]) <= 2
                    and re.fullmatch(r"20\d{2}", after[1])
                ):
                    parsed = datetime(int(after[1]), MONTHS[word], int(after[0]), tzinfo=UTC)
                    break
            if parsed is None:
                relative = re.search(
                    r"\b(\d+|a|an|one|sehari|sebulan|setahun)\s*(days?|weeks?|months?|years?|hari|minggu|bulan|tahun)?\s+(ago|lalu|yang lalu)\b",
                    cleaned,
                )
                if relative:
                    amount_text, unit, _ = relative.groups()
                    amount = int(amount_text) if amount_text.isdigit() else 1
                    unit = unit or {"sehari": "hari", "sebulan": "bulan", "setahun": "tahun"}.get(
                        amount_text, ""
                    )
                    anchor = datetime.fromisoformat(fetched_at.replace("Z", "+00:00"))
                    if unit in {"month", "months", "bulan", "year", "years", "tahun"}:
                        parsed = calendar_window(
                            amount * (12 if unit in {"year", "years", "tahun"} else 1), anchor
                        )[0]
                    elif unit in {"day", "days", "hari", "week", "weeks", "minggu"}:
                        parsed = anchor - timedelta(
                            days=amount * (7 if unit in {"week", "weeks", "minggu"} else 1)
                        )
        if parsed is None:
            return None
        if proposed.date() == parsed.date() or (
            relative is not None and abs((proposed.date() - parsed.date()).days) <= 1
        ):
            return parsed.isoformat()
        return None
    except (ValueError, OverflowError):
        return None


def validate_evidence(
    item: ExtractedEvidence, source: Source, entity: Entity, markdown: str, run: dict[str, Any]
) -> Evidence | None:
    if item.entity_id != source.entity_id or item.source_id != source.id:
        return None
    if (
        not item.quote.strip()
        or item.quote not in markdown
        or not item.text.strip()
        or item.text not in markdown
    ):
        return None
    if any(not aspect.quote.strip() or aspect.quote not in item.text for aspect in item.aspects):
        return None
    if entity.parent_id and item.kind in CUSTOMER_KINDS:
        # A resort review cannot silently become an outlet review. The excerpt must name its unit.
        if normalize_name(entity.name) not in normalize_name(item.text):
            return None
    official_host = urlsplit(entity.website).hostname
    source_host = urlsplit(source.canonical_url or source.url).hostname
    owner = bool(
        official_host
        and source_host
        and official_host.removeprefix("www.") == source_host.removeprefix("www.")
    )
    kind: EvidenceKind = "owner_content" if owner else item.kind
    published_at = anchored_date(
        item.date_text, item.published_at, item.quote, markdown, source.fetched_at or run["end_at"]
    )
    in_window = False
    if published_at:
        published = datetime.fromisoformat(published_at)
        in_window = (
            datetime.fromisoformat(run["start_at"]) <= published <= datetime.fromisoformat(run["end_at"])
        )
    digest = evidence_hash(entity.id, item.text, published_at, item.rating)
    return Evidence(
        id=f"evidence-{digest[:24]}",
        entity_id=entity.id,
        source_id=source.id,
        url=source.canonical_url or source.url,
        platform=source.platform,
        kind=kind,
        published_at=published_at,
        date_text=item.date_text,
        text=item.text,
        quote=item.quote,
        sentiment="unclear" if owner else item.sentiment,
        aspects=[] if owner else item.aspects,
        rating=item.rating,
        content_hash=digest,
        in_window=in_window,
    )


@DBOS.step()
def extract_batch(
    run_id: str, batch_number: int, source_ids: list[str], label_prefix: str = "extract"
) -> dict[str, Any]:
    settings, store = runtime()
    run = store.get_run(run_id)
    sources = {row["id"]: Source.model_validate(row) for row in store.list_sources(run_id)}
    entities = {row["id"]: Entity.model_validate(row) for row in store.list_entities(run_id)}
    documents = []
    full_texts: dict[str, str] = {}
    for source_id in source_ids:
        source = sources[source_id]
        if source.status not in {"ok", "partial"} or not source.artifact_path:
            continue
        text = (store.run_dir(run_id) / source.artifact_path).read_text(encoding="utf-8")
        full_texts[source_id] = text
        documents.append(
            {
                "source": source.model_dump(),
                "entity": entities[source.entity_id].model_dump(),
                "markdown": text[: settings.max_source_chars],
            }
        )
    if not documents:
        return {"limitations": [], "accepted": 0, "rejected": 0}
    store.update_run(
        run_id, stage="sentiment", message=f"Memvalidasi bukti dan sentimen batch {batch_number + 1}"
    )
    prompt = (
        "Ekstrak semua teks ulasan/komentar pelanggan asli yang tersedia pada dokumen berikut, "
        "termasuk positif, negatif, netral dan campuran. Pisahkan owner_content/promosi/balasan pemilik, "
        "editorial dan ulasan pelanggan. Website resmi dan akun resmi bukan sentimen pelanggan kecuali "
        "ada komentar pelanggan yang jelas terpisah. text harus salinan verbatim satu ulasan lengkap; "
        "quote dan aspek.quote harus salinan verbatim substring text. Jangan parafrasa atau menggabungkan "
        "ulasan. published_at hanya dari tanggal yang benar-benar terkait ulasan, dan date_text salin "
        "penanda tanggal persis dari dokumen. Tanggal relatif dihitung dari fetched_at sumber; jangan "
        "menggunakan tanggal crawl sebagai tanggal publikasi. Jika tanpa tanggal/ambigu, published_at=null. "
        "Rating tetap string aslinya, jangan infer rating dari sentimen. Pisahkan aspek kamar, kebersihan, "
        "pelayanan, makanan, harga, fasilitas, spa, hiburan, lokasi sesuai bukti. Entitas outlet hanya bila "
        "review secara eksplisit menamakan outlet itu; jangan atribusikan review resort ke semua outlet. "
        "Termasuk bukti di luar periode untuk audit, backend yang menyaring statistik. "
        "Untuk owner_content cukup 1-3 kutipan identitas/fasilitas relevan, jangan salin seluruh navigasi. "
        f"Periode: {run['start_at']} sampai {run['end_at']}.\n" + json.dumps(documents, ensure_ascii=False)
    )
    label = f"{label_prefix}-{batch_number:03d}"
    result = ai_call(run_id, label, prompt, Extraction, search=False)
    accepted = rejected = 0
    for item in result.evidence:
        if item.source_id not in full_texts:
            rejected += 1
            continue
        source = sources[item.source_id]
        record = validate_evidence(item, source, entities[source.entity_id], full_texts[item.source_id], run)
        if record is None:
            rejected += 1
        else:
            accepted += int(store.save_evidence(run_id, record))
    limitations = list(result.limitations)
    if rejected:
        limitations.append(
            f"Batch {batch_number + 1}: {rejected} calon bukti ditolak karena kutipan/atribusi tidak dapat diverifikasi."
        )
    summary = {"limitations": limitations, "accepted": accepted, "rejected": rejected}
    dump_artifact(run_id, f"validation/{label}-batch.json", summary)
    return summary


@DBOS.step()
def finish_report(run_id: str, limitations: list[str], report_label: str = "report") -> None:
    settings, store = runtime()
    snapshot = store.read_snapshot(run_id)
    store.update_run(
        run_id, stage="report", message="Menyusun rekomendasi perbaiki/pertahankan dan perbandingan"
    )
    customer_rows = [
        row for row in snapshot["evidence"] if row["kind"] in CUSTOMER_KINDS and row["in_window"]
    ]
    if not customer_rows:
        limitations.append(
            "Belum ada opini pelanggan bertanggal yang tervalidasi dalam periode; tidak ada persentase sentimen atau kesimpulan kepuasan yang dapat dinyatakan."
        )
    for entity in snapshot["entities"]:
        if not any(row["entity_id"] == entity["id"] for row in customer_rows):
            limitations.append(
                f"{entity['name']}: belum ada sampel sentimen pelanggan bertanggal dalam periode."
            )
    coverage = snapshot["stats"]["coverage"]
    for status in ("blocked", "not_found", "failed", "partial", "limit"):
        if coverage[status]:
            limitations.append(
                f"Cakupan sumber {status}: {coverage[status]} halaman. Lihat tabel sumber untuk alasan dan URL."
            )
    # Bound reporting input without losing stored evidence or backend totals.
    rows = snapshot["evidence"]
    if len(rows) > 1000:
        limitations.append(
            "Input rekomendasi memakai maksimal 1.000 contoh bukti; seluruh bukti tetap tersimpan dan masuk agregasi backend."
        )
        grouped: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
        for row in rows:
            grouped[(row["entity_id"], row["sentiment"])].append(row)
        rows = []
        while any(grouped.values()) and len(rows) < 1000:
            for bucket in grouped.values():
                if bucket and len(rows) < 1000:
                    rows.append(bucket.pop(0))
    prompt = (
        "Buat laporan bisnis bahasa Indonesia dari bukti tervalidasi dan statistik backend berikut. "
        "Jangan membuat angka sendiri. Temukan kekuatan yang dipertahankan, kelemahan yang diperbaiki, "
        "prioritas dan langkah konkret per entitas. Setiap finding wajib evidence_ids yang nyata, "
        "dan hanya milik entity_id finding; improve/maintain harus didukung opini pelanggan in_window=true. "
        "Konteks owner_content/undated hanya boleh action=investigate, bukan klaim kepuasan pelanggan. "
        "Pisahkan ringkasan resort dan tiap outlet, hindari generalisasi ketika sampel kecil. "
        "Perbandingan competitor hanya comparator_for yang relevan, periode yang sama dan platform "
        "yang sama; wajib sekurangnya 5 bukti pelanggan in_window dari SETIAP entitas untuk setiap aspek. "
        "Satu comparison hanya boleh memuat satu kompetitor dan satu aspek spesifik (misalnya kamar, "
        "kebersihan, pelayanan, harga, fasilitas); jangan gabungkan beberapa aspek atau beberapa kompetitor. "
        "Isi entity_strengths, entity_weaknesses, competitor_strengths, dan competitor_weaknesses "
        "secara terpisah. Setiap butir harus didukung evidence_ids pada pasangan entitas tersebut; "
        "jika bukti suatu sisi tidak cukup, biarkan daftarnya kosong dan jelaskan pada limitations. "
        "Isi advantage dengan salah satu nilai entity, competitor, balanced, insufficient. Pilih entity atau "
        "competitor hanya bila bukti jelas mendukung keunggulan aspek pada sisi tersebut dan daftar strengths "
        "sisinya tidak kosong; balanced hanya bila kedua sisi punya keunggulan sebanding; selain itu pilih "
        "insufficient. Jangan memberi label pemenang umum di luar aspek yang dibandingkan. "
        "Jangan menyimpulkan pemenang umum dari satu aspek. Jika data belum sebanding jangan buat comparison, "
        "tulis keterbatasan. Rating kumulatif platform "
        "tidak boleh disebut skor 12 bulan. Sertakan ukuran sampel backend bila menyebut dominasi. "
        "Bukti teramati tidak mewakili semua tamu/semua internet. Rekomendasi harus berbeda dari promosi.\n"
        + json.dumps(
            {
                "run": snapshot["run"],
                "entities": snapshot["entities"],
                "stats": snapshot["stats"],
                "evidence": rows,
                "limitations": list(dict.fromkeys(limitations)),
            },
            ensure_ascii=False,
        )
    )
    try:
        report = ai_call(run_id, report_label, prompt, Report, search=False)
    except ResearchError as exc:
        if exc.code != "codex_call_limit":
            raise
        report = Report(
            summary="Bukti terkumpul tersedia; rekomendasi AI belum selesai karena batas pemanggilan.",
            findings=[],
            comparisons=[],
            limitations=[str(exc)],
        )
    evidence_by_id = {row["id"]: row for row in snapshot["evidence"]}
    entity_by_id = {row["id"]: row for row in snapshot["entities"]}
    valid_findings = []
    for finding in report.findings:
        refs = [evidence_by_id.get(item_id) for item_id in finding.evidence_ids]
        if not refs or any(row is None or row["entity_id"] != finding.entity_id for row in refs):
            continue
        if finding.action in {"improve", "maintain"} and not any(
            row and row["kind"] in CUSTOMER_KINDS and row["in_window"] for row in refs
        ):
            continue
        valid_findings.append(finding)
    valid_comparisons = []
    for comparison in report.comparisons:
        refs = [evidence_by_id.get(item_id) for item_id in comparison.evidence_ids]
        pair = {comparison.entity_id, comparison.competitor_id}
        competitor = entity_by_id.get(comparison.competitor_id, {})
        if (
            comparison.entity_id not in competitor.get("comparator_for", [])
            or not refs
            or any(
                row is None
                or row["entity_id"] not in pair
                or row["kind"] not in CUSTOMER_KINDS
                or not row["in_window"]
                for row in refs
            )
        ):
            continue
        refs_a = [row for row in refs if row and row["entity_id"] == comparison.entity_id]
        refs_b = [row for row in refs if row and row["entity_id"] == comparison.competitor_id]
        platforms_a = {row["platform"] for row in refs_a}
        platforms_b = {row["platform"] for row in refs_b}
        if not platforms_a.intersection(platforms_b):
            continue
        if min(len(refs_a), len(refs_b)) < 5:
            continue
        if comparison.advantage == "entity" and not comparison.entity_strengths:
            comparison = comparison.model_copy(update={"advantage": "insufficient"})
        elif comparison.advantage == "competitor" and not comparison.competitor_strengths:
            comparison = comparison.model_copy(update={"advantage": "insufficient"})
        elif comparison.advantage == "balanced" and not (
            comparison.entity_strengths and comparison.competitor_strengths
        ):
            comparison = comparison.model_copy(update={"advantage": "insufficient"})
        valid_comparisons.append(comparison)
    report.findings, report.comparisons = valid_findings, valid_comparisons
    # The model's batch limitations can describe an earlier snapshot. Keep final
    # caveats grounded in the completed backend snapshot and source statuses.
    final_limitations: list[str] = []
    if len(customer_rows) < 5:
        final_limitations.append(
            f"Sampel pelanggan dalam periode hanya {len(customer_rows)}; belum cukup untuk menyimpulkan pola kepuasan umum."
        )
    if not valid_comparisons:
        final_limitations.append(
            "Tidak ada perbandingan kompetitor yang memenuhi syarat bukti bertanggal, platform yang sama, dan aspek sejenis."
        )
    for entity in snapshot["entities"]:
        count = sum(row["entity_id"] == entity["id"] for row in customer_rows)
        if not count:
            final_limitations.append(
                f"{entity['name']}: tidak ada sampel sentimen pelanggan bertanggal dalam periode."
            )
        elif count < 5:
            final_limitations.append(
                f"{entity['name']}: sampel hanya {count}; belum cukup untuk kesimpulan umum."
            )
    for status in ("blocked", "not_found", "failed", "partial", "limit"):
        if coverage[status]:
            final_limitations.append(
                f"Cakupan sumber {status}: {coverage[status]} halaman. Lihat tabel sumber untuk alasan dan URL."
            )
    final_limitations.extend(
        [
            "Periode analisis adalah 12 bulan kalender berjalan; tanggal relatif memakai waktu pengambilan sebagai jangkar dan ketelitiannya terbatas.",
            "Hanya sumber publik yang dapat diakses; login, CAPTCHA, dan robots tidak dilewati. Promosi pemilik dan bukti tanpa tanggal tidak masuk statistik sentimen.",
        ]
    )
    report.limitations = list(dict.fromkeys(final_limitations))
    store.set_report(run_id, report)
    partial = bool(
        not customer_rows
        or any(coverage[status] for status in ("blocked", "failed", "partial", "limit", "not_found"))
    )
    store.update_run(
        run_id,
        status="partial" if partial else "completed",
        stage="completed",
        message="Laporan tersedia; cakupan sumber parsial" if partial else "Riset dan laporan selesai",
    )
    dump_artifact(run_id, "report.json", report.model_dump())


@DBOS.step()
def mark_failure(run_id: str, code: str, message: str) -> None:
    _, store = runtime()
    store.update_run(run_id, status="failed", stage="failed", error=f"{code}: {message}", message=message)


@DBOS.workflow(name="crawlai-business-research-v1")
def research_workflow(run_id: str) -> None:
    try:
        context = bootstrap(run_id)
        discovered = discover(run_id, context)
        collected = [context["official"]]
        for source_id in discovered["source_ids"]:
            collected.append(crawl_page(run_id, source_id))
        settings, _ = runtime()
        ids = [row["id"] for row in collected if row["status"] in {"ok", "partial"} and row["artifact_path"]]
        limitations = list(discovered["limitations"])
        for offset in range(0, len(ids), settings.codex_batch_size):
            try:
                result = extract_batch(
                    run_id,
                    offset // settings.codex_batch_size,
                    ids[offset : offset + settings.codex_batch_size],
                )
                limitations.extend(result["limitations"])
            except ResearchError as exc:
                if exc.code != "codex_call_limit":
                    raise
                limitations.append(str(exc))
                break
        finish_report(run_id, limitations)
    except ResearchError as exc:
        mark_failure(run_id, exc.code, str(exc))
    except Exception as exc:
        mark_failure(run_id, "pipeline_error", f"{type(exc).__name__}: {exc}")


@DBOS.step()
def collect_supplement_source(supplement_id: str, index: int) -> dict[str, Any]:
    settings, store = runtime()
    job = store.get_supplement(supplement_id)
    item = job["sources"][index]
    source_id = f"supp-{supplement_id.replace('-', '')[:16]}-{index:02d}"
    source = Source(
        id=source_id,
        entity_id=item["entity_id"],
        url=item["url"],
        platform=urlsplit(item["url"]).hostname or "Sumber publik",
    )
    existing = next((row for row in store.list_sources(job["run_id"]) if row["id"] == source_id), None)
    if existing and existing["status"] != "pending":
        return existing
    store.save_source(job["run_id"], source)
    store.update_supplement(
        supplement_id,
        status="running",
        stage="collection",
        message=f"Mengambil sumber {index + 1} dari {len(job['sources'])}",
    )
    captured = asyncio.run(collect_source(settings, source, store.run_dir(job["run_id"])))
    store.save_source(job["run_id"], captured)
    run = store.get_run(job["run_id"])
    store.update_run(job["run_id"], pages_fetched=run["pages_fetched"] + 1)
    return captured.model_dump()


@DBOS.workflow(name="crawlai-business-supplement-v1")
def supplement_workflow(supplement_id: str) -> None:
    _, store = runtime()
    job = store.get_supplement(supplement_id)
    try:
        store.update_supplement(
            supplement_id, status="running", stage="collection", message="Memulai crawl sumber publik terarah"
        )
        collected = [collect_supplement_source(supplement_id, index) for index in range(len(job["sources"]))]
        run_id = job["run_id"]
        settings, _ = runtime()
        source_ids = [
            row["id"] for row in collected if row["status"] in {"ok", "partial"} and row["artifact_path"]
        ]
        limitations: list[str] = []
        for offset in range(0, len(source_ids), settings.codex_batch_size):
            try:
                result = extract_batch(
                    run_id,
                    offset // settings.codex_batch_size,
                    source_ids[offset : offset + settings.codex_batch_size],
                    f"supp-{supplement_id[:12]}",
                )
                limitations.extend(result["limitations"])
            except ResearchError as exc:
                if exc.code != "codex_call_limit":
                    raise
                limitations.append(str(exc))
                break
        store.update_supplement(
            supplement_id, stage="report", message="Memperbarui analisis dari bukti tersimpan"
        )
        finish_report(run_id, limitations, f"report-supp-{supplement_id[:12]}")
        partial = any(row["status"] != "ok" for row in collected)
        store.update_supplement(
            supplement_id,
            status="partial" if partial else "completed",
            stage="completed",
            message="Crawl selesai dengan sumber parsial" if partial else "Crawl dan analisis selesai",
        )
    except ResearchError as exc:
        store.update_supplement(
            supplement_id, status="failed", stage="failed", error=str(exc), message=str(exc)
        )
    except Exception as exc:
        store.update_supplement(
            supplement_id,
            status="failed",
            stage="failed",
            error=f"{type(exc).__name__}: {exc}",
            message="Crawl tambahan gagal",
        )


def init_pipeline(settings: Settings, store: Store) -> None:
    global _settings, _store, _queue
    if _queue is not None:
        return
    _settings, _store = settings, store
    DBOS(
        config={
            "name": "crawlai-business-research",
            "application_version": "0.1.0",
            "system_database_url": f"sqlite:///{(settings.data_dir / 'workflows.sqlite').as_posix()}",
            "enable_otlp": False,
            "max_executor_threads": 4,
            "log_level": "WARNING",
        }
    )
    DBOS.launch()
    _queue = DBOS.register_queue("business-research", global_concurrency=1, worker_concurrency=1)


def start_research(run_id: str) -> str:
    _, store = runtime()
    if _queue is None:
        raise RuntimeError("Pipeline queue belum tersedia")
    workflow_id = f"research-{run_id}"
    store.update_run(run_id, workflow_id=workflow_id)
    with SetWorkflowID(workflow_id):
        handle = _queue.enqueue(research_workflow, run_id)
    return handle.workflow_id


def start_supplement(supplement_id: str) -> str:
    _, store = runtime()
    if _queue is None:
        raise RuntimeError("Pipeline belum siap")
    workflow_id = f"supplement-{supplement_id}"
    store.update_supplement(supplement_id, workflow_id=workflow_id)
    with SetWorkflowID(workflow_id):
        handle = _queue.enqueue(supplement_workflow, supplement_id)
    return handle.workflow_id


def stop_pipeline() -> None:
    global _queue
    if _queue is not None:
        DBOS.destroy(workflow_completion_timeout_sec=0)
        _queue = None
