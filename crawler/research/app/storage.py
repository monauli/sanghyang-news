import hashlib
import json
import sqlite3
from collections import Counter
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from app.config import Settings
from app.models import Entity, Evidence, Report, ResearchRequest, ResearchSupplement, Source, calendar_window

CUSTOMER_KINDS = {"customer_review", "customer_comment"}
LABELS = ("positive", "negative", "neutral", "mixed", "unclear")


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


class Store:
    def __init__(self, settings: Settings):
        self.settings = settings
        settings.data_dir.mkdir(parents=True, exist_ok=True)
        self.path = settings.data_dir / "research.sqlite"
        with self.connection() as db:
            db.executescript("""
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS runs (
                    id TEXT PRIMARY KEY, url TEXT NOT NULL, period_months INTEGER NOT NULL,
                    request_json TEXT NOT NULL, start_at TEXT NOT NULL, end_at TEXT NOT NULL,
                    status TEXT NOT NULL, stage TEXT NOT NULL, message TEXT NOT NULL DEFAULT '',
                    error TEXT, workflow_id TEXT, codex_calls INTEGER NOT NULL DEFAULT 0,
                    pages_fetched INTEGER NOT NULL DEFAULT 0, report_json TEXT,
                    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
                    version INTEGER NOT NULL DEFAULT 1
                );
                CREATE TABLE IF NOT EXISTS entities (
                    run_id TEXT NOT NULL REFERENCES runs(id), id TEXT NOT NULL,
                    payload TEXT NOT NULL, PRIMARY KEY (run_id,id)
                );
                CREATE TABLE IF NOT EXISTS sources (
                    run_id TEXT NOT NULL REFERENCES runs(id), id TEXT NOT NULL,
                    payload TEXT NOT NULL, PRIMARY KEY (run_id,id)
                );
                CREATE TABLE IF NOT EXISTS evidence (
                    run_id TEXT NOT NULL REFERENCES runs(id), id TEXT NOT NULL,
                    content_hash TEXT NOT NULL, payload TEXT NOT NULL,
                    PRIMARY KEY (run_id,id), UNIQUE(run_id,content_hash)
                );
                CREATE TABLE IF NOT EXISTS supplements (
                    id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id),
                    request_json TEXT NOT NULL, status TEXT NOT NULL, stage TEXT NOT NULL,
                    message TEXT NOT NULL DEFAULT '', error TEXT, workflow_id TEXT,
                    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
                );
                CREATE UNIQUE INDEX IF NOT EXISTS one_active_run_per_url ON runs(url)
                WHERE status IN ('queued','running');
                CREATE UNIQUE INDEX IF NOT EXISTS one_active_supplement_per_run ON supplements(run_id)
                WHERE status IN ('queued','running');
            """)

    @contextmanager
    def connection(self):
        db = sqlite3.connect(self.path, timeout=10)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys=ON")
        try:
            with db:
                yield db
        finally:
            db.close()

    def create_run(self, request: ResearchRequest) -> dict[str, Any]:
        start, end = calendar_window(request.period_months)
        run_id, now = str(uuid4()), utc_now()
        with self.connection() as db:
            db.execute(
                """INSERT INTO runs(id,url,period_months,request_json,start_at,end_at,status,stage,
                created_at,updated_at) VALUES(?,?,?,?,?,?,'queued','queued',?,?)""",
                (
                    run_id,
                    request.url,
                    request.period_months,
                    request.model_dump_json(),
                    start.isoformat(),
                    end.isoformat(),
                    now,
                    now,
                ),
            )
        return self.get_run(run_id)

    def get_run(self, run_id: str) -> dict[str, Any]:
        with self.connection() as db:
            row = db.execute("SELECT * FROM runs WHERE id=?", (run_id,)).fetchone()
        if row is None:
            raise KeyError(run_id)
        result = dict(row)
        result["request"] = json.loads(result.pop("request_json"))
        result["report"] = json.loads(result["report_json"]) if result["report_json"] else None
        result.pop("report_json")
        return result

    def list_runs(self) -> list[dict[str, Any]]:
        with self.connection() as db:
            ids = [row["id"] for row in db.execute("SELECT id FROM runs ORDER BY created_at DESC LIMIT 100")]
        return [self.get_run(run_id) for run_id in ids]

    def create_supplement(self, run_id: str, request: ResearchSupplement) -> dict[str, Any]:
        self.get_run(run_id)
        supplement_id, now = str(uuid4()), utc_now()
        with self.connection() as db:
            db.execute(
                """INSERT INTO supplements(id,run_id,request_json,status,stage,message,created_at,updated_at)
                VALUES(?,?,?,'queued','queued','Menunggu Crawl4AI',?,?)""",
                (supplement_id, run_id, request.model_dump_json(), now, now),
            )
        return self.get_supplement(supplement_id)

    def get_supplement(self, supplement_id: str) -> dict[str, Any]:
        with self.connection() as db:
            row = db.execute("SELECT * FROM supplements WHERE id=?", (supplement_id,)).fetchone()
        if row is None:
            raise KeyError(supplement_id)
        result = dict(row)
        result["request"] = json.loads(result.pop("request_json"))
        result["entity_ids"] = result["request"]["entity_ids"]
        result["sources"] = result["request"]["sources"]
        result.pop("request")
        return result

    def list_supplements(self, run_id: str) -> list[dict[str, Any]]:
        self.get_run(run_id)
        with self.connection() as db:
            ids = [
                row["id"]
                for row in db.execute(
                    "SELECT id FROM supplements WHERE run_id=? ORDER BY created_at DESC", (run_id,)
                )
            ]
        return [self.get_supplement(supplement_id) for supplement_id in ids]

    def update_supplement(self, supplement_id: str, **changes: Any) -> None:
        allowed = {"status", "stage", "message", "error", "workflow_id"}
        if not changes or not set(changes) <= allowed:
            raise ValueError("Unsupported supplement update")
        changes["updated_at"] = utc_now()
        names = list(changes)
        assignments = ",".join(f"{name}=?" for name in names)
        with self.connection() as db:
            cursor = db.execute(
                f"UPDATE supplements SET {assignments} WHERE id=?",  # nosec B608
                (*[changes[name] for name in names], supplement_id),
            )
            if not cursor.rowcount:
                raise KeyError(supplement_id)

    def update_run(self, run_id: str, **changes: Any) -> None:
        allowed = {
            "status",
            "stage",
            "message",
            "error",
            "codex_calls",
            "pages_fetched",
            "workflow_id",
            "report_json",
        }
        if not changes or not set(changes) <= allowed:
            raise ValueError("Unsupported run update")
        changes["updated_at"] = utc_now()
        names = list(changes)
        assignments = ",".join(f"{name}=?" for name in names)
        with self.connection() as db:
            cursor = db.execute(
                f"UPDATE runs SET {assignments},version=version+1 WHERE id=?",  # nosec B608
                (*[changes[name] for name in names], run_id),
            )
            if not cursor.rowcount:
                raise KeyError(run_id)

    def reserve_codex_call(self, run_id: str) -> int:
        with self.connection() as db:
            row = db.execute(
                """UPDATE runs SET codex_calls=codex_calls+1,version=version+1,updated_at=?
                WHERE id=? AND codex_calls<? RETURNING codex_calls""",
                (utc_now(), run_id, self.settings.max_codex_calls),
            ).fetchone()
        if row is None:
            raise RuntimeError("Batas pemanggilan Codex tercapai")
        return int(row["codex_calls"])

    def save_entity(self, run_id: str, entity: Entity) -> None:
        self._save_payload("entities", run_id, entity.id, entity.model_dump_json())

    def save_source(self, run_id: str, source: Source) -> None:
        self._save_payload("sources", run_id, source.id, source.model_dump_json())

    def _save_payload(self, table: str, run_id: str, item_id: str, payload: str) -> None:
        if table not in {"entities", "sources"}:
            raise ValueError("Unsupported table")
        with self.connection() as db:
            db.execute(
                f"INSERT INTO {table}(run_id,id,payload) VALUES(?,?,?) "  # nosec B608
                "ON CONFLICT(run_id,id) DO UPDATE SET payload=excluded.payload",
                (run_id, item_id, payload),
            )

    def save_evidence(self, run_id: str, item: Evidence) -> bool:
        run = self.get_run(run_id)
        published = (
            datetime.fromisoformat(item.published_at.replace("Z", "+00:00")) if item.published_at else None
        )
        if published is not None and published.tzinfo is None:
            raise ValueError("Evidence date must include a timezone")
        item.in_window = bool(
            published
            and datetime.fromisoformat(run["start_at"]) <= published <= datetime.fromisoformat(run["end_at"])
        )
        with self.connection() as db:
            cursor = db.execute(
                "INSERT INTO evidence(run_id,id,content_hash,payload) VALUES(?,?,?,?) "
                "ON CONFLICT(run_id,content_hash) DO NOTHING",
                (run_id, item.id, item.content_hash, item.model_dump_json()),
            )
        return bool(cursor.rowcount)

    def _list(self, table: str, run_id: str) -> list[dict[str, Any]]:
        if table not in {"entities", "sources", "evidence"}:
            raise ValueError("Unsupported table")
        with self.connection() as db:
            return [
                json.loads(row["payload"])
                for row in db.execute(
                    f"SELECT payload FROM {table} WHERE run_id=? ORDER BY rowid",  # nosec B608
                    (run_id,),
                )
            ]

    def list_entities(self, run_id: str) -> list[dict[str, Any]]:
        return self._list("entities", run_id)

    def list_sources(self, run_id: str) -> list[dict[str, Any]]:
        return self._list("sources", run_id)

    def list_evidence(self, run_id: str) -> list[dict[str, Any]]:
        return self._list("evidence", run_id)

    def set_report(self, run_id: str, report: Report) -> None:
        ids = {item["id"] for item in self.list_evidence(run_id)}
        entities = {item["id"] for item in self.list_entities(run_id)}
        for finding in report.findings:
            if (
                finding.entity_id not in entities
                or not finding.evidence_ids
                or not set(finding.evidence_ids) <= ids
            ):
                raise ValueError("Rekomendasi tidak memiliki bukti/entitas yang valid")
        for comparison in report.comparisons:
            if comparison.entity_id not in entities or comparison.competitor_id not in entities:
                raise ValueError("Entitas pembanding tidak valid")
            if not comparison.evidence_ids or not set(comparison.evidence_ids) <= ids:
                raise ValueError("Perbandingan tidak memiliki bukti yang valid")
        self.update_run(run_id, report_json=report.model_dump_json())

    def run_dir(self, run_id: str) -> Path:
        self.get_run(run_id)
        path = self.settings.data_dir / "runs" / run_id
        path.mkdir(parents=True, exist_ok=True)
        return path

    def read_snapshot(self, run_id: str) -> dict[str, Any]:
        return {
            "run": self.get_run(run_id),
            "entities": self.list_entities(run_id),
            "sources": self.list_sources(run_id),
            "evidence": self.list_evidence(run_id),
            "stats": self.stats(run_id),
        }

    def stats(self, run_id: str) -> dict[str, Any]:
        entities = self.list_entities(run_id)
        entity_by_id = {entity["id"]: entity for entity in entities}
        evidence = self.list_evidence(run_id)
        # ponytail: bounded local dataset scanned in memory; SQL aggregation if crawl limits grow substantially.
        customers = [item for item in evidence if item["kind"] in CUSTOMER_KINDS]
        in_window = [item for item in customers if item["in_window"]]
        own = [item for item in in_window if not entity_by_id.get(item["entity_id"], {}).get("is_competitor")]
        counts = Counter(item["sentiment"] for item in own)
        status_counts = Counter(source["status"] for source in self.list_sources(run_id))
        entity_stats = []
        for entity in entities:
            rows = [item for item in in_window if item["entity_id"] == entity["id"]]
            labels = Counter(item["sentiment"] for item in rows)
            entity_stats.append(
                {
                    "entity_id": entity["id"],
                    "name": entity["name"],
                    "is_competitor": entity["is_competitor"],
                    "total": len(rows),
                    **{label: labels[label] for label in LABELS},
                }
            )
        platforms = []
        for platform in sorted({item["platform"] for item in own}):
            rows = [item for item in own if item["platform"] == platform]
            labels = Counter(item["sentiment"] for item in rows)
            platforms.append(
                {"platform": platform, "total": len(rows), **{label: labels[label] for label in LABELS}}
            )
        weeks: dict[str, Counter] = {}
        for item in own:
            if item["published_at"]:
                day = datetime.fromisoformat(item["published_at"].replace("Z", "+00:00"))
                year, week, _ = day.isocalendar()
                key = f"{year}-W{week:02d}"
                weeks.setdefault(key, Counter())[item["sentiment"]] += 1
        return {
            "total_evidence": len(evidence),
            "customer_evidence": len(customers),
            "in_window_customer_evidence": len(own),
            "competitor_customer_evidence": len(in_window) - len(own),
            "classified_evidence": sum(counts[label] for label in LABELS if label != "unclear"),
            "sentiments": {label: counts[label] for label in LABELS},
            "entities": entity_stats,
            "platforms": platforms,
            "coverage": {
                "total": sum(status_counts.values()),
                **{
                    status: status_counts[status]
                    for status in (
                        "ok",
                        "partial",
                        "blocked",
                        "not_found",
                        "failed",
                        "unsupported",
                        "pending",
                        "limit",
                    )
                },
            },
            "by_week": [
                {"week": week, "total": sum(labels.values()), **{label: labels[label] for label in LABELS}}
                for week, labels in sorted(weeks.items())
            ],
            "deduplicated_group": True,
        }


def evidence_hash(entity_id: str, text: str, date: str | None, rating: str | None) -> str:
    normalized = " ".join(text.casefold().split())
    return hashlib.sha256(
        json.dumps([entity_id, normalized, date, rating], ensure_ascii=False).encode()
    ).hexdigest()
