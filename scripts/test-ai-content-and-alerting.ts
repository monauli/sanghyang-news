import assert from "node:assert/strict";
import { createFallbackContentDraft, generateSocialContentDrafts } from "../lib/market/ai-content-generator";
import { formatMorningBriefingMessage, type MorningBriefingStats } from "../lib/market/morning-briefing";

async function runTests() {
  console.log("===============================================================");
  console.log("  TEST: AI CONTENT GENERATOR & MORNING ALERTING ENGINE");
  console.log("===============================================================");

  // 1. Uji Generator Draf Konten Media Sosial
  const sampleInput = {
    competitorName: "Aston Anyer Beach Hotel",
    promoTitle: "Promo Diskon 20% Menginap & 30% F&B",
    promoCategory: "Kamar & Menginap",
    counterStrategy: "Tawarkan bundling Menginap Sanghyang + Gratis Akses Onsen Belerang Alami 24 Jam",
    outletName: "Sunset Grill & Onsen Belerang",
  };

  const fallbackDraft = createFallbackContentDraft(sampleInput);
  assert.ok(fallbackDraft.reels.hook3Sec.length > 10, "Hook Reels harus terisi");
  assert.ok(fallbackDraft.tiktok.hookPOV.includes("POV:"), "Teks TikTok harus memuat format POV");
  assert.equal(fallbackDraft.carousel.slides.length, 5, "Carousel harus memiliki 5 slide panduan visual");
  assert.ok(fallbackDraft.reels.hashtags.length >= 3, "Harus menyertakan minimal 3 hashtag");
  console.log("  [PASS] Struktur Draf Konten AI (Reels, TikTok POV, Carousel 5 Slide) terverifikasi 100%");

  // 2. Uji Generator Async Draft
  const generatedBundle = await generateSocialContentDrafts(sampleInput);
  assert.ok(generatedBundle.reels.caption.length > 20, "Caption Reels harus terisi");
  assert.ok(generatedBundle.tiktok.caption.length > 20, "Caption TikTok harus terisi");
  assert.ok(generatedBundle.carousel.promoOffer.length > 10, "Penawaran promo carousel harus terisi");
  console.log("  [PASS] Async Content Generation Engine berjalan mulus");

  // 3. Uji Formatter Pesan Briefing Pagi
  const mockStats: MorningBriefingStats = {
    dateStr: "Jumat, 23 Oktober 2026",
    heartbeatSummary: "Otomasi malam sukses terpantau.",
    rates: [
      { hotel: "Sanghyang Indah Spa Resort", price: 350704, currency: "IDR", checkIn: "2026-10-23" },
      { hotel: "Aston Anyer Beach Hotel", price: 875776, currency: "IDR", checkIn: "2026-10-23" },
    ],
    activePromos: [
      { competitorName: "Aston Anyer", title: "Diskon 20%", counterStrategy: "Bundling Onsen" },
    ],
    criticalReviews: [],
  };

  const message = formatMorningBriefingMessage(mockStats);
  assert.ok(message.includes("BRIEFING INTELIJEN PASAR SANGHYANG"), "Header briefing harus ada");
  assert.ok(message.includes("TARIF PASAR TERKINI"), "Seksi tarif harus ada");
  assert.ok(message.includes("RADAR PROMO & EVENT KOMPETITOR"), "Seksi promo harus ada");
  assert.ok(message.includes("SENTIMEN & FEEDBACK PELANGGAN"), "Seksi sentimen harus ada");
  assert.ok(message.includes("https://sanghyang-news.vercel.app/market-intelligence"), "Tautan dashboard harus ada");
  console.log("  [PASS] Naskah format Briefing Pagi (Telegram/WhatsApp) terverifikasi 100%");

  console.log("\n Seluruh pengujian AI Content Generator & Morning Alerting LULUS 100%!");
  console.log("===============================================================");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

