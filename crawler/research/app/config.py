from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", env_prefix="CRAWLAI_", extra="forbid")

    data_dir: Path = ROOT / "data"
    host: str = "127.0.0.1"
    default_url: str = "https://sanghyang.com/"
    port: int = Field(default=8000, ge=1024, le=65535)
    max_pages: int = Field(default=200, ge=1, le=2000)
    max_codex_calls: int = Field(default=30, ge=1, le=200)
    codex_batch_size: int = Field(default=12, ge=1, le=50)
    max_source_chars: int = Field(default=24000, ge=4000, le=200000)
    crawl_timeout_ms: int = Field(default=60000, ge=1000, le=180000)
    codex_timeout_seconds: int = Field(default=900, ge=30, le=7200)
    codex_model: str | None = None
    codex_executable: str | None = None
    user_agent: str = "CrawlAI-BusinessResearch/0.1 (+local public research)"
    max_concurrent_domains: int = Field(default=2, ge=1, le=4)

    @field_validator("host")
    @classmethod
    def loopback_only(cls, value: str) -> str:
        if value not in {"127.0.0.1", "::1", "localhost"}:
            raise ValueError("Dashboard hanya boleh berjalan pada loopback lokal")
        return value

    @field_validator("data_dir")
    @classmethod
    def absolute_data_dir(cls, value: Path) -> Path:
        return value.expanduser().resolve()


@lru_cache
def get_settings() -> Settings:
    return Settings()
