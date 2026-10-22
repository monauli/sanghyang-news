import crypto from "node:crypto";
import { db } from "../db";
import { ReviewSentiment } from "@prisma/client";

export type ReviewTarget = {
  name: string;
  competitorId: string;
  googleReviewsUrl: string;
  source: string;
};

export const DEFAULT_REVIEW_TARGETS: ReviewTarget[] = [
  {
    name: "Sanghyang Indah Spa Resort",
    competitorId: "41aa4e0d-2478-4d5a-a57a-b5423dd1763e",
    googleReviewsUrl: "https://www.google.co.id/travel/hotels/entity/ChcI3eSggaqXsutkGgsvZy8xdGd6a2psZhAB/reviews",
    source: "Google Maps",
  },
  {
    name: "Aston Anyer Beach Hotel",
    competitorId: "10000000-0000-4000-8000-000000000001",
    googleReviewsUrl: "https://www.google.com/travel/hotels/entity/CgsIyMeqy4H4hJPOARAB/reviews",
    source: "Google Maps",
  },
  {
    name: "Mambruk Hotel & Convention",
    competitorId: "10000000-0000-4000-8000-000000000002",
    googleReviewsUrl: "https://www.google.com/travel/hotels/entity/CgoInq6j7auKrqlzEAE/reviews",
    source: "Google Maps",
  },
  {
    name: "The Jayakarta Villas Anyer Beach Resort",
    competitorId: "10000000-0000-4000-8000-000000000003",
    googleReviewsUrl: "https://www.google.com/travel/hotels/entity/ChgI_9neisz9vOACGgwvZy8xcHpwaGt4MnMQAQ/reviews",
    source: "Google Maps",
  },
  {
    name: "Novus Jiva Anyer Villa, Resort & Spa",
    competitorId: "3a1eb0c3-5daa-429a-8a8f-a1247bc5a7b8",
    googleReviewsUrl: "https://www.google.com/travel/hotels/entity/CgsIwbS06M-19b0qEAE/reviews",
    source: "Google Maps",
  },
];

export type ParsedReview = {
  author: string;
  rating: number;
  reviewDate: Date;
  text: string;
  source: string;
  sourceUrl: string;
};

export function parseRelativeDate(text: string, baseDate = new Date()): Date {
  const norm = text.toLowerCase().trim();
  const now = baseDate.getTime();

  if (norm.includes("hari") || norm.includes("day")) {
    const match = norm.match(/(\d+)/);
    const days = match ? parseInt(match[1], 10) : 1;
    return new Date(now - days * 24 * 60 * 60 * 1000);
  }
  if (norm.includes("minggu") || norm.includes("week")) {
    const match = norm.match(/(\d+)/);
    const weeks = match ? parseInt(match[1], 10) : 1;
    return new Date(now - weeks * 7 * 24 * 60 * 60 * 1000);
  }
  if (norm.includes("bulan") || norm.includes("month")) {
    const match = norm.match(/(\d+)/);
    const months = match ? parseInt(match[1], 10) : 1;
    return new Date(now - months * 30 * 24 * 60 * 60 * 1000);
  }
  if (norm.includes("tahun") || norm.includes("year")) {
    const match = norm.match(/(\d+)/);
    const years = match ? parseInt(match[1], 10) : 1;
    return new Date(now - years * 365 * 24 * 60 * 60 * 1000);
  }

  // Coba parse ISO / text tanggal biasa
  const parsed = Date.parse(text);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed);
  }

  return baseDate;
}

export function extractThemes(text: string): string[] {
  const lower = text.toLowerCase();
  const themes: string[] = [];

  if (/kamar|bed|kasur|ac|bersih|bocor|nyamuk|sprei|bantal/.test(lower)) {
    themes.push("kamar & kebersihan");
  }
  if (/makan|sarapan|breakfast|resto|restoran|buffet|menu|kuliner|minum/.test(lower)) {
    themes.push("makanan & sarapan");
  }
  if (/pantai|beach|sunset|kolam|pool|laut|pemandangan|view|dermaga/.test(lower)) {
    themes.push("fasilitas & pantai");
  }
  if (/staf|pelayanan|ramah|receptionist|check in|resepsionis|lambat|satpam|housekeeping/.test(lower)) {
    themes.push("pelayanan & staf");
  }
  if (/harga|mahal|murah|worth it|promo|diskon|biaya/.test(lower)) {
    themes.push("harga & value");
  }
  if (/anak|keluarga|family|playground|wahana/.test(lower)) {
    themes.push("keluarga & anak");
  }

  return themes.length > 0 ? themes : ["umum"];
}

export function determineSentiment(rating: number): ReviewSentiment {
  if (rating >= 4) return ReviewSentiment.positive;
  if (rating === 3) return ReviewSentiment.neutral;
  return ReviewSentiment.negative;
}

export function generateExternalId(hotelName: string, author: string, date: Date, text: string): string {
  const hash = crypto.createHash("sha256");
  hash.update(`${hotelName}:${author}:${date.toISOString().slice(0, 10)}:${text.slice(0, 80)}`);
  return hash.digest("hex").slice(0, 32);
}

