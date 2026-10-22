"""Check a running dashboard and a genuine persisted research job."""

import argparse
import json
import sqlite3
from pathlib import Path
from urllib.parse import urlencode, urlsplit
from urllib.request import ProxyHandler, build_opener
from uuid import UUID

from app.config import get_settings


def check(base_url: str, job_id: str | None, data_dir: Path) -> None:
    parsed = urlsplit(base_url)
    if parsed.scheme != "http" or parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
        raise ValueError("Smoke checks require the local HTTP dashboard")
    opener = build_opener(ProxyHandler({}))
    base_url = base_url.rstrip("/")

    def fetch(path: str) -> tuple[bytes, str]:
        with opener.open(base_url + path, timeout=30) as response:
            assert response.status == 200, (path, response.status)
            assert urlsplit(response.url).hostname == parsed.hostname, "Unexpected redirect"
            return response.read(), response.headers.get("Content-Type", "")

    def get_json(path: str):
        body, content_type = fetch(path)
        assert "application/json" in content_type, (path, content_type)
        return json.loads(body)

    for path in ("/health", "/health/ready"):
        payload = get_json(path)
        assert isinstance(payload, dict) and payload, path
    body, content_type = fetch("/")
    assert "text/html" in content_type and b"<html" in body.lower(), "Dashboard HTML missing"
    jobs = get_json("/api/research")["items"]
    if job_id is None:
        job_id = next((item["id"] for item in jobs if item["status"] in {"completed", "partial"}), None)
    assert job_id is not None, "A real research job with a saved report is required"
    UUID(job_id)
    run = get_json(f"/api/research/{job_id}")
    assert run["status"] in {"completed", "partial"}, run["status"]
    assert run["period_months"] == 12, "Acceptance run must cover 12 calendar months"
    assert any(item["id"] == job_id for item in jobs), "Job missing from persisted listing"
    for child in ("entities", "sources", "evidence"):
        rows = get_json(f"/api/research/{job_id}/{child}")["items"]
        assert isinstance(rows, list) and rows, f"Real {child} missing"
    report = get_json(f"/api/research/{job_id}/report")
    assert isinstance(report["summary"], str) and report["summary"], "Saved report missing"
    for extension, expected_type in (
        ("html", "text/html"),
        ("csv", "text/csv"),
        ("json", "application/json"),
    ):
        output, output_type = fetch(f"/api/research/{job_id}/export?{urlencode({'format': extension})}")
        assert output and expected_type in output_type, (extension, output_type)
        if extension == "json":
            assert isinstance(json.loads(output), dict), "Invalid JSON export"
    database = data_dir / "research.sqlite"
    assert database.is_file(), "Research database missing"
    with sqlite3.connect(database.as_uri() + "?mode=ro", uri=True) as connection:
        row = connection.execute(
            "SELECT status,start_at,end_at,report_json FROM runs WHERE id=?", (job_id,)
        ).fetchone()
    assert row and row[0] in {"completed", "partial"} and row[3], "Research report was not persisted"
    assert row[1:3] == (run["start_at"], run["end_at"]), "Frozen period differs from persisted run"
    print(
        f"PASS live dashboard, health/readiness, 12-month {run['status']} job {job_id}, evidence and HTML/CSV/JSON exports"
    )


def main() -> None:
    settings = get_settings()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default=f"http://{settings.host}:{settings.port}")
    parser.add_argument("--job-id")
    parser.add_argument("--data-dir", type=Path, default=settings.data_dir)
    args = parser.parse_args()
    check(args.base_url, args.job_id, args.data_dir.resolve())


if __name__ == "__main__":
    main()
