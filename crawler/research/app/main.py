import csv
import html
import io
import json
import shutil
import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.collector import validate_public_url
from app.config import get_settings
from app.models import ResearchRequest, ResearchSupplement
from app.pipeline import init_pipeline, start_research, start_supplement, stop_pipeline
from app.storage import Store

STATIC = Path(__file__).resolve().parent / "static"


def csv_cell(value: object) -> str:
    text = str(value) if value is not None else ""
    return "'" + text if text.lstrip().startswith(("=", "+", "-", "@", "\t", "\r", "\n")) else text


def export_html(snapshot: dict, entity_id: str | None = None) -> str:
    run, report, stats = snapshot["run"], snapshot["run"]["report"], snapshot["stats"]
    names = {entity["id"]: entity["name"] for entity in snapshot["entities"]}
    target_name = names.get(entity_id, "") if entity_id else ""
    evidence_by_id = {item["id"]: item for item in snapshot["evidence"]}
    customer_counts = {
        eid: sum(
            item["entity_id"] == eid and item["kind"].startswith("customer_") and item["in_window"]
            for item in snapshot["evidence"]
        )
        for eid in names
    }

    def escape(value: object) -> str:
        return html.escape(str(value), quote=True)

    title_text = f"Laporan riset bisnis — {target_name}" if target_name else "Laporan riset bisnis"
    in_window_cust = (
        stats["in_window_customer_evidence"] if not entity_id else customer_counts.get(entity_id, 0)
    )

    # Filtered customer evidence for metric cards
    filtered_evidence = [
        item
        for item in snapshot["evidence"]
        if (not entity_id or item["entity_id"] == entity_id)
        and item["kind"].startswith("customer_")
        and item["in_window"]
    ]
    total_cust = len(filtered_evidence)
    pos_cust = sum(1 for item in filtered_evidence if item["sentiment"] == "positive")
    neg_cust = sum(1 for item in filtered_evidence if item["sentiment"] == "negative")
    other_cust = total_cust - pos_cust - neg_cust
    pos_pct = round(pos_cust / total_cust * 100) if total_cust else 0
    neg_pct = round(neg_cust / total_cust * 100) if total_cust else 0
    other_pct = round(other_cust / total_cust * 100) if total_cust else 0

    parts = [
        "<!doctype html><html lang='id'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'>",
        f"<title>{escape(title_text)}</title>",
        "<style>",
        ":root {",
        "  --bg-page: #090d16; --bg-card: #0f172a; --bg-subtle: #1e293b; --border: #334155;",
        "  --text-main: #f8fafc; --text-muted: #94a3b8; --accent: #d9f755; --accent-glow: rgba(217, 247, 85, 0.25);",
        "  --cyan: #38bdf8; --green: #22c55e; --red: #ef4444; --amber: #f59e0b;",
        "}",
        "* { box-sizing: border-box; }",
        "body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: var(--bg-page); color: var(--text-main); margin: 0; padding: 24px 16px; line-height: 1.5; -webkit-font-smoothing: antialiased; }",
        ".report-container { max-width: 1060px; margin: 0 auto; background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; padding: 28px 32px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); }",
        ".report-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--border); padding-bottom: 18px; margin-bottom: 18px; gap: 16px; }",
        ".brand-group { display: flex; align-items: center; gap: 12px; }",
        ".logo-badge { background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; font-weight: 800; font-size: 15px; width: 40px; height: 40px; border-radius: 9px; display: flex; align-items: center; justify-content: center; }",
        ".report-header h1 { margin: 0 0 3px 0; font-size: 22px; font-weight: 800; color: #fff; letter-spacing: -0.01em; }",
        ".unit-badge { display: inline-block; background: rgba(217, 247, 85, 0.15); color: var(--accent); border: 1px solid rgba(217, 247, 85, 0.35); font-weight: 700; font-size: 12.5px; padding: 2px 10px; border-radius: 6px; margin-top: 3px; }",
        ".print-btn { background: var(--accent); color: #090d16; border: none; padding: 8px 16px; border-radius: 7px; font-weight: 700; font-size: 13px; cursor: pointer; box-shadow: 0 2px 10px var(--accent-glow); transition: all 0.15s ease; }",
        ".print-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 14px var(--accent-glow); }",
        ".meta-box { background: rgba(30, 41, 59, 0.65); border-left: 4px solid var(--cyan); padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 12.5px; color: var(--text-muted); margin-bottom: 20px; line-height: 1.6; }",
        ".meta-box strong { color: #f1f5f9; }",
        ".metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }",
        ".metric-card { background: rgba(30, 41, 59, 0.5); border: 1px solid var(--border); border-radius: 8px; padding: 12px 14px; text-align: center; }",
        ".metric-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.04em; margin-bottom: 2px; }",
        ".metric-value { font-size: 24px; font-weight: 800; color: #fff; line-height: 1.2; }",
        ".metric-value.positive { color: var(--green); }",
        ".metric-value.negative { color: var(--red); }",
        ".metric-sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; }",
        ".section-title { font-size: 15px; font-weight: 800; color: #fff; border-bottom: 1px solid var(--border); padding-bottom: 6px; margin: 20px 0 12px 0; }",
        ".exec-summary { background: rgba(15, 23, 42, 0.8); border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; margin-bottom: 18px; font-size: 13px; color: #cbd5e1; }",
        ".findings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; }",
        ".finding-box { background: rgba(30, 41, 59, 0.5); border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; }",
        ".finding-box.maintain { border-top: 3px solid var(--green); }",
        ".finding-box.improve { border-top: 3px solid var(--red); }",
        ".finding-box h3 { font-size: 13.5px; font-weight: 700; margin: 0 0 6px 0; color: #fff; }",
        ".finding-box p { font-size: 12px; color: #cbd5e1; margin: 4px 0 6px 0; }",
        ".finding-box ol { font-size: 11.5px; color: #94a3b8; padding-left: 18px; margin: 6px 0; }",
        ".finding-box li { margin-bottom: 3px; }",
        ".comp-card { background: rgba(30, 41, 59, 0.5); border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; }",
        ".comp-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }",
        ".comp-header h3 { margin: 0; font-size: 13.5px; color: #fff; }",
        ".badge-adv { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; }",
        ".badge-adv.entity { background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.4); }",
        ".badge-adv.competitor { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }",
        ".badge-adv.balanced { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); }",
        "table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; margin-bottom: 16px; }",
        "th, td { padding: 8px 10px; border-bottom: 1px solid var(--border); text-align: left; }",
        "th { background: rgba(30, 41, 59, 0.8); font-weight: 700; color: #cbd5e1; }",
        ".evidence-card { background: rgba(30, 41, 59, 0.4); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; margin-bottom: 10px; font-size: 12px; }",
        ".evidence-card h3 { margin: 0 0 4px 0; font-size: 13px; color: #fff; }",
        ".evidence-card blockquote { margin: 4px 0 6px 0; padding: 4px 10px; border-left: 3px solid var(--cyan); background: rgba(56, 189, 248, 0.08); color: #e2e8f0; font-style: italic; }",
        "a { color: var(--cyan); text-decoration: none; }",
        "a:hover { text-decoration: underline; }",
        ".report-footer { font-size: 11.5px; color: #64748b; text-align: center; margin-top: 24px; padding-top: 14px; border-top: 1px solid var(--border); }",
        "@media print {",
        "  body { background: #fff !important; color: #0f172a !important; padding: 0 !important; }",
        "  .report-container { background: #fff !important; border: none !important; box-shadow: none !important; padding: 0 !important; max-width: 100% !important; }",
        "  .print-btn { display: none !important; }",
        "  .report-header h1 { color: #0f172a !important; }",
        "  .logo-badge { background: #d97706 !important; }",
        "  .unit-badge { background: #f1f5f9 !important; color: #0f172a !important; border-color: #cbd5e1 !important; }",
        "  .meta-box { background: #f8fafc !important; border-left-color: #0284c7 !important; color: #334155 !important; }",
        "  .metric-card, .exec-summary, .finding-box, .comp-card, .evidence-card { background: #f8fafc !important; border: 1px solid #e2e8f0 !important; color: #0f172a !important; }",
        "  .metric-value { color: #0f172a !important; }",
        "  .metric-value.positive { color: #16a34a !important; }",
        "  .metric-value.negative { color: #dc2626 !important; }",
        "  th { background: #f1f5f9 !important; color: #0f172a !important; border-bottom-color: #cbd5e1 !important; }",
        "  td { border-bottom-color: #e2e8f0 !important; color: #334155 !important; }",
        "  .section-title { color: #0f172a !important; border-bottom-color: #cbd5e1 !important; }",
        "  .finding-box h3, .comp-header h3, .evidence-card h3 { color: #0f172a !important; }",
        "  .finding-box p, .exec-summary, .evidence-card p { color: #334155 !important; }",
        "  .evidence-card blockquote { background: #f0f9ff !important; color: #0369a1 !important; }",
        "  article, .metric-card, .finding-box, .comp-card, table { page-break-inside: avoid; }",
        "}",
        "</style></head><body><div class='report-container'>",
        "<div class='report-header'><div class='brand-group'><div class='logo-badge'>SI</div><div>",
        "<h1>Laporan riset bisnis</h1>",
        (
            f"<div class='unit-badge'>👑 Unit Bisnis: {escape(target_name)}</div>"
            if target_name
            else "<div class='unit-badge'>🏢 Ringkasan Portofolio Seluruh Unit</div>"
        ),
        "</div></div><button type='button' class='print-btn' id='printBtn'>🖨️ Cetak / Simpan PDF</button></div>",
        "<div class='meta-box'>",
        f"<p>Periode ulasan: {escape(run['start_at'])} sampai {escape(run['end_at'])} ({escape(run['period_months'])} bulan).<br>"
        f"Sinkron terakhir: {escape(run.get('updated_at') or run.get('created_at') or 'Tanggal tidak diketahui')}.<br>"
        f"Sumber publik: ulasan atau komentar yang dapat diakses umum di OTA, Google Maps, dan media sosial.<br>{escape(run['url'])}</p>",
        f"<p>Status: {escape(run['status'])}. Bukti pelanggan dalam periode: {in_window_cust}.</p>",
        "</div>",
        "<div class='metrics-grid'>",
        f"<div class='metric-card'><div class='metric-label'>Opini Pelanggan</div><div class='metric-value'>{fmt_num(total_cust)}</div><div class='metric-sub'>Ulasan bertanggal</div></div>",
        f"<div class='metric-card'><div class='metric-label'>Sentimen Positif</div><div class='metric-value positive'>{pos_pct}%</div><div class='metric-sub'>{fmt_num(pos_cust)} opini positif</div></div>",
        f"<div class='metric-card'><div class='metric-label'>Sentimen Negatif</div><div class='metric-value negative'>{neg_pct}%</div><div class='metric-sub'>{fmt_num(neg_cust)} opini negatif</div></div>",
        f"<div class='metric-card'><div class='metric-label'>Netral / Campuran</div><div class='metric-value'>{other_pct}%</div><div class='metric-sub'>{fmt_num(other_cust)} opini</div></div>",
        "</div>",
    ]
    if report:
        parts.extend(
            [
                "<h2 class='section-title'>Ringkasan</h2>",
                f"<div class='exec-summary'>{escape(report['summary'])}</div>",
                "<h2 class='section-title'>Rekomendasi</h2>",
                "<div class='findings-grid'>",
            ]
        )
        findings = report["findings"]
        maintain_findings = [f for f in findings if f.get("action") == "maintain"]
        improve_findings = [f for f in findings if f.get("action") in {"improve", "investigate"}]
        # Kolom 1: Perlu dipertahankan
        parts.append("<div class='finding-box maintain'>")
        if maintain_findings:
            for finding in maintain_findings:
                parts.extend(
                    [
                        f"<h3>👑 {escape(finding['title'])}</h3>",
                        f"<p><strong>{escape(names.get(finding['entity_id'], finding['entity_id']))}</strong> — {escape(finding['action'])}</p>",
                        f"<p>{escape(finding['rationale'])}</p><ol>",
                        *[f"<li>{escape(step)}</li>" for step in finding["steps"]],
                        "</ol><p>Bukti: ",
                    ]
                )
                parts.extend(
                    f"<a href='#e-{escape(eid)}'>{escape(eid)}</a> " for eid in finding["evidence_ids"]
                )
                parts.append("</p>")
        else:
            parts.append(
                "<h3>👑 Perlu dipertahankan</h3><p>Belum ada rekomendasi pertahankan yang tercatat.</p>"
            )
        parts.append("</div>")
        # Kolom 2: Perlu diperbaiki
        parts.append("<div class='finding-box improve'>")
        if improve_findings:
            for finding in improve_findings:
                parts.extend(
                    [
                        f"<h3>⚠️ {escape(finding['title'])}</h3>",
                        f"<p><strong>{escape(names.get(finding['entity_id'], finding['entity_id']))}</strong> — {escape(finding['action'])}</p>",
                        f"<p>{escape(finding['rationale'])}</p><ol>",
                        *[f"<li>{escape(step)}</li>" for step in finding["steps"]],
                        "</ol><p>Bukti: ",
                    ]
                )
                parts.extend(
                    f"<a href='#e-{escape(eid)}'>{escape(eid)}</a> " for eid in finding["evidence_ids"]
                )
                parts.append("</p>")
        else:
            parts.append("<h3>⚠️ Perlu diperbaiki</h3><p>Belum ada rekomendasi perbaikan yang tercatat.</p>")
        parts.append("</div></div>")

        parts.append("<h2 class='section-title'>Perbandingan kompetitor</h2>")
        for comparison in report["comparisons"]:
            advantage_labels = {
                "entity": f"{names.get(comparison['entity_id'], comparison['entity_id'])} unggul",
                "competitor": f"{names.get(comparison['competitor_id'], comparison['competitor_id'])} unggul",
                "balanced": "Seimbang",
                "insufficient": "Belum cukup bukti",
            }
            advantage = advantage_labels.get(comparison.get("advantage"), "Belum dinilai pada laporan lama")
            adv_class = comparison.get("advantage") or "balanced"
            parts.append(
                f"<article class='comp-card'><div class='comp-header'><h3>{escape(names.get(comparison['entity_id'], ''))} vs "
                f"{escape(names.get(comparison['competitor_id'], ''))} · {escape(comparison['aspect'])}</h3>"
                f"<span class='badge-adv {escape(adv_class)}'>{escape(advantage)}</span></div>"
            )
            parts.append(f"<p>Keunggulan aspek: {escape(advantage)}</p>")
            refs = [
                evidence_by_id[item_id] for item_id in comparison["evidence_ids"] if item_id in evidence_by_id
            ]
            platforms = ", ".join(sorted({item["platform"] for item in refs})) or "Belum tersedia"
            parts.append(
                f"<p>Sampel opini: {customer_counts.get(comparison['entity_id'], 0)} vs "
                f"{customer_counts.get(comparison['competitor_id'], 0)}; bukti aspek: {len(refs)}; "
                f"platform: {escape(platforms)}</p><p>Bukti: "
            )
            parts.extend(f"<a href='#e-{escape(item['id'])}'>{escape(item['id'])}</a> " for item in refs)
            parts.append("</p>")
            detail_keys = (
                "entity_strengths",
                "entity_weaknesses",
                "competitor_strengths",
                "competitor_weaknesses",
            )
            if any(comparison.get(key) for key in detail_keys):
                for key, label, comp_eid in (
                    ("entity_strengths", "Keunggulan", comparison["entity_id"]),
                    ("entity_weaknesses", "Perlu diperbaiki", comparison["entity_id"]),
                    ("competitor_strengths", "Keunggulan", comparison["competitor_id"]),
                    ("competitor_weaknesses", "Kekurangan", comparison["competitor_id"]),
                ):
                    parts.append(f"<h4>{escape(label)} · {escape(names.get(comp_eid, comp_eid))}</h4><ul>")
                    parts.extend(f"<li>{escape(item)}</li>" for item in comparison.get(key, []))
                    parts.append("</ul>")
            else:
                parts.append(f"<p>{escape(comparison['observation'])}</p>")
            parts.append("</article>")
    else:
        parts.append("<p>Analisis belum tersedia; bukti yang berhasil terkumpul tetap disertakan.</p>")

    parts.append("<h2 class='section-title'>💬 Komentar &amp; Ulasan Pelanggan</h2>")
    pos_items = [e for e in snapshot["evidence"] if e.get("sentiment") == "positive"]
    neg_items = [e for e in snapshot["evidence"] if e.get("sentiment") == "negative"]
    other_items = [e for e in snapshot["evidence"] if e.get("sentiment") not in {"positive", "negative"}]

    def render_evidence_cards(items: list, group_label: str, group_class: str, empty_msg: str = "") -> None:
        if not items and not empty_msg:
            return
        parts.append(
            f"<div class='sentiment-section'><h3 class='sentiment-heading {group_class}'>{group_label} ({len(items)})</h3>"
        )
        if not items:
            parts.append(
                f"<p class='empty-note' style='color:#64748b;font-style:italic;margin:8px 0 16px;'>{escape(empty_msg)}</p></div>"
            )
            return
        parts.append("<div class='evidence-cards-list'>")
        for item in items:
            link = item["url"] if urlsplit(item["url"]).scheme in {"http", "https"} else ""
            parts.append(
                f"<article class='evidence-card {group_class}' id='e-{escape(item['id'])}'>"
                f"<div class='evidence-header'><strong>{escape(names.get(item['entity_id'], item['entity_id']))}</strong>"
                f"<span class='badge-sentiment {group_class}'>{escape(item['sentiment'])}</span></div>"
                f"<p class='evidence-meta'>{escape(item['kind'])}, {escape(item['published_at'] or 'Tanggal tidak diketahui')}; "
                f"dalam periode: {escape(item['in_window'])}</p>"
                f"<blockquote>{escape(item['quote'])}</blockquote>"
                f"<p class='evidence-text'>{escape(item['text'])}</p>"
                f"<a href='{escape(link)}' rel='noopener noreferrer' target='_blank' class='evidence-source-link'>Sumber publik ↗</a></article>"
            )
        parts.append("</div></div>")

    render_evidence_cards(
        pos_items,
        "🟢 Ulasan &amp; Komentar Positif Pelanggan",
        "positive",
        "Belum ada ulasan positif yang tercatat.",
    )
    render_evidence_cards(
        neg_items,
        "🔴 Ulasan &amp; Komentar Negatif Pelanggan (Keluhan / Masukan)",
        "negative",
        "Tidak ditemukan ulasan atau keluhan negatif pada periode riset ini.",
    )
    render_evidence_cards(other_items, "⚪ Ulasan Netral &amp; Campuran Pelanggan", "neutral")

    parts.append(
        "<h2 class='section-title'>Cakupan sumber</h2><table><thead><tr><th>Sumber</th><th>Status</th><th>Keterangan</th></tr></thead><tbody>"
    )
    for source in snapshot["sources"]:
        parts.append(
            f"<tr><td>{escape(source['url'])}</td><td>{escape(source['status'])}</td><td>{escape(source['message'])}</td></tr>"
        )
    parts.append(
        "</tbody></table><p class='report-footer'>Angka hanya mewakili bukti unik yang berhasil diambil, bukan seluruh internet.</p></div>"
    )
    parts.append(
        "<script>window.addEventListener('DOMContentLoaded',function(){var b=document.getElementById('printBtn');if(b)b.onclick=function(){window.print();};});</script></body></html>"
    )
    return "\n".join(parts)


