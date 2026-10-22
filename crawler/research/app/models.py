import calendar
from datetime import UTC, datetime
from typing import Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, field_validator

Sentiment = Literal["positive", "negative", "neutral", "mixed", "unclear"]
EvidenceKind = Literal["customer_review", "customer_comment", "owner_content", "editorial", "search_snippet"]
SourceStatus = Literal["pending", "ok", "partial", "blocked", "not_found", "unsupported", "failed", "limit"]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


def calendar_window(months: int, end: datetime | None = None) -> tuple[datetime, datetime]:
    end = end or datetime.now(UTC)
    if end.tzinfo is None:
        raise ValueError("Period endpoint must include a timezone")
    ordinal = end.year * 12 + end.month - 1 - months
    year, month_zero = divmod(ordinal, 12)
    month = month_zero + 1
    day = min(end.day, calendar.monthrange(year, month)[1])
    return end.replace(year=year, month=month, day=day), end


class ResearchRequest(StrictModel):
    url: str = Field(min_length=8, max_length=2048)
    period_months: Literal[12] = 12
    competitor_urls: list[str] = Field(default_factory=list, max_length=12)

    @field_validator("url")
    @classmethod
    def http_url(cls, value: str) -> str:
        value = value.strip()
        parsed = urlsplit(value)
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.hostname
            or parsed.username
            or parsed.password
        ):
            raise ValueError("Gunakan URL HTTP(S) publik tanpa kredensial")
        return value

    @field_validator("competitor_urls")
    @classmethod
    def competitor_http_urls(cls, values: list[str]) -> list[str]:
        return list(dict.fromkeys(cls.http_url(value) for value in values))


class SupplementSource(StrictModel):
    entity_id: str
    url: str = Field(min_length=8, max_length=2048)

    @field_validator("url")
    @classmethod
    def public_http_url(cls, value: str) -> str:
        return ResearchRequest.http_url(value)


class ResearchSupplement(StrictModel):
    entity_ids: list[str] = Field(min_length=1, max_length=14)
    sources: list[SupplementSource] = Field(min_length=1, max_length=30)


class Entity(StrictModel):
    id: str
    name: str
    kind: str
    parent_id: str | None = None
    website: str = ""
    is_competitor: bool = False
    comparator_for: list[str] = Field(default_factory=list)
    verification: Literal["verified", "candidate"] = "candidate"
    description: str = ""


class Source(StrictModel):
    id: str
    entity_id: str
    url: str
    platform: str
    status: SourceStatus = "pending"
    message: str = ""
    canonical_url: str = ""
    fetched_at: str | None = None
    artifact_path: str | None = None
    content_hash: str = ""


class Aspect(StrictModel):
    name: str
    sentiment: Sentiment
    quote: str


class Evidence(StrictModel):
    id: str
    entity_id: str
    source_id: str
    url: str
    platform: str
    kind: EvidenceKind
    published_at: str | None = None
    date_text: str = ""
    text: str
    quote: str
    sentiment: Sentiment = "unclear"
    aspects: list[Aspect] = Field(default_factory=list)
    rating: str | None = None
    content_hash: str
    in_window: bool = False


class Finding(StrictModel):
    entity_id: str
    title: str
    action: Literal["improve", "maintain", "investigate"]
    priority: Literal["high", "medium", "low"]
    rationale: str
    evidence_ids: list[str]
    steps: list[str]


class Comparison(StrictModel):
    entity_id: str
    competitor_id: str
    aspect: str
    advantage: Literal["entity", "competitor", "balanced", "insufficient"] | None = None
    observation: str
    evidence_ids: list[str]
    limitations: str
    entity_strengths: list[str] = Field(default_factory=list)
    entity_weaknesses: list[str] = Field(default_factory=list)
    competitor_strengths: list[str] = Field(default_factory=list)
    competitor_weaknesses: list[str] = Field(default_factory=list)


class Report(StrictModel):
    summary: str
    findings: list[Finding]
    comparisons: list[Comparison]
    limitations: list[str]