/**
 * Merayap ulasan terbaru dari Google Hotels / Maps Reviews tab
 * Menggunakan Puppeteer headless dengan proteksi timeout & fallback anggun.
 */
export async function scrapeReviewsFromGoogle(target: ReviewTarget): Promise<ParsedReview[]> {
  let puppeteer;
  try {
    puppeteer = (await import("puppeteer")).default;
  } catch {
    console.warn("[scrape-reviews] Puppeteer tidak tersedia di lingkungan saat ini.");
    return [];
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );

    // Timeout ramah jaringan
    await page.goto(target.googleReviewsUrl, { waitUntil: "domcontentloaded", timeout: 25_000 });

    // Tunggu konten review termuat jika ada
    await new Promise((r) => setTimeout(r, 3_000));

    const reviewsData = await page.evaluate(() => {
      const items: { author: string; ratingText: string; dateText: string; body: string }[] = [];
      // Google Travel Hotels review container selector
      const reviewCards = document.querySelectorAll("div[jsname], div[data-review-id], div.Svr5cf");

      for (const card of Array.from(reviewCards).slice(0, 15)) {
        const bodyEl = card.querySelector("span[jscontroller], div.W50dpb, div[class*='review-text']");
        const authorEl = card.querySelector("div[class*='name'], div.Y0A0hc, span[class*='author']");
        const ratingEl = card.querySelector("span[aria-label*='bintang'], span[aria-label*='star'], div[aria-label*='rating']");
        const dateEl = card.querySelector("span[class*='date'], span.k6t1P, div[class*='publish-date']");

        const body = (bodyEl?.textContent || "").trim();
        if (body.length > 15) {
          items.push({
            author: (authorEl?.textContent || "Tamu Google").trim(),
            ratingText: ratingEl?.getAttribute("aria-label") || ratingEl?.textContent || "5",
            dateText: (dateEl?.textContent || "").trim(),
            body,
          });
        }
      }

      return items;
    });

    const results: ParsedReview[] = [];
    for (const r of reviewsData) {
      const starMatch = r.ratingText.match(/([1-5](?:[.,]\d+)?)/);
      const rating = starMatch ? parseFloat(starMatch[1].replace(",", ".")) : 5.0;
      const reviewDate = parseRelativeDate(r.dateText);

      results.push({
        author: r.author,
        rating: Math.min(5, Math.max(1, rating)),
        reviewDate,
        text: r.body,
        source: target.source,
        sourceUrl: target.googleReviewsUrl,
      });
    }

    return results;
  } catch (err) {
    console.warn(`[scrape-reviews] Gagal merayap ulasan langsung untuk ${target.name}:`, (err as Error)?.message || err);
    return [];
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

/**
 * Menyimpan ulasan hasil perayapan ke dalam database Supabase
 * dengan OCC deduplication dan idempotency (Zero Duplicate).
 */
export async function ingestScrapedReviews(
  target: ReviewTarget,
  reviews: ParsedReview[]
): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  for (const r of reviews) {
    const externalId = generateExternalId(target.name, r.author, r.reviewDate, r.text);
    const sentiment = determineSentiment(r.rating);
    const themes = extractThemes(r.text);

    try {
      const existing = await db.competitorReview.findUnique({
        where: {
          competitorId_source_externalId: {
            competitorId: target.competitorId,
            source: r.source,
            externalId,
          },
        },
      });

      if (existing) {
        skipped++;
      } else {
        await db.competitorReview.create({
          data: {
            competitorId: target.competitorId,
            externalId,
            source: r.source,
            sourceUrl: r.sourceUrl,
            rating: r.rating,
            reviewDate: r.reviewDate,
            text: r.text,
            sentiment,
            themes,
            capturedAt: new Date(),
          },
        });
        inserted++;
      }
    } catch (err) {
      console.warn(`[scrape-reviews] Error upserting review:`, (err as Error)?.message);
    }
  }

  return { inserted, skipped };
}

/**
 * Eksekusi perayapan ulasan harian untuk seluruh target hotel
 */
export async function scrapeNewGoogleReviews(
  targets: ReviewTarget[] = DEFAULT_REVIEW_TARGETS
): Promise<{ totalInserted: number; totalSkipped: number }> {
  let totalInserted = 0;
  let totalSkipped = 0;

  console.log(`[scrape-reviews] Memulai perayapan ulasan baru untuk ${targets.length} hotel...`);

  for (const target of targets) {
    try {
      const reviews = await scrapeReviewsFromGoogle(target);
      if (reviews.length > 0) {
        const stats = await ingestScrapedReviews(target, reviews);
        totalInserted += stats.inserted;
        totalSkipped += stats.skipped;
        console.log(`[scrape-reviews] ${target.name}: +${stats.inserted} baru, ${stats.skipped} sudah ada.`);
      } else {
        console.log(`[scrape-reviews] ${target.name}: 0 ulasan baru dari perayapan web saat ini.`);
      }
    } catch (err) {
      console.warn(`[scrape-reviews] Kendala perayapan ulasan ${target.name}:`, err);
    }
  }

  return { totalInserted, totalSkipped };
}
