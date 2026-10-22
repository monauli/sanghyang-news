import fs from "node:fs";
import path from "node:path";
import { db } from "../db";
import { Prisma, PromotionStatus } from "@prisma/client";

export type SocialAccountTarget = {
  name: string;
  username: string;
  url: string;
  platform: "instagram" | "tiktok";
  competitorId?: string;
};

export const SOCIAL_TARGETS: SocialAccountTarget[] = [
  {
    name: "Aston Anyer Beach Hotel & Aquavillas",
    username: "astonanyer",
    url: "https://www.instagram.com/astonanyer/",
    platform: "instagram",
    competitorId: "10000000-0000-4000-8000-000000000001",
  },
  {
    name: "Mambruk Hotel & Convention",
    username: "mambrukhotelanyer",
    url: "https://www.instagram.com/mambrukhotelanyer/",
    platform: "instagram",
    competitorId: "10000000-0000-4000-8000-000000000002",
  },
  {
    name: "Novus Jiva Anyer Villa, Resort & Spa",
    username: "novusjivaanyer",
    url: "https://www.instagram.com/novusjivaanyer/",
    platform: "instagram",
    competitorId: "3a1eb0c3-5daa-429a-8a8f-a1247bc5a7b8",
  },
  {
    name: "The Jayakarta Villas Anyer Beach Resort",
    username: "thejayakartaanyer",
    url: "https://www.instagram.com/thejayakartaanyer/",
    platform: "instagram",
    competitorId: "10000000-0000-4000-8000-000000000003",
  },
  {
    name: "Mövenpick Resort Carita",
    username: "movenpickresortcarita",
    url: "https://www.instagram.com/movenpickresortcarita/",
    platform: "instagram",
    competitorId: "3517724b-254c-426b-838c-7c1d5583fc7b",
  },
  {
    name: "Andalan Beach View Anyer",
    username: "andalanbeach",
    url: "https://www.instagram.com/andalanbeach/",
    platform: "instagram",
    competitorId: "7cf4b717-4c8f-4082-afe0-f876a4deaeed",
  },
];

export type DiscoveredSocialPost = {
  targetName: string;
  username: string;
  platform: "instagram" | "tiktok";
  url: string;
  captionSnippet?: string;
  discoveredAt: Date;
};

/**
 * Merayap URL postingan & reels terbaru dari profil publik media sosial kompetitor
 */
export async function scrapeSocialPostsFromBrowser(
  targets: SocialAccountTarget[] = SOCIAL_TARGETS
): Promise<DiscoveredSocialPost[]> {
  let puppeteer;
  try {
    puppeteer = (await import("puppeteer")).default;
  } catch {
    console.warn("[scrape-social] Puppeteer tidak tersedia.");
    return [];
  }

  let browser;
  const discovered: DiscoveredSocialPost[] = [];

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1280, height: 800 });

    for (const target of targets) {
      console.log(`[scrape-social] Memeriksa akun ${target.name} (@${target.username})...`);
      try {
        await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 20_000 });
        // Scroll sedikit untuk memicu pemuatan feed
        await page.evaluate(() => window.scrollBy(0, 400));
        await new Promise((r) => setTimeout(r, 2_000));

        const postUrls = await page.evaluate((uname) => {
          const links = Array.from(document.querySelectorAll("a"));
          const matched: { url: string; caption?: string }[] = [];
          for (const a of links) {
            const href = a.href;
            if (href.includes("/p/") || href.includes("/reel/")) {
              const img = a.querySelector("img");
              const alt = img?.getAttribute("alt") || "";
              if (!matched.some((m) => m.url === href)) {
                matched.push({ url: href, caption: alt });
              }
            }
          }
          return matched.slice(0, 5); // Ambil 5 postingan paling atas
        }, target.username);

        for (const item of postUrls) {
          discovered.push({
            targetName: target.name,
            username: target.username,
            platform: target.platform,
            url: item.url,
            captionSnippet: item.caption,
            discoveredAt: new Date(),
          });
        }

        console.log(`[scrape-social] -> Ditemukan ${postUrls.length} postingan aktif dari @${target.username}`);
      } catch (e) {
        console.warn(`[scrape-social] Gagal merayap profil @${target.username}:`, (e as Error)?.message || e);
      }
    }
  } catch (err) {
    console.warn("[scrape-social] Terjadi kesalahan browser saat perayapan sosmed:", err);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }

  return discovered;
}

/**
 * Menyimpan metadata postingan yang baru ditemukan ke file mirror lokal dan memperbarui radar promo
 */
export async function recordDiscoveredSocialPosts(
  posts: DiscoveredSocialPost[]
): Promise<{ recordedCount: number }> {
  if (posts.length === 0) return { recordedCount: 0 };

  const outDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, "crawled-social-posts.json");
  let existing: DiscoveredSocialPost[] = [];
  if (fs.existsSync(outPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(outPath, "utf-8"));
    } catch {
      existing = [];
    }
  }

  const map = new Map<string, DiscoveredSocialPost>();
  for (const item of existing) {
    map.set(item.url, item);
  }
  for (const item of posts) {
    map.set(item.url, item);
  }

  const combined = Array.from(map.values());
  fs.writeFileSync(outPath, JSON.stringify(combined, null, 2), "utf-8");
  console.log(`[scrape-social] Berhasil mencatat ${posts.length} postingan ke ${outPath}`);

  return { recordedCount: posts.length };
}

/**
 * Menjalankan modul perayapan media sosial harian
 */
export async function scrapeSocialBuzz(): Promise<{ totalDiscovered: number }> {
  console.log("[scrape-social] Memulai perayapan radar media sosial Anyer...");
  const posts = await scrapeSocialPostsFromBrowser(SOCIAL_TARGETS);
  await recordDiscoveredSocialPosts(posts);
  return { totalDiscovered: posts.length };
}

