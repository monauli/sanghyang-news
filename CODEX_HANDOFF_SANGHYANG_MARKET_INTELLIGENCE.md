# CODEX HANDOFF — Sanghyang Market Intelligence System

## 1. Project Context

Existing project:
- Name: Sanghyang News
- Stack: Next.js 16, TypeScript, Tailwind CSS 4
- AI: Gemini
- Existing scraping/news flow:
  - Google News RSS
  - relevance filtering/scoring
  - URL resolving
  - article extraction
  - Gemini summarization
  - newsletter/PDF generation
- Existing extractor:
  - fetch()
  - @extractus/article-extractor
- Puppeteer is already available in the project but is not yet the primary scraping fallback.
- Existing documentation:
  - PRD.md
  - FRONTEND.md
  - BACKEND.md
  - AGENTS.md
  - README.md

Do NOT rebuild the project from zero.

The goal is to evolve the current app into:

# Sanghyang Market Intelligence System

Purpose:
Help Sanghyang Resort collect public market information and turn it into actionable marketing intelligence.

---

## 2. Main Business Goals

The application must help management understand:

1. F&B trends.
2. Entertainment and event trends.
3. Competitor activity.
4. Competitor pricing and promotions.
5. Customer sentiment/reviews.
6. Market opportunities.
7. Recommended marketing directions for Sanghyang Resort.

The output must not only show raw scraped data.

The system must transform:

Data -> Classification -> Analysis -> Insight -> Opportunity -> Marketing Recommendation

---

## 3. Main Modules

### A. F&B Intelligence

Collect public information related to:

- restaurant trends
- hotel/resort F&B promotions
- buffet packages
- dinner packages
- seasonal menus
- Ramadan / Christmas / New Year packages
- brunch
- seafood
- beach dining
- sunset dining
- family dining
- trending food and drinks
- culinary events

Fields:

- title
- source
- URL
- publish date
- location
- category
- brand/hotel/resort
- promotion name
- price if available
- description
- extracted article content
- images if available
- AI summary
- trend tags
- target audience
- relevance score

---

### B. Entertainment & Event Intelligence

Collect:

- concerts
- music events
- beach parties
- festivals
- family events
- kids activities
- exhibitions
- wedding events
- corporate events
- tourism events
- local cultural events

Priority locations:

- Anyer
- Carita
- Cilegon
- Serang
- Banten
- Jakarta

Fields:

- event name
- organizer
- location
- venue
- date
- ticket price
- event type
- target audience
- source URL
- description
- AI summary
- relevance to Sanghyang

---

### C. Competitor Monitor

Create a dedicated competitor monitoring system.

Admin must be able to add/edit/delete competitors.

Each competitor record:

- competitor name
- website
- location
- Google Maps URL
- booking URL
- Instagram URL
- Facebook URL
- TikTok URL
- notes
- active/inactive

Collect public information where technically and legally accessible:

- room pricing
- package pricing
- promotions
- room categories
- F&B promotions
- facilities
- events
- wedding packages
- meeting packages
- family packages
- social/public campaign information
- public customer reviews
- rating
- review volume
- positive themes
- negative themes

Do not bypass authentication, CAPTCHAs, private APIs, access controls, or anti-bot protections.

Respect robots.txt, Terms of Service, rate limits, and publicly accessible data boundaries.

---

### D. Competitor Price History

Do NOT overwrite previous price observations.

Store snapshots.

Example:

competitor_prices

- id
- competitor_id
- room_name
- package_name
- price
- original_price
- discount
- check_in_date
- check_out_date
- source
- source_url
- observed_at

The app must support charts showing price movements over time.

---

### E. Promotion History

Store each competitor promotion as historical data.

Fields:

- competitor
- promo title
- promo category
- description
- start date
- end date
- price
- discount
- source
- URL
- image
- captured_at

Detect:

- new promotion
- changed promotion
- expired promotion

---

### F. Customer Review Intelligence

Collect only public review information from supported/legal sources.

Analyze:

- sentiment
- common complaints
- common compliments
- room
- food
- service
- beach
- cleanliness
- facilities
- family experience
- value for money

Output examples:

Top Positive Topics:
- Beach
- Family facilities
- Staff

Top Negative Topics:
- Old rooms
- Breakfast variety
- Maintenance

AI must summarize patterns, not simply repeat individual reviews.

---

## 4. Scraping Architecture

Implement a layered scraper.

### Layer 1 — RSS/API/Public Feed

Use when available.

Example:

Google News RSS

Advantages:
- lightweight
- fast
- less likely to break

### Layer 2 — HTTP Extractor

Use:

fetch()
+
@extractus/article-extractor

