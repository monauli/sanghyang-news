import asyncio
import ipaddress
import re
import socket
from typing import Any, Optional
from urllib.parse import urlparse, urljoin
from bs4 import BeautifulSoup
from pydantic import BaseModel, Field

try:
    from src.config import settings
except ImportError:
    from crawler.src.config import settings


class CrawlArticleResult(BaseModel):
    """Normalized article extraction result matching Sanghyang schema."""

    url: str
    title: Optional[str] = None
    slug: str = ""
    full_text: Optional[str] = None
    markdown: Optional[str] = None
    image_url: Optional[str] = None
    image_width: Optional[int] = None
    attempt: str = "crawl4ai"  # 'crawl4ai' | 'fallback-bs4' | 'gagal'
    warnings: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None


def is_safe_url(url: str) -> bool:
    """
    Validates URL to prevent Server-Side Request Forgery (SSRF).
    Only allows public http and https URLs, blocking localhost, cloud metadata, and private networks.
    """
    if not url or not isinstance(url, str):
        return False
    try:
        parsed = urlparse(url.strip())
        if parsed.scheme not in ("http", "https"):
            return False
        hostname = parsed.hostname
        if not hostname:
            return False

        hostname_lower = hostname.lower()
        if hostname_lower in ("localhost", "127.0.0.1", "::1", "0.0.0.0"):
            return False
        if hostname_lower.endswith((".localhost", ".local", ".internal")):
            return False

        # Check for IP address literals
        try:
            ip = ipaddress.ip_address(hostname)
            if (
                ip.is_private
                or ip.is_loopback
                or ip.is_reserved
                or ip.is_link_local
                or str(ip).startswith("169.254.")
            ):
                return False
            return True
        except ValueError:
            pass

        # DNS resolution check for domain names
        try:
            addr_info = socket.getaddrinfo(hostname, None, proto=socket.IPPROTO_TCP)
            has_public_ip = False
            for item in addr_info:
                ip_str = item[4][0]
                ip = ipaddress.ip_address(ip_str)
                # Strictly block loopback, link-local, and cloud metadata
                if ip.is_loopback or ip.is_link_local or str(ip).startswith("169.254."):
                    return False
                # If explicit loopback 127.0.0.0/8 or 10.0.0.0/8 or 192.168.0.0/16
                if ip.version == 4 and (ip.is_private or ip.is_reserved):
                    return False
                if not ip.is_private and not ip.is_loopback:
                    has_public_ip = True

            # If it has at least one valid public IP (e.g. public IPv4), it's safe
            return has_public_ip or len(addr_info) > 0
        except (socket.gaierror, socket.error):
            return False
    except Exception:
        return False


def generate_slug(title: str, fallback_url: str = "") -> str:
    """Generate a clean URL slug from title or fallback URL."""
    slug = re.sub(r"[^a-z0-9]+", "-", (title or "").lower()).strip("-")
    if not slug and fallback_url:
        slug = re.sub(r"[^a-z0-9]+", "-", fallback_url.lower()).strip("-")
    return slug


def detect_pagination(html: str, current_url: str) -> bool:
    """
    Checks if an article is paginated (?page=2, /page/2, /2) on the same origin/path.
    Matches Sanghyang's verified backend detection heuristics (BACKEND.md §8).
    """
    try:
        parsed = urlparse(current_url)
        base_path = (parsed.scheme + "://" + parsed.netloc + parsed.path).rstrip("/")
    except Exception:
        return False

    soup = BeautifulSoup(html, "html.parser")
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        try:
            abs_url = urljoin(current_url, href)
            if not abs_url.startswith(base_path):
                continue
            rest = abs_url[len(base_path):]
            if re.search(r"^[?&](?:[^#]*&)?page=([2-9]|[1-9]\d)\b", rest) or re.search(
                r"^/(?:page/)?([2-9]|[1-9]\d)/?$", rest
            ):
                return True
        except Exception:
            continue
    return False


def clean_html(content_html: str) -> str:
    """Cleans raw HTML by stripping boilerplate tags and normalizing text."""
    soup = BeautifulSoup(content_html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "aside", "header", "form", "noscript"]):
        tag.decompose()

    text_lines = [line.strip() for line in soup.get_text().splitlines() if line.strip()]
    return "\n\n".join(text_lines)


def extract_meta_image(html: str, current_url: str) -> tuple[Optional[str], Optional[int]]:
    """Extracts og:image, twitter:image, or first large article image and width."""
    soup = BeautifulSoup(html, "html.parser")
    img_url: Optional[str] = None
    width: Optional[int] = None

    og_img = soup.find("meta", property="og:image") or soup.find("meta", attrs={"name": "og:image"})
    if og_img and og_img.get("content"):
        img_url = urljoin(current_url, og_img["content"])

    if not img_url:
        tw_img = soup.find("meta", property="twitter:image") or soup.find("meta", attrs={"name": "twitter:image"})
        if tw_img and tw_img.get("content"):
            img_url = urljoin(current_url, tw_img["content"])

    # Attempt to read width from meta
    w_meta = soup.find("meta", property="og:image:width")
    if w_meta and w_meta.get("content"):
        try:
            width = int(w_meta["content"])
        except ValueError:
            pass

    # Fallback to first <img> in body
    if not img_url:
        img_tag = soup.find("img", src=True)
        if img_tag:
            img_url = urljoin(current_url, img_tag["src"])
            if img_tag.get("width"):
                try:
                    width = int(img_tag["width"])
                except ValueError:
                    pass

    return img_url, width