def fmt_num(val: int) -> str:
    return f"{val:,}".replace(",", ".")


def create_app() -> FastAPI:
    settings = get_settings()
    store = Store(settings)

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        await run_in_threadpool(init_pipeline, settings, store)
        application.state.ready = True
        try:
            yield
        finally:
            application.state.ready = False
            await run_in_threadpool(stop_pipeline)

    application = FastAPI(title="CrawlAI Business Research", lifespan=lifespan)
    application.state.ready = False
    application.state.store = store
    application.add_middleware(TrustedHostMiddleware, allowed_hosts=["127.0.0.1", "localhost", "[::1]"])

    @application.middleware("http")
    async def local_boundary(request: Request, call_next):
        if request.method not in {"GET", "HEAD", "OPTIONS"}:
            origin = request.headers.get("origin")
            if origin and origin != f"{request.url.scheme}://{request.url.netloc}":
                return JSONResponse(
                    {"detail": "Permintaan harus berasal dari dashboard lokal yang sama"}, status_code=403
                )
            if not request.headers.get("content-type", "").startswith("application/json"):
                return JSONResponse({"detail": "Content-Type application/json diperlukan"}, status_code=415)
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        if request.url.path.endswith("/export") and request.query_params.get("format") == "html":
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; "
                "connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
            )
        else:
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; "
                "connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
            )
        response.headers["Cache-Control"] = "no-store"
        return response

    def require_run(run_id: str) -> dict:
        try:
            return store.get_run(run_id)
        except KeyError as exc:
            raise HTTPException(404, "Riset tidak ditemukan") from exc

    @application.get("/health")
    def health():
        return {"status": "ok"}

    @application.get("/health/ready")
    def readiness():
        if not application.state.ready:
            raise HTTPException(503, "Workflow belum siap")
        try:
            with store.connection() as db:
                db.execute("SELECT 1").fetchone()
        except sqlite3.Error as exc:
            raise HTTPException(503, "Penyimpanan riset belum siap") from exc
        return {"status": "ready"}

    @application.get("/")
    def index():
        return FileResponse(STATIC / "index.html")

    @application.get("/api/config")
    def configuration():
        return {
            "default_url": settings.default_url,
            "period_months": 12,
            "max_pages": settings.max_pages,
            "max_codex_calls": settings.max_codex_calls,
            "codex_available": bool(settings.codex_executable or shutil.which("codex")),
            "timezone": "Asia/Jakarta",
        }

    @application.get("/api/research")
    def runs():
        return {"items": store.list_runs()}

    @application.post("/api/research", status_code=202)
    async def submit(request: ResearchRequest):
        try:
            request.url = await run_in_threadpool(validate_public_url, request.url)
            for url in request.competitor_urls:
                await run_in_threadpool(validate_public_url, url)
        except (ValueError, OSError) as exc:
            raise HTTPException(422, str(exc)) from exc
        try:
            run = store.create_run(request)
        except sqlite3.IntegrityError as exc:
            raise HTTPException(409, "Riset untuk URL ini sedang berjalan") from exc
        try:
            workflow_id = await run_in_threadpool(start_research, run["id"])
            store.update_run(run["id"], workflow_id=workflow_id)
        except (RuntimeError, ValueError) as exc:
            store.update_run(
                run["id"], status="failed", error=str(exc), message="Workflow tidak dapat dimulai"
            )
            raise HTTPException(
                503, "Workflow tidak dapat dimulai; detail tersimpan pada riwayat riset"
            ) from exc
        return store.get_run(run["id"])

    @application.post("/api/research/{run_id}/supplements", status_code=202)
    async def supplement(run_id: str, request: ResearchSupplement):
        run = require_run(run_id)
        if run["status"] in {"queued", "running"}:
            raise HTTPException(409, "Tunggu riset utama selesai sebelum melengkapi data")
        entities = {item["id"]: item for item in store.list_entities(run_id)}
        selected = set(request.entity_ids)
        if any(entity_id not in entities or entities[entity_id]["is_competitor"] for entity_id in selected):
            raise HTTPException(422, "Pilih unit bisnis yang tercatat pada riset ini")
        allowed = selected | {
            entity_id
            for entity_id, entity in entities.items()
            if entity["is_competitor"] and selected.intersection(entity.get("comparator_for", []))
        }
        if any(source.entity_id not in allowed for source in request.sources):
            raise HTTPException(422, "Sumber hanya boleh untuk unit terpilih atau kompetitor terkait")
        try:
            sources = [
                source.model_copy(update={"url": await run_in_threadpool(validate_public_url, source.url)})
                for source in request.sources
            ]
        except (ValueError, OSError) as exc:
            raise HTTPException(422, str(exc)) from exc
        request = request.model_copy(update={"sources": sources})
        if any(item["status"] in {"queued", "running"} for item in store.list_supplements(run_id)):
            raise HTTPException(409, "Lengkapi data untuk riset ini sedang berjalan")
        try:
            job = store.create_supplement(run_id, request)
        except sqlite3.IntegrityError as exc:
            raise HTTPException(409, "Lengkapi data untuk riset ini sedang berjalan") from exc
        try:
            workflow_id = await run_in_threadpool(start_supplement, job["id"])
            store.update_supplement(job["id"], workflow_id=workflow_id)
        except (RuntimeError, ValueError) as exc:
            store.update_supplement(
                job["id"],
                status="failed",
                stage="failed",
                error=str(exc),
                message="Workflow Crawl4AI tidak dapat dimulai",
            )
            raise HTTPException(
                503, "Workflow tidak dapat dimulai; detail tersimpan pada riwayat supplement"
            ) from exc
        return store.get_supplement(job["id"])

    @application.get("/api/research/{run_id}")
    def run_details(run_id: str):
        return {**require_run(run_id), "stats": store.stats(run_id)}

    @application.get("/api/research/{run_id}/entities")
    def entities(run_id: str):
        require_run(run_id)
        return {"items": store.list_entities(run_id)}

    @application.get("/api/research/{run_id}/supplements")
    def supplements(run_id: str):
        require_run(run_id)
        return {"items": store.list_supplements(run_id)}

    @application.get("/api/research/{run_id}/sources")
    def sources(run_id: str):
        require_run(run_id)
        return {"items": store.list_sources(run_id)}

    @application.get("/api/research/{run_id}/evidence")
    def evidence(
        run_id: str,
        entity_id: str | None = None,
        platform: str | None = None,
        sentiment: str | None = None,
        kind: str | None = None,
        in_window: bool | None = None,
    ):
        require_run(run_id)
        filters = {
            "entity_id": entity_id,
            "platform": platform,
            "sentiment": sentiment,
            "kind": kind,
            "in_window": in_window,
        }
        items = [
            item
            for item in store.list_evidence(run_id)
            if all(value is None or item[key] == value for key, value in filters.items())
        ]
        return {"items": items}

    @application.get("/api/research/{run_id}/report")
    def report(run_id: str):
        result = require_run(run_id)["report"]
        if result is None:
            raise HTTPException(404, "Laporan belum tersedia")
        return result

    @application.get("/api/research/{run_id}/sources/{source_id}/snapshot")
    def snapshot(run_id: str, source_id: str):
        require_run(run_id)
        source = next((item for item in store.list_sources(run_id) if item["id"] == source_id), None)
        if not source or not source["artifact_path"]:
            raise HTTPException(404, "Snapshot tidak tersedia")
        run_path = store.run_dir(run_id).resolve()
        path = Path(source["artifact_path"])
        if not path.is_absolute():
            path = run_path / path
        path = path.resolve()
        if not path.is_relative_to(run_path) or not path.is_file():
            raise HTTPException(404, "Snapshot tidak tersedia")
        return FileResponse(path, media_type="text/plain", filename=f"{source_id}.txt")

    @application.get("/api/research/{run_id}/export")
    def export(run_id: str, format: Literal["json", "csv", "html"] = "html", entity_id: str | None = None):
        require_run(run_id)
        data = store.read_snapshot(run_id)

        if entity_id:
            target_entity = next((item for item in data["entities"] if item["id"] == entity_id), None)
            if target_entity:
                comp_ids = {
                    e["id"]
                    for e in data["entities"]
                    if e.get("is_competitor") and entity_id in e.get("comparator_for", [])
                }
                allowed_ids = {entity_id} | comp_ids
                data["evidence"] = [item for item in data["evidence"] if item["entity_id"] in allowed_ids]
                data["sources"] = [s for s in data["sources"] if s.get("entity_id") in allowed_ids]
                if data["run"].get("report"):
                    data["run"]["report"] = {
                        **data["run"]["report"],
                        "findings": [
                            f
                            for f in (data["run"]["report"].get("findings") or [])
                            if f.get("entity_id") == entity_id
                        ],
                        "comparisons": [
                            c
                            for c in (data["run"]["report"].get("comparisons") or [])
                            if c.get("entity_id") == entity_id
                        ],
                    }

        filename_suffix = f"-{entity_id}" if entity_id else ""
        if format == "json":
            headers = {"Content-Disposition": f'attachment; filename="riset-{run_id}{filename_suffix}.json"'}
            return Response(
                json.dumps(data, ensure_ascii=False, indent=2), media_type="application/json", headers=headers
            )
        if format == "html":
            headers = {"Content-Disposition": f'inline; filename="laporan-{run_id}{filename_suffix}.html"'}
            return HTMLResponse(export_html(data, entity_id=entity_id), headers=headers)
        stream = io.StringIO(newline="")
        columns = [
            "id",
            "entity_id",
            "url",
            "platform",
            "kind",
            "published_at",
            "date_text",
            "sentiment",
            "in_window",
            "rating",
            "quote",
            "text",
            "research_period_start",
            "research_period_end",
            "last_sync",
        ]
        writer = csv.writer(stream)
        writer.writerow(columns)
        evidence_columns = columns[:-3]
        for item in data["evidence"]:
            writer.writerow(
                [csv_cell(item.get(key)) for key in evidence_columns]
                + [
                    csv_cell(data["run"]["start_at"]),
                    csv_cell(data["run"]["end_at"]),
                    csv_cell(data["run"].get("updated_at") or data["run"].get("created_at")),
                ]
            )
        headers = {"Content-Disposition": f'attachment; filename="riset-{run_id}{filename_suffix}.csv"'}
        return Response(
            stream.getvalue().encode("utf-8-sig"), media_type="text/csv; charset=utf-8", headers=headers
        )

    @application.get("/api/media")
    def media_manifest():
        media_dir = Path(__file__).resolve().parent.parent / "pipelines" / "asset_crawler" / "data" / "media"
        manifest_file = media_dir / "manifest.json"
        if manifest_file.is_file():
            try:
                return json.loads(manifest_file.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                return {"total_unique_assets": 0, "assets": [], "reviews_and_descriptions": []}
        return {"total_unique_assets": 0, "assets": [], "reviews_and_descriptions": []}

    @application.get("/api/media/file/{filename}")
    def media_file(filename: str):
        media_dir = (
            Path(__file__).resolve().parent.parent / "pipelines" / "asset_crawler" / "data" / "media"
        ).resolve()
        if not media_dir.is_dir():
            raise HTTPException(404, "Direktori media tidak ditemukan")
        target = (media_dir / filename).resolve()
        if not target.is_relative_to(media_dir) or not target.is_file():
            raise HTTPException(404, "File media tidak ditemukan")
        media_type = (
            "image/jpeg"
            if filename.lower().endswith((".jpg", ".jpeg"))
            else "image/png"
            if filename.lower().endswith(".png")
            else "application/octet-stream"
        )
        return FileResponse(target, media_type=media_type)

    if STATIC.exists():
        application.mount("/static", StaticFiles(directory=STATIC), name="static")
    return application


app = create_app()


def serve() -> None:
    settings = get_settings()
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, log_level="info")


if __name__ == "__main__":
    serve()
