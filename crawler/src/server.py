from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.config import settings
from src.scraper import CrawlArticleResult, crawl_batch, crawl_url, is_safe_url

app = FastAPI(
    title="Sanghyang Crawl4AI News Crawler Service",
    description="High-fidelity headless web scraping and extraction engine using Crawl4AI",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def require_api_token(authorization: str | None = Header(default=None)) -> None:
    """Protect crawl endpoints when a token is configured.

    Local development remains convenient when no token is set. A public
    deployment must set CRAWL4AI_API_TOKEN so the crawler cannot be used as
    an open proxy by third parties.
    """
    if not settings.api_token:
        return
    expected = f"Bearer {settings.api_token}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Token Crawl4AI tidak valid.")


class CrawlRequest(BaseModel):
    url: str = Field(..., description="Target article URL to crawl")
    bypass_cache: bool = Field(default=True, description="Bypass cached extraction")


class BatchCrawlRequest(BaseModel):
    urls: list[str] = Field(..., min_length=1, max_length=20, description="List of URLs to crawl")
    bypass_cache: bool = Field(default=True, description="Bypass cached extraction")


class BatchCrawlResponse(BaseModel):
    results: list[CrawlArticleResult]


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "sanghyang-crawl4ai-crawler",
        "engine": "crawl4ai-0.9.2",
    }


@app.post("/crawl", response_model=CrawlArticleResult, dependencies=[Depends(require_api_token)])
async def handle_crawl(req: CrawlRequest):
    """Crawl a single news article URL."""
    if not is_safe_url(req.url):
        raise HTTPException(
            status_code=400,
            detail="URL is invalid or targets restricted network address (SSRF blocked)",
        )

    res = await crawl_url(req.url, bypass_cache=req.bypass_cache)
    return res


@app.post("/crawl/batch", response_model=BatchCrawlResponse, dependencies=[Depends(require_api_token)])
async def handle_crawl_batch(req: BatchCrawlRequest):
    """Crawl multiple news article URLs concurrently with rate limiting."""
    # Filter safe URLs
    unsafe = [u for u in req.urls if not is_safe_url(u)]
    if unsafe:
        raise HTTPException(
            status_code=400,
            detail=f"Batch contains unsafe/invalid URLs: {unsafe[:3]}",
        )

    results = await crawl_batch(req.urls)
    return BatchCrawlResponse(results=results)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=settings.host, port=settings.port)