async def _crawl_with_crawl4ai(url: str) -> CrawlArticleResult:
    """Executes high-fidelity headless crawl using Crawl4AI."""
    from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig

    browser_config = BrowserConfig(
        headless=True,
        verbose=False,
        java_script_enabled=True,
        user_agent=settings.user_agent,
        memory_saving_mode=True,
    )

    run_config = CrawlerRunConfig(
        page_timeout=settings.page_timeout_ms,
        wait_until="domcontentloaded",
        cache_mode=CacheMode.BYPASS,
        process_iframes=False,
        verbose=False,
    )

    async with AsyncWebCrawler(
        config=browser_config,
        base_directory=settings.cache_dir,
    ) as crawler:
        result = await crawler.arun(url=url, config=run_config)

        if not result.success:
            return CrawlArticleResult(
                url=url,
                attempt="crawl4ai",
                error=result.error_message or "Crawl4AI extraction failed",
            )

        html = result.cleaned_html or result.html or ""
        markdown_text = result.markdown or ""
        full_text = clean_html(html)

        # Title extraction hierarchy
        title: Optional[str] = None
        if result.metadata and result.metadata.get("og:title"):
            title = str(result.metadata["og:title"])
        elif result.metadata and result.metadata.get("title"):
            title = str(result.metadata["title"])
        elif getattr(result, "title", None):
            title = str(result.title)

        if not title:
            soup = BeautifulSoup(html, "html.parser")
            h1 = soup.find("h1")
            if h1:
                title = h1.get_text().strip()

        # Image extraction hierarchy
        img_url = None
        img_width = None
        if result.metadata:
            img_url = result.metadata.get("og:image") or result.metadata.get("twitter:image") or result.metadata.get("twitter:image:src")

        if not img_url:
            img_url, img_width = extract_meta_image(html, url)
        else:
            # Check meta width
            _, img_width = extract_meta_image(html, url)

        warnings: list[str] = []

        if not full_text:
            warnings.append("teks-kosong")
        elif len(full_text) < settings.min_text_chars:
            warnings.append("teks-pendek")

        if detect_pagination(html, url):
            warnings.append("berhalaman")

        if not img_url:
            warnings.append("gambar-tidak-ada")
        elif img_width is not None and img_width < settings.min_image_width:
            warnings.append("gambar-kecil")

        metadata = dict(result.metadata or {})
        parsed_url = urlparse(url)
        metadata["domain"] = parsed_url.netloc

        return CrawlArticleResult(
            url=url,
            title=title or url,
            slug=generate_slug(title or "", url),
            full_text=full_text,
            markdown=markdown_text,
            image_url=img_url,
            image_width=img_width,
            attempt="crawl4ai",
            warnings=warnings,
            metadata=metadata,
        )


async def _crawl_fallback_http(url: str) -> CrawlArticleResult:
    """Fallback crawl using standard HTTP client if Crawl4AI browser is unavailable."""
    import httpx

    headers = {
        "User-Agent": settings.user_agent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    }

    async with httpx.AsyncClient(headers=headers, timeout=15.0, follow_redirects=True) as client:
        res = await client.get(url)
        res.raise_for_status()
        html = res.text

    soup = BeautifulSoup(html, "html.parser")
    title: Optional[str] = None
    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content"):
        title = og_title["content"].strip()
    elif soup.find("h1"):
        title = soup.find("h1").get_text().strip()
    elif soup.title:
        title = soup.title.get_text().strip()

    full_text = clean_html(html)
    img_url, img_width = extract_meta_image(html, url)

    warnings: list[str] = []
    if not full_text:
        warnings.append("teks-kosong")
    elif len(full_text) < settings.min_text_chars:
        warnings.append("teks-pendek")

    if detect_pagination(html, url):
        warnings.append("berhalaman")

    if not img_url:
        warnings.append("gambar-tidak-ada")
    elif img_width is not None and img_width < settings.min_image_width:
        warnings.append("gambar-kecil")

    parsed_url = urlparse(url)
    return CrawlArticleResult(
        url=url,
        title=title or url,
        slug=generate_slug(title or "", url),
        full_text=full_text,
        markdown=full_text,
        image_url=img_url,
        image_width=img_width,
        attempt="fallback-bs4",
        warnings=warnings,
        metadata={"domain": parsed_url.netloc},
    )


async def crawl_url(url: str, bypass_cache: bool = True) -> CrawlArticleResult:
    """
    Crawls and extracts full article content and media from target URL.
    Attempts Crawl4AI first; falls back to HTTP scraper if needed.
    """
    if not is_safe_url(url):
        return CrawlArticleResult(
            url=url,
            attempt="gagal",
            error="Alamat URL tidak valid atau mengarah ke host terlarang (SSRF Protection)",
        )

    try:
        return await _crawl_with_crawl4ai(url)
    except Exception as exc:
        # Graceful fallback to HTTP scraping
        try:
            fallback_res = await _crawl_fallback_http(url)
            fallback_res.warnings.append(f"crawl4ai-fallback:{str(exc)[:60]}")
            return fallback_res
        except Exception as fallback_exc:
            return CrawlArticleResult(
                url=url,
                attempt="gagal",
                error=f"Crawl failed: {fallback_exc}",
            )


async def crawl_batch(urls: list[str]) -> list[CrawlArticleResult]:
    """Crawl a batch of URLs with bounded concurrency."""
    sem = asyncio.Semaphore(settings.concurrency_limit)

    async def _bound_crawl(u: str) -> CrawlArticleResult:
        async with sem:
            return await crawl_url(u)

    tasks = [_bound_crawl(u) for u in urls]
    return await asyncio.gather(*tasks)
