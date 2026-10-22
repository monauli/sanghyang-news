import { db } from "../lib/db";
import {
  compileMorningBriefingStats,
  formatMorningBriefingMessage,
  sendMorningAlert,
} from "../lib/market/morning-briefing";

async function main() {
  console.log("===============================================================");
  console.log("  SANGHYANG INTELLIGENCE: MORNING BRIEFING & ALERTING ENGINE");
  console.log("===============================================================");

  const stats = await compileMorningBriefingStats();
  const message = formatMorningBriefingMessage(stats);

  console.log("\n--- PRATINJAU NASKAH BRIEFING PAGI ---\n");
  console.log(message);
  console.log("\n---------------------------------------\n");

  const result = await sendMorningAlert(message);
  console.log("Status Pengiriman:", result.delivered ? "Terkirim ✅" : "Mode Simulasi / Siap Broadcast ℹ️");
  if (result.channels.length > 0) {
    console.log("Kanal Aktif:", result.channels.join(", "));
  } else {
    console.log("Catatan: Untuk mengaktifkan bot Telegram otomatis, isi TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID di environment.");
  }
}

main()
  .catch((err) => {
    console.error("Gagal menjalankan briefing pagi:", err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