For normal static pages.

### Layer 3 — Browser Automation Fallback

When:

- HTTP 403
- page content is too short
- JavaScript rendering is required
- content is loaded dynamically

Use existing Puppeteer or migrate browser layer to Playwright if clearly justified.

Flow:

RSS/Search
    ↓
Resolve URL
    ↓
fetch()
    ↓
Article Extractor
    ↓
Content valid?
    ├── YES -> save
    └── NO
          ↓
     Browser fallback
          ↓
     extract rendered DOM
          ↓
        save

Do not launch a browser for every article.

Browser automation is expensive and should only be fallback.

---

## 5. Scraping Reliability

Add:

- retry
- exponential backoff
- timeout
- per-domain rate limit
- User-Agent configuration
- duplicate detection
- URL normalization
- content hashing
- scraper logs
- failure reason
- last successful scrape
- last failed scrape

Suggested statuses:

- success
- partial
- blocked
- timeout
- parser_failed
- duplicate
- skipped

---

## 6. Source Registry

Create admin-manageable sources.

Example table:

sources

- id
- name
- domain
- category
- type
- scraping_method
- enabled
- priority
- interval
- last_run
- last_success
- failure_count

Types:

- news
- fnb
- event
- competitor
- review

Scraping methods:

- rss
- http
- browser
- manual

---

## 7. Database

If no persistent production database exists yet, add one.

Preferred:

PostgreSQL + Prisma

If the current project already uses another stable persistence layer, preserve it unless migration is justified.

Core entities:

- Source
- Article
- Event
- Competitor
- CompetitorSnapshot
- CompetitorPrice
- Promotion
- Review
- Trend
- Insight
- Recommendation
- ScrapeRun
- ScrapeError

All historical competitor observations must be preserved.

---

## 8. Deduplication

Avoid duplicate news/promotions/events.

Use combinations of:

- canonical URL
- normalized title
- publication date
- content hash
- source
- competitor

AI should NOT be the primary deduplication mechanism.

Use deterministic comparison first.

---

## 9. AI Analysis

Use Gemini after clean data is collected.

Do NOT use Gemini to perform all scraping.

Gemini responsibilities:

- classify content
- summarize
- extract structured information
- identify target audience
- generate trend tags
- sentiment analysis
- compare competitors
- identify opportunities
- produce marketing recommendations

Example structured AI output:

{
  "category": "F&B",
  "trend": "Sunset Dining",
  "targetAudience": ["Couple", "Gen Z"],
  "priceRange": "250000-500000",
  "locations": ["Anyer"],
  "opportunity": "...",
  "confidence": 0.87
}

Use structured JSON output and validate it.

---

## 10. Marketing Intelligence

Create an insight engine.

Examples:

- competitors increasing family packages
- growing sunset dining trend
- wedding campaigns increasing
- more children's activities appearing
- weekend room pricing increasing
- common competitor review complaints
- underserved customer segment

Each insight should contain:

- title
- category
- evidence
- sources
- date range
- confidence
- impact
- suggested action

Do not create recommendations without traceable source data.

---

## 11. Dashboard

Add navigation:

Dashboard
News
F&B Trends
Entertainment & Events
Competitors
Price Monitor
Promotions
Reviews
Market Trends
AI Insights
Marketing Opportunities
Sources
Scraping Logs
Settings

---

## 12. Dashboard Home

Show:

- articles collected today
- active competitors
- new competitor promotions
- upcoming events
- F&B trends
- price changes
- sentiment overview
- latest opportunities
- scraping health

---

## 13. Competitor Detail Page

Route example:

/competitors/[id]

Tabs:

Overview
Prices
Promotions
Facilities
Events
Reviews
History
AI Analysis

Display historical changes.

Example:

Room Deluxe

Sep 1: Rp1,200,000
Sep 8: Rp1,350,000
Sep 15: Rp1,550,000

---

## 14. Trend Page

Show trends by:

- 7 days
- 30 days
- 90 days
- custom range

Categories:

- F&B
- accommodation
- events
- wedding
- family
- corporate
- entertainment

Trend metrics:

- mentions
- growth
- sources
- competitors
- audience
- average detected price

---

## 15. Marketing Opportunity Page

AI-generated opportunities should look like:

Opportunity:
Sunset Dinner Package

Evidence:
- 7 recent articles
- 3 competitors running related promotions
- strong couple/Gen Z relevance

Recommended Sanghyang direction:
Create a weekend sunset dinner package.

Possible audience:
Couples / young adults.

The UI must always show the source evidence behind the recommendation.

---

## 16. Search & Filters

Global filters:

