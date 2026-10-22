"""Public-only Crawl4AI collection; browser traffic is fulfilled over pinned public IPs."""

from __future__ import annotations

import asyncio
import hashlib
import ipaddress
import json
import re
import socket
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.robotparser import RobotFileParser

import httpx
from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig
from playwright.async_api import BrowserContext, Page, Route, WebSocketRoute
from playwright.async_api import Error as PlaywrightError

from app.config import Settings
from app.models import Source

MAX_RESPONSE_BYTES = 6_000_000


def public_target(url: str) -> tuple[str, str, str]:
    parsed = urlsplit(url.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("URL harus HTTP(S) publik tanpa kredensial")
    try:
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
    except ValueError as exc:
        raise ValueError("Port URL tidak valid") from exc
    if port not in {80, 443}:
        raise ValueError("Hanya port web publik 80/443 yang didukung")
    hostname = (parsed.hostname or "").rstrip(".").encode("idna").decode("ascii").lower()
    if hostname == "localhost" or hostname.endswith((".localhost", ".local", ".internal")):
        raise ValueError("Alamat lokal atau internal tidak diizinkan")
    try:
        addresses = {
            str(entry[4][0]) for entry in socket.getaddrinfo(hostname, port, type=socket.SOCK_STREAM)
        }
    except OSError as exc:
        addresses = set()
        try:
            with httpx.Client(timeout=3) as dns_client:
                res = dns_client.get(
                    f"https://1.1.1.1/dns-query?name={hostname}&type=A",
                    headers={"accept": "application/dns-json"},
                )
                if res.status_code == 200:
                    data = res.json()
                    addresses = {str(ans["data"]) for ans in data.get("Answer", []) if ans.get("type") == 1}
        except (httpx.HTTPError, ValueError):
            addresses = set()
        if not addresses:
            raise ValueError("DNS sumber tidak dapat diresolusikan") from exc
    if not addresses or any(not ipaddress.ip_address(address).is_global for address in addresses):
        raise ValueError("Alamat privat, loopback, metadata cloud atau nonpublik tidak diizinkan")
    address = sorted(addresses, key=lambda item: (":" in item, item))[0]
    host_part = f"[{hostname}]" if ":" in hostname else hostname
    if parsed.port:
        host_part += f":{port}"
    normalized = urlunsplit((parsed.scheme, host_part, parsed.path or "/", parsed.query, ""))
    return normalized, hostname, address


def validate_public_url(url: str) -> str:
    return public_target(url)[0]


async def pinned_fetch(client: httpx.AsyncClient, url: str, headers: dict[str, str]) -> httpx.Response:
    normalized, hostname, address = await asyncio.to_thread(public_target, url)
    parsed = urlsplit(normalized)
    ip_authority = f"[{address}]" if ":" in address else address
    if parsed.port:
        ip_authority += f":{parsed.port}"
    pinned_url = urlunsplit((parsed.scheme, ip_authority, parsed.path, parsed.query, ""))
    outbound = {
        key: value
        for key, value in headers.items()
        if key.lower() not in {"host", "cookie", "authorization", "proxy-authorization", "accept-encoding"}
    }
    outbound["Host"] = parsed.netloc
    request = client.build_request("GET", pinned_url, headers=outbound)
    request.extensions["sni_hostname"] = hostname
    response = await client.send(request, stream=True, follow_redirects=False)
    try:
        chunks: list[bytes] = []
        size = 0
        async for chunk in response.aiter_bytes():
            size += len(chunk)
            if size > MAX_RESPONSE_BYTES:
                raise ValueError("Respons melebihi batas 6 MB")
            chunks.append(chunk)
        clean_headers = {
            key: value
            for key, value in response.headers.items()
            if key.lower() not in {"content-encoding", "content-length", "transfer-encoding"}
        }
        return httpx.Response(
            response.status_code, headers=clean_headers, content=b"".join(chunks), request=request
        )
    finally:
        await response.aclose()


async def robots_allowed(client: httpx.AsyncClient, url: str, user_agent: str) -> tuple[bool, str]:
    parsed = urlsplit(url)
    robots_url = urlunsplit((parsed.scheme, parsed.netloc, "/robots.txt", "", ""))
    for _ in range(5):
        response = await pinned_fetch(client, robots_url, {"User-Agent": user_agent})
        if response.is_redirect and response.headers.get("location"):
            robots_url = urljoin(robots_url, response.headers["location"])
            continue
        if response.status_code == 404:
            return True, "robots.txt tidak tersedia (404)"
        if response.status_code in {401, 403, 429} or response.status_code >= 500:
            return False, f"robots.txt tidak dapat diverifikasi (HTTP {response.status_code})"
        if response.status_code != 200:
            return False, f"robots.txt tidak dapat diverifikasi (HTTP {response.status_code})"
        parser = RobotFileParser()
        parser.parse(response.text.splitlines())
        return parser.can_fetch(user_agent, url), "robots.txt melarang pengambilan"
    return False, "Redirect robots.txt melebihi batas"


def embedded_reviews(html: str) -> str:
    """Expose genuine JSON-LD review text that a DOM markdown converter may miss."""
    blocks = re.findall(
        r"<script\b[^>]*type=[\"\']application/ld\+json[\"\'][^>]*>(.*?)</script>", html, re.I | re.S
    )
    excerpts: list[str] = []

    def visit(value: Any) -> None:
        if isinstance(value, list):
            for child in value:
                visit(child)
        elif isinstance(value, dict):
            if value.get("@type") == "Review" and isinstance(value.get("reviewBody"), str):
                date = str(value.get("datePublished", ""))
                title = str(value.get("name", ""))
                rating = value.get("reviewRating", {})
                score = rating.get("ratingValue", "") if isinstance(rating, dict) else ""
                excerpts.append(
                    f"JSON-LD Review\nTanggal: {date}\nJudul: {title}\nRating: {score}\n{value['reviewBody']}"
                )
            for child in value.values():
                if isinstance(child, dict | list):
                    visit(child)

    for block in blocks:
        try:
            visit(json.loads(block))
        except json.JSONDecodeError:
            continue
    return "\n\n".join(dict.fromkeys(excerpts))


async def collect_source(settings: Settings, source: Source, run_dir: Path) -> Source:
    captured = source.model_copy(deep=True)
    captured.fetched_at = datetime.now(UTC).isoformat()
    artifact_dir = run_dir / "sources"
    artifact_dir.mkdir(parents=True, exist_ok=True)
    try:
        captured.url = await asyncio.to_thread(validate_public_url, source.url)
        parsed_target = urlsplit(captured.url)

        # 1. Dokumen PDF publik: ambil langsung via HTTP streaming tanpa browser rendering
        if parsed_target.path.lower().endswith(".pdf"):
            async with httpx.AsyncClient(timeout=25, trust_env=False, verify=True) as client:
                allowed, message = await robots_allowed(client, captured.url, settings.user_agent)
                if not allowed:
                    captured.status, captured.message = "blocked", message
                    return captured
                pdf_res = await pinned_fetch(client, captured.url, {"User-Agent": settings.user_agent})
                if pdf_res.status_code >= 400:
                    captured.status = "blocked" if pdf_res.status_code in {401, 403, 429} else "failed"
                    captured.message = f"HTTP {pdf_res.status_code}"
                    return captured
                pdf_bytes = pdf_res.content
                filename = Path(parsed_target.path).name or f"{captured.id}.pdf"
                (artifact_dir / f"{captured.id}.pdf").write_bytes(pdf_bytes)
                markdown = f"# Dokumen PDF: {filename}\n\nUkuran: {len(pdf_bytes):,} bytes\nSumber: {captured.url}\n\nDokumen publik PDF berhasil diunduh dan diarsipkan."
                relative_md = f"sources/{captured.id}.md"
                (run_dir / relative_md).write_text(markdown, encoding="utf-8")
                (artifact_dir / f"{captured.id}.html").write_text(
                    f"<p>PDF document {filename} ({len(pdf_bytes)} bytes)</p>", encoding="utf-8"
                )
                (artifact_dir / f"{captured.id}.links.json").write_text("{}", encoding="utf-8")
                captured.artifact_path = relative_md
                captured.content_hash = hashlib.sha256(pdf_bytes).hexdigest()
                captured.status, captured.message = (
                    "ok",
                    f"Dokumen PDF publik berhasil diunduh ({len(pdf_bytes):,} bytes)",
                )
                return captured

        # 1b. Akun media sosial resmi (Instagram / TikTok): ambil profil publik via pinned_fetch langsung
        if any(dom in parsed_target.netloc.lower() for dom in ("instagram.com", "tiktok.com")):
            async with httpx.AsyncClient(timeout=25, trust_env=False, verify=True) as client:
                res = await pinned_fetch(
                    client,
                    captured.url,
                    {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
                    },
                )
                if res.status_code < 400 and len(res.content) > 1000:
                    text_content = res.text
                    title_m = re.search(r"<title>(.*?)</title>", text_content, re.I)
                    title = title_m.group(1).strip() if title_m else f"Profil {source.platform}"
                    desc_m = re.search(
                        r"<(?:meta\s+property=[\"\']og:description[\"\']|meta\s+name=[\"\']description[\"\'])\s+content=[\"\'](.*?)[\"\']",
                        text_content,
                        re.I,
                    )
                    desc = desc_m.group(1).strip() if desc_m else ""
                    markdown = f"# Profil Resmi {source.platform}: {title}\n\n**URL**: {captured.url}\n\n**Deskripsi/Bio**: {desc}\n\nProfil resmi publik berhasil diambil sebagai bukti identitas dan media resmi unit bisnis."
                    relative_md = f"sources/{captured.id}.md"
                    (run_dir / relative_md).write_text(markdown, encoding="utf-8")
                    (artifact_dir / f"{captured.id}.html").write_text(text_content, encoding="utf-8")
                    (artifact_dir / f"{captured.id}.links.json").write_text("{}", encoding="utf-8")
                    captured.artifact_path = relative_md
                    captured.content_hash = hashlib.sha256(markdown.encode()).hexdigest()
                    captured.status, captured.message = (
                        "ok",
                        f"Profil publik resmi {source.platform} berhasil diambil",
                    )
                    return captured

        # 2. Google Travel pre-flight: deteksi pengalihan unsupported sebelum timeout browser
        if "google.com" in parsed_target.netloc.lower() and "/travel/" in parsed_target.path.lower():
            async with httpx.AsyncClient(timeout=10, trust_env=False, verify=True) as client:
                pre_check = await pinned_fetch(client, captured.url, {"User-Agent": settings.user_agent})
                if pre_check.is_redirect and "unsupported" in (pre_check.headers.get("location") or ""):
                    captured.status = "blocked"
                    captured.message = (
                        "Google Travel mengalihkan bot ke /travel/unsupported (akses publik dibatasi)"
                    )
                    return captured

        failures: list[str] = []
        registered: set[int] = set()
        checked_origins: set[str] = set()
        async with httpx.AsyncClient(timeout=25, trust_env=False, verify=True) as client:
            allowed, message = await robots_allowed(client, captured.url, settings.user_agent)
            if not allowed:
                captured.status, captured.message = "blocked", message
                return captured
            checked_origins.add(urlunsplit((*urlsplit(captured.url)[:2], "", "", "")))

            async def network_guard(route: Route) -> None:
                request = route.request
                try:
                    if request.method not in {"GET", "HEAD"}:
                        await route.abort("blockedbyclient")
                        return
                    if request.resource_type in {"image", "media", "font"}:
                        await route.abort("blockedbyclient")
                        return
                    is_main_nav = request.is_navigation_request() and (
                        request.frame.parent_frame is None if request.frame else True
                    )
                    if request.is_navigation_request():
                        target = urlsplit(request.url)
                        origin = urlunsplit((target.scheme, target.netloc, "", "", ""))
                        if origin not in checked_origins:
                            navigation_allowed, reason = await robots_allowed(
                                client, request.url, settings.user_agent
                            )
                            if not navigation_allowed:
                                if is_main_nav:
                                    raise ValueError(reason)
                                await route.abort("blockedbyclient")
                                return
                            checked_origins.add(origin)
                    response = await pinned_fetch(client, request.url, request.headers)
                    await route.fulfill(
                        status=response.status_code, headers=dict(response.headers), body=response.content
                    )
                except (ValueError, OSError, httpx.HTTPError) as exc:
                    is_main_nav = request.is_navigation_request() and (
                        request.frame.parent_frame is None if request.frame else True
                    )
                    if is_main_nav:
                        failures.append(str(exc))
                    try:
                        await route.abort("blockedbyclient")
                    except PlaywrightError:
                        pass
                except PlaywrightError:
                    is_main_nav = request.is_navigation_request() and (
                        request.frame.parent_frame is None if request.frame else True
                    )
                    if is_main_nav:
                        failures.append("Navigasi browser terputus sebelum selesai")

            async def block_socket(route: WebSocketRoute) -> None:
                await route.close()

            async def secure_context(page: Page, context: BrowserContext, **_: Any) -> Page:
                if id(context) not in registered:
                    await context.route("**/*", network_guard)
                    await context.route_web_socket("**/*", block_socket)
                    registered.add(id(context))
                return page

            config = BrowserConfig(
                headless=True,
                user_agent=settings.user_agent,
                ignore_https_errors=False,
                accept_downloads=False,
                verbose=False,
                extra_args=["--disable-features=ServiceWorker"],
            )
            async with AsyncWebCrawler(
                config=config, base_directory=str(run_dir / "crawler-cache")
            ) as crawler:
                crawler.crawler_strategy.set_hook("before_goto", secure_context)  # type: ignore[reportAttributeAccessIssue]
                result = await crawler.arun(
                    captured.url,
                    config=CrawlerRunConfig(
                        page_timeout=settings.crawl_timeout_ms,
                        cache_mode=CacheMode.BYPASS,
                        wait_until="domcontentloaded",
                        delay_before_return_html=1.5,
                        verbose=False,
                        check_robots_txt=False,
                        remove_forms=True,
                        max_retries=0,
                    ),
                )
        if failures:
            captured.status, captured.message = "blocked", "; ".join(failures)
            return captured
        captured.canonical_url = result.redirected_url or captured.url
        await asyncio.to_thread(validate_public_url, captured.canonical_url)
        markdown = result.markdown.raw_markdown if result.markdown else ""
        supplemental = embedded_reviews(result.html or "")
        if supplemental:
            markdown += "\n\n## Structured reviews present in source HTML\n\n" + supplemental
        relative = f"sources/{captured.id}.md"
        (run_dir / relative).write_text(markdown, encoding="utf-8")
        (artifact_dir / f"{captured.id}.html").write_text(result.html or "", encoding="utf-8")
        (artifact_dir / f"{captured.id}.links.json").write_text(
            json.dumps(result.links, ensure_ascii=False), encoding="utf-8"
        )
        captured.artifact_path = relative
        captured.content_hash = hashlib.sha256(markdown.encode()).hexdigest()
        if not result.success or (result.status_code or 0) >= 400:
            captured.status = "blocked" if result.status_code in {401, 403, 429} else "failed"
            captured.message = str(result.error_message or f"HTTP {result.status_code}")[:500]
        elif any(
            term in markdown.lower()
            for term in (
                "verify you are human",
                "checking your browser",
                "access denied",
                "complete the captcha",
                "just a moment...",
                "you must log in to continue",
                "log in to continue to facebook",
            )
        ):
            captured.status, captured.message = (
                "blocked",
                "Halaman meminta CAPTCHA, login atau menolak akses publik",
            )
        elif len(markdown.strip()) < 250:
            captured.status, captured.message = (
                "partial",
                "Konten publik terlalu pendek; komentar mungkin memerlukan login/JavaScript",
            )
        elif len(markdown) > settings.max_source_chars:
            captured.status, captured.message = (
                "ok",
                "Dokumen publik tersimpan penuh (input analisis disesuaikan)",
            )
        else:
            captured.status, captured.message = "ok", "Konten publik berhasil diambil"
    except (ValueError, OSError, httpx.HTTPError) as exc:
        captured.status, captured.message = "failed", str(exc)[:500]
    except Exception as exc:
        # Browser/provider exceptions are visible coverage gaps, never missing or fabricated evidence.
        captured.status, captured.message = "failed", f"{type(exc).__name__}: {exc}"[:500]
    return captured
