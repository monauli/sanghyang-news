import assert from "node:assert/strict";
import { getDynamicTargetDates } from "../lib/market/collect-rates";
import { generateExternalId, determineSentiment, extractThemes, parseRelativeDate } from "../lib/market/scrape-new-reviews";
import { ReviewSentiment } from "@prisma/client";

async function runTests() {
  console.log("===============================================================");
  console.log("  TEST: NIGHTLY AUTONOMOUS SCRAPING & DYNAMIC PIPELINE");
  console.log("===============================================================");

  // 1. Uji Kalkulasi Tanggal Dinamis (Bukan 11 Oktober lagi!)
  const mockBaseDate = new Date("2026-10-22T10:00:00.000Z"); // Kamis
  const dynamicDates = getDynamicTargetDates(mockBaseDate);

  // Besok harus Jumat 23 Oktober 2026
  assert.equal(dynamicDates.tomorrow.checkIn.toISOString().split("T")[0], "2026-10-23");
  assert.equal(dynamicDates.tomorrow.checkOut.toISOString().split("T")[0], "2026-10-24");
  console.log("  [PASS] Tanggal dinamis last-minute (besok malam) akurat: 2026-10-23");

  // Weekend terdekat harus Sabtu 24 Oktober 2026
  assert.equal(dynamicDates.weekend.checkIn.toISOString().split("T")[0], "2026-10-24");
  assert.equal(dynamicDates.weekend.checkOut.toISOString().split("T")[0], "2026-10-25");
  console.log("  [PASS] Tanggal dinamis weekend peak (Sabtu-Minggu) akurat: 2026-10-24");

  // 2. Uji Determinisme External ID Ulasan (OCC Idempotency)
  const id1 = generateExternalId("Aston Anyer", "John Doe", new Date("2026-10-20"), "Kamarnya sangat nyaman dan bersih.");
  const id2 = generateExternalId("Aston Anyer", "John Doe", new Date("2026-10-20"), "Kamarnya sangat nyaman dan bersih.");
  const id3 = generateExternalId("Aston Anyer", "Jane Doe", new Date("2026-10-20"), "Kamarnya sangat nyaman dan bersih.");
  assert.equal(id1, id2, "ID eksternal harus identik untuk ulasan yang sama");
  assert.notEqual(id1, id3, "ID eksternal harus berbeda untuk penulis yang berbeda");
  console.log("  [PASS] Deterministic hash ulasan valid (Zero Duplicate Guarantee)");

  // 3. Uji Sentiment Classifier
  assert.equal(determineSentiment(5), ReviewSentiment.positive);
  assert.equal(determineSentiment(4), ReviewSentiment.positive);
  assert.equal(determineSentiment(3), ReviewSentiment.neutral);
  assert.equal(determineSentiment(2), ReviewSentiment.negative);
  assert.equal(determineSentiment(1), ReviewSentiment.negative);
  console.log("  [PASS] Klasifikasi sentimen ulasan akurat");

  // 4. Uji Ekstraksi Tema Ulasan
  const themes1 = extractThemes("Makanannya sangat enak dan sarapan buffet melimpah, tapi ac kamar agak berisik.");
  assert.ok(themes1.includes("makanan & sarapan"));
  assert.ok(themes1.includes("kamar & kebersihan"));
  console.log("  [PASS] Ekstraksi tema ulasan (kamar, F&B, pantai) akurat:", themes1);

  // 5. Uji Relative Date Parser
  const relDate = parseRelativeDate("2 hari lalu", new Date("2026-10-22T00:00:00.000Z"));
  assert.equal(relDate.toISOString().split("T")[0], "2026-10-20");
  console.log("  [PASS] Relative date parsing akurat: 2 hari lalu -> 2026-10-20");

  console.log("\n Seluruh 5 pengujian pipeline nightly autonomous scraping BERHASIL LULUS 100%!");
  console.log("===============================================================");
}

runTests().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});