- date
- location
- source
- category
- competitor
- audience
- sentiment
- price range

Global search should cover:

- articles
- events
- competitors
- promotions
- reviews

---

## 17. Scheduled Scraping

Support scheduled jobs.

Suggested frequency:

News:
every 3-6 hours

F&B:
every 6-12 hours

Events:
every 12 hours

Competitor promotions:
daily

Competitor pricing:
daily or configurable

Reviews:
daily

Do not run scraping from frontend requests.

Use background jobs / server scheduler suitable for the project's deployment environment.

---

## 18. Manual Scrape

Admin must have:

Run Scraper Now

Selectable:

- News
- F&B
- Entertainment
- Competitors
- Prices
- Promotions
- Reviews
- All

Show progress and result.

---

## 19. Scraping Logs

Page:

/admin/scraping

Display:

- job
- source
- started
- finished
- duration
- records discovered
- records saved
- duplicates
- errors
- status

Allow opening error detail.

---

## 20. Security

Never expose:

- Gemini API key
- credentials
- cookies
- session tokens

Ensure `.env.local` is ignored by Git.

Do not commit secrets.

If existing ZIP/project contains active secrets, assume they may need rotation.

---

## 21. UX Requirements

Preserve the existing visual identity unless a redesign is necessary.

Requirements:

- desktop-first dashboard
- responsive
- simple for non-technical staff
- clear tables
- useful filters
- loading states
- empty states
- error states

Avoid overly complex UI.

---

## 22. Implementation Strategy

Do not attempt everything in one uncontrolled rewrite.

Implement in phases while keeping the existing application working.

### Phase 1

Foundation:

- inspect current project
- document current architecture
- database schema
- source registry
- scraper interfaces
- scraping logs
- improve article scraping fallback

### Phase 2

F&B + entertainment:

- new source categories
- F&B scraper
- event scraper
- classification
- dashboard pages

### Phase 3

Competitor system:

- competitor CRUD
- competitor scraping
- promotions
- facilities
- price snapshots
- history

### Phase 4

Reviews:

- public review collection
- sentiment
- topic extraction
- review dashboard

### Phase 5

Market intelligence:

- trend engine
- competitor comparison
- marketing opportunities
- Gemini recommendations

### Phase 6

Hardening:

- retries
- rate limits
- tests
- cron/background jobs
- performance
- observability
- security review

---

## 23. Codex Working Rules

Before editing:

1. Read:
   - AGENTS.md
   - PRD.md
   - FRONTEND.md
   - BACKEND.md
   - README.md
   - CLAUDE.md if relevant

2. Inspect the real source code.

3. Do not assume documentation is perfectly current.

4. Preserve existing features.

5. Prefer incremental changes over rewrites.

6. Run:
   - lint
   - typecheck
   - tests
   - build

7. Fix failures introduced by your changes.

8. Do not deploy.

9. Do not alter production credentials.

10. Do not delete existing data.

---

## 24. First Codex Task

Start ONLY with Phase 1.

Deliver:

1. current architecture assessment
2. proposed database schema
3. scraper abstraction
4. source registry
5. scrape logging
6. robust article extraction fallback
7. initial admin scraping page
8. tests
9. updated documentation

Do not begin Phase 2 until Phase 1 is stable.

---

## 25. Definition of Done for Phase 1

Phase 1 is complete when:

- old news workflow still works
- scraper supports multiple source types
- scraper errors are logged
- browser fallback works
- duplicate articles are prevented
- sources can be enabled/disabled
- admin can manually run scraping
- scraping history is visible
- no secrets are committed
- lint passes
- typecheck passes
- tests pass
- production build passes

---

## Final Product Direction

This application is no longer only:

"Sanghyang News"

It should evolve into:

"Sanghyang Market Intelligence"

Main principle:

Collect public information -> preserve historical data -> analyze patterns -> provide evidence-based marketing intelligence for Sanghyang Resort.

## Phase 1 delivered

Phase 1 is the stable news foundation only. It adds PostgreSQL/Prisma models
for sources, articles, scrape runs, and scrape errors; deterministic URL and
composite deduplication; RSS and HTTP adapters; browser extraction only as a
short/empty HTTP fallback; a protected manual news run API; and
`/admin/scraping` for source health and run history.

Local setup:

```powershell
Copy-Item .env.example .env.local
# set DATABASE_URL and APP_PASSWORD in .env.local
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

The old newsletter routes remain the compatibility baseline. No scheduled
scraping, F&B/event collectors, competitor monitoring, price/promotion history,
review intelligence, trends, insights, or recommendations are included yet.
Those belong to later phases and must not be inferred from the Phase 1 schema.
