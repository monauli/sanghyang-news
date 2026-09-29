import os
import sys
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.scraper import CrawlArticleResult
from src.server import app

client = TestClient(app)


def test_health_check_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "crawl4ai" in data["engine"]


def test_crawl_ssrf_rejected():
    res = client.post("/crawl", json={"url": "http://127.0.0.1:8080/admin"})
    assert res.status_code == 400
    assert "SSRF blocked" in res.json()["detail"]


@patch("src.server.crawl_url")
def test_crawl_endpoint_success(mock_crawl):
    mock_result = CrawlArticleResult(
        url="https://banten.antaranews.com/berita/123",
        title="Wisata Anyer",
        slug="wisata-anyer",
        full_text="Pantai Anyer dipadati pengunjung liburan.",
        markdown="# Wisata Anyer\n\nPantai Anyer dipadati pengunjung liburan.",
        image_url="https://images.site.com/anyer.jpg",
        image_width=800,
        attempt="crawl4ai",
        warnings=[],
        metadata={"domain": "banten.antaranews.com"},
    )
    mock_crawl.return_value = mock_result

    res = client.post("/crawl", json={"url": "https://banten.antaranews.com/berita/123"})
    assert res.status_code == 200
    data = res.json()
    assert data["title"] == "Wisata Anyer"
    assert data["attempt"] == "crawl4ai"
    assert data["slug"] == "wisata-anyer"


def test_crawl_batch_validation_rejected():
    # Empty list
    res = client.post("/crawl/batch", json={"urls": []})
    assert res.status_code == 422  # validation error

    # Unsafe URL in batch
    res2 = client.post("/crawl/batch", json={"urls": ["https://good.com", "http://localhost:8000"]})
    assert res2.status_code == 400
    assert "unsafe/invalid" in res2.json()["detail"]
