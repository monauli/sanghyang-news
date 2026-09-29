import json
import os
import sys

# Ensure src is on python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.scraper import (
    CrawlArticleResult,
    clean_html,
    detect_pagination,
    extract_meta_image,
    generate_slug,
    is_safe_url,
)


def test_is_safe_url_ssrf_protection():
    # Dangerous URLs must be rejected
    assert not is_safe_url("http://localhost:3000/secret")
    assert not is_safe_url("http://127.0.0.1:8080")
    assert not is_safe_url("http://169.254.169.254/latest/meta-data")
    assert not is_safe_url("http://10.0.0.1/internal")
    assert not is_safe_url("http://192.168.1.1/router")
    assert not is_safe_url("file:///etc/passwd")
    assert not is_safe_url("ftp://example.com/file")
    assert not is_safe_url("")

    # Public valid URLs must be allowed
    assert is_safe_url("https://banten.antaranews.com/berita/12345")
    assert is_safe_url("https://radarbanten.co.id/wisata-anyer")


def test_clean_html():
    raw_html = """
    <html>
        <head><title>Berita Wisata</title><style>.banner{color:red;}</style></head>
        <body>
            <header><nav><a href="/">Beranda</a></nav></header>
            <main>
                <h1>Pantai Anyer Ramai</h1>
                <p>Wisatawan memadati kawasan Anyer sepanjang akhir pekan.</p>
                <script>console.log("tracker");</script>
            </main>
            <footer>&copy; 2026 Portal Berita</footer>
        </body>
    </html>
    """
    cleaned = clean_html(raw_html)
    assert "Beranda" not in cleaned
    assert "console.log" not in cleaned
    assert "banner" not in cleaned
    assert "2026 Portal Berita" not in cleaned
    assert "Pantai Anyer Ramai" in cleaned
    assert "Wisatawan memadati kawasan Anyer" in cleaned


def test_generate_slug():
    assert generate_slug("Wisata Pantai Anyer 2026") == "wisata-pantai-anyer-2026"
    assert generate_slug("Hotel & Resort di Banten: Murah?!") == "hotel-resort-di-banten-murah"
    # Fallback to URL
    assert generate_slug("", "https://portal.id/artikel/anyer-indah") == "https-portal-id-artikel-anyer-indah"


def test_detect_pagination():
    base_url = "https://jatim.suaramerdeka.com/hiburan/0512/hotel-anyer"

    # Positive cases (same article, next page)
    html_page2 = '<a class="paging__link" href="https://jatim.suaramerdeka.com/hiburan/0512/hotel-anyer?page=2">2</a>'
    assert detect_pagination(html_page2, base_url)

    html_page_slash = '<a href="/hiburan/0512/hotel-anyer/2">Halaman 2</a>'
    assert detect_pagination(html_page_slash, base_url)

    # Negative cases (unrelated links, another article, or rel="next" to different post)
    html_other_article = '<a rel="next" href="https://jatim.suaramerdeka.com/hiburan/0513/berita-lain">Next</a>'
    assert not detect_pagination(html_other_article, base_url)

    html_home = '<a href="https://jatim.suaramerdeka.com/">Home</a>'
    assert not detect_pagination(html_home, base_url)


def test_extract_meta_image():
    html_og = """
    <html>
        <head>
            <meta property="og:image" content="https://images.site.com/hero.jpg" />
            <meta property="og:image:width" content="1200" />
        </head>
        <body><p>Content</p></body>
    </html>
    """
    url, width = extract_meta_image(html_og, "https://site.com/art")
    assert url == "https://images.site.com/hero.jpg"
    assert width == 1200

    html_tw = """
    <html>
        <head>
            <meta name="twitter:image" content="/assets/tw.png" />
        </head>
        <body><p>Content</p></body>
    </html>
    """
    url2, width2 = extract_meta_image(html_tw, "https://site.com/art")
    assert url2 == "https://site.com/assets/tw.png"
    assert width2 is None


def test_sample_articles_fixture():
    fixture_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "sample_articles.json"))
    assert os.path.exists(fixture_path), f"Fixture not found: {fixture_path}"

    with open(fixture_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert isinstance(data, list)
    assert len(data) >= 2

    # Validate against Pydantic schema
    for item in data:
        article = CrawlArticleResult.model_validate(item)
        assert article.url.startswith("http")
        assert len(article.full_text or "") > 50
        assert article.slug != ""
