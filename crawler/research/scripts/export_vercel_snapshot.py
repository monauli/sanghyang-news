import json
from collections.abc import Callable
from pathlib import Path
from typing import Any


def build_snapshot(store: Any) -> dict[str, Any]:
    runs = [
        run
        for run in store.list_runs()
        if run.get("status") in {"completed", "partial"} and isinstance(run.get("report"), dict)
    ]
    if not runs:
        raise ValueError("Tidak ada laporan riset completed/partial yang dapat diekspor")
    run = max(runs, key=lambda item: item.get("updated_at") or item.get("created_at") or "")
    snapshot = store.read_snapshot(run["id"])
    snapshot["run"].pop("request", None)
    snapshot["run"].pop("workflow_id", None)
    snapshot["run"].pop("error", None)
    for source in snapshot["sources"]:
        source.pop("artifact_path", None)
    return snapshot


def write_snapshot(
    store: Any,
    output: Path,
    render_html: Callable[[dict[str, Any], str | None], str],
) -> dict[str, Any]:
    snapshot = build_snapshot(store)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    report_dir = output.parent / "reports"
    report_dir.mkdir(parents=True, exist_ok=True)
    portfolio = render_html(snapshot, None)
    if not portfolio:
        raise ValueError("Laporan portofolio kosong")
    (report_dir / "portfolio.html").write_text(portfolio, encoding="utf-8")
    for entity in snapshot["entities"]:
        entity_id = entity["id"]
        if (
            not isinstance(entity_id, str)
            or not entity_id.isascii()
            or not entity_id.replace("-", "").isalnum()
        ):
            raise ValueError("ID unit tidak aman untuk nama berkas laporan")
        (report_dir / f"{entity_id}.html").write_text(render_html(snapshot, entity_id), encoding="utf-8")
    return snapshot


def main() -> None:
    from app.config import get_settings
    from app.main import export_html
    from app.storage import Store

    output = Path(__file__).resolve().parents[1] / "deploy" / "snapshot.json"
    snapshot = write_snapshot(Store(get_settings()), output, export_html)
    print(
        f"Snapshot {snapshot['run']['id']} diekspor: {len(snapshot['entities'])} entitas, {len(snapshot['evidence'])} bukti."
    )


if __name__ == "__main__":
    main()
