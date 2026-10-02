import os
from pydantic import BaseModel, Field


class CrawlerSettings(BaseModel):
    """Configuration settings for the Crawl4AI news crawler service."""

    host: str = Field(default_factory=lambda: os.getenv("CRAWLER_HOST", "0.0.0.0"))
    port: int = Field(default_factory=lambda: int(os.getenv("CRAWLER_PORT", "8000")))
    page_timeout_ms: int = Field(
        default_factory=lambda: int(os.getenv("CRAWLER_TIMEOUT_MS", "30000"))
    )
    cache_dir: str = Field(
        default_factory=lambda: os.getenv("CRAWL4_AI_BASE_DIRECTORY", "/tmp/.crawl4ai")
    )
    user_agent: str = Field(
        default_factory=lambda: os.getenv(
            "CRAWLER_USER_AGENT",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        )
    )
    min_text_chars: int = Field(
        default_factory=lambda: int(os.getenv("CRAWLER_MIN_TEXT_CHARS", "300"))
    )
    min_image_width: int = Field(
        default_factory=lambda: int(os.getenv("CRAWLER_MIN_IMAGE_WIDTH", "300"))
    )
    concurrency_limit: int = Field(
        default_factory=lambda: int(os.getenv("CRAWLER_CONCURRENCY", "4"))
    )
    api_token: str = Field(
        default_factory=lambda: os.getenv("CRAWL4AI_API_TOKEN", "").strip()
    )


settings = CrawlerSettings()
