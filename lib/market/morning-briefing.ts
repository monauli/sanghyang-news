import { db } from "../db";

export type MorningBriefingStats = {
  dateStr: string;
  heartbeatSummary?: string;
  rates: Array<{ hotel: string; price: number; currency: string; checkIn: string }>;
  activePromos: Array<{ competitorName: string; title: string; counterStrategy: string }>;
  criticalReviews: Array<{ hotel: string; rating: number; text: string; source: string }>;
};

/**
 * Mengumpulkan fakta pasar terkini dari database Supabase untuk bahan laporan briefing pagi
 */
export async function compileMorningBriefingStats(): Promise<MorningBriefingStats> {
  const now = new Date();
  const dateStr = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });

  // 1. Ambil Heartbeat Terakhir
  const heartbeat = await db.marketInsight.findFirst({
    where: { fingerprint: "nightly-sync-heartbeat" },
    select: { summary: true },
  });

  // 2. Ambil Tarif Pasar Terkini
  const latestSanghyang = await db.sanghyangPriceSnapshot.findFirst({
    where: { packageName: "Google Hotels displayed rate" },
    orderBy: { observedAt: "desc" },
  });

  const latestCompetitorPrices = await db.competitorPriceSnapshot.findMany({
    where: { packageName: "Google Hotels displayed rate" },
    include: { competitor: { select: { name: true } } },
    orderBy: { observedAt: "desc" },
    take: 10,
  });

  // Ambil snapshot unik paling baru per kompetitor
  const seenCompetitors = new Set<string>();
  const rates: MorningBriefingStats["rates"] = [];

  if (latestSanghyang) {
    rates.push({
      hotel: "Sanghyang Indah Spa Resort",
      price: Number(latestSanghyang.price),
      currency: latestSanghyang.currency,
      checkIn: latestSanghyang.checkIn?.toISOString().split("T")[0] || "-",
    });
  }

  for (const p of latestCompetitorPrices) {
    if (!seenCompetitors.has(p.competitorId)) {
      seenCompetitors.add(p.competitorId);
      rates.push({
        hotel: p.competitor.name,
        price: Number(p.price),
        currency: p.currency,
        checkIn: p.checkIn?.toISOString().split("T")[0] || "-",
      });
    }
  }

  // 3. Ambil Promo Kompetitor Terkini (Maksimal 3 paling relevan)
  const promos = await db.competitorPromotion.findMany({
    where: { status: "new" },
    include: { competitor: { select: { name: true } } },
    orderBy: { startsAt: "desc" },
    take: 3,
  });

  // 4. Ambil Ulasan Rendah (Rating <= 3) dalam 48 jam terakhir
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const lowReviews = await db.competitorReview.findMany({
    where: {
      rating: { lte: 3 },
      reviewDate: { gte: twoDaysAgo },
    },
    include: { competitor: { select: { name: true } } },
    orderBy: { reviewDate: "desc" },
    take: 3,
  });

  return {
    dateStr,
    heartbeatSummary: heartbeat?.summary,
    rates,
    activePromos: promos.map((pr) => ({
      competitorName: pr.competitor.name,
      title: pr.title,
      counterStrategy: pr.description ? pr.description.slice(0, 140) + "..." : "Perkuat penawaran bundling Sanghyang.",
    })),
    criticalReviews: lowReviews.map((lr) => ({
      hotel: lr.competitor.name,
      rating: Number(lr.rating),
      text: lr.text.slice(0, 120) + (lr.text.length > 120 ? "..." : ""),
      source: lr.source,
    })),
  };
}

/**
 * Format naskah pesan briefing pagi untuk Telegram / WhatsApp
 */
export function formatMorningBriefingMessage(stats: MorningBriefingStats): string {
  const lines: string[] = [
    `🌅 *BRIEFING INTELIJEN PASAR SANGHYANG*`,
    `📅 *${stats.dateStr} (07:00 WIB)*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
  ];

  if (stats.heartbeatSummary) {
    lines.push(`⚡ *Otomasi Malam:* ${stats.heartbeatSummary}`);
    lines.push(``);
  }

  lines.push(`🏨 *TARIF PASAR TERKINI (Google Hotels 2 Dewasa):*`);
  if (stats.rates.length === 0) {
    lines.push(`• Belum ada tarif terpantau pagi ini.`);
  } else {
    const sanghyangRate = stats.rates.find((r) => r.hotel.includes("Sanghyang"))?.price;
    for (const r of stats.rates) {
      const isSanghyang = r.hotel.includes("Sanghyang");
      const diffText = isSanghyang
        ? `*(Baseline)*`
        : sanghyangRate != null
          ? `(${r.price > sanghyangRate ? "+" : ""}${r.currency} ${(r.price - sanghyangRate).toLocaleString("id-ID")})`
          : "";
      lines.push(
        `• ${isSanghyang ? "👑" : "🏨"} *${r.hotel}:* ${r.currency} ${r.price.toLocaleString("id-ID")} ${diffText} [Check-in: ${r.checkIn}]`
      );
    }
  }

  lines.push(``);
  lines.push(`🚨 *RADAR PROMO & EVENT KOMPETITOR:*`);
  if (stats.activePromos.length === 0) {
    lines.push(`• Tidak ada promo baru kompetitor yang terdeteksi semalam.`);
  } else {
    for (const p of stats.activePromos) {
      lines.push(`• *${p.competitorName}:* ${p.title}`);
      lines.push(`  💡 *Taktik Sanghyang:* ${p.counterStrategy}`);
    }
  }

  lines.push(``);
  lines.push(`⭐ *SENTIMEN & FEEDBACK PELANGGAN TERBARU:*`);
  if (stats.criticalReviews.length === 0) {
    lines.push(`• ✅ Kondisi aman: Tidak ada komplain/ulasan kritis baru (≤3★) dalam 48 jam.`);
  } else {
    lines.push(`• ⚠️ Perhatian Operasional:`);
    for (const cr of stats.criticalReviews) {
      lines.push(`  - [${cr.rating}★] *${cr.hotel}* (${cr.source}): "${cr.text}"`);
    }
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`💡 *Fokus Hari Ini:* Maksimalkan promosi Onsen Air Belerang Alami 24 Jam & Sunset Grill untuk mengimbangi lonjakan harga akhir pekan kompetitor.`);
  lines.push(`🔗 Dashboard: https://sanghyang-news.vercel.app/market-intelligence`);

  return lines.join("\n");
}

/**
 * Mengirimkan laporan briefing ke kanal komunikasi manajemen (Telegram Bot / Webhook)
 */
export async function sendMorningAlert(messageText: string): Promise<{
  delivered: boolean;
  channels: string[];
  briefingText: string;
}> {
  const channels: string[] = [];
  let delivered = false;

  // 1. Kanal Telegram Bot API
  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  const tgChatId = process.env.TELEGRAM_CHAT_ID;

  if (tgToken && tgChatId) {
    try {
      const tgUrl = `https://api.telegram.org/bot${tgToken}/sendMessage`;
      const res = await fetch(tgUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: tgChatId,
          text: messageText,
          parse_mode: "Markdown",
        }),
      });

      if (res.ok) {
        channels.push("Telegram Bot");
        delivered = true;
        console.log("[morning-alert] Berhasil dikirim ke Telegram Chat ID:", tgChatId);
      } else {
        const errJson = await res.text();
        console.warn("[morning-alert] Gagal kirim Telegram:", errJson);
      }
    } catch (err) {
      console.warn("[morning-alert] Error kirim Telegram:", (err as Error)?.message);
    }
  }

  // 2. Kanal Generic Alert Webhook (Discord / Slack / WhatsApp Gateway)
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: messageText,
          text: messageText,
        }),
      });

      if (res.ok) {
        channels.push("Alert Webhook");
        delivered = true;
        console.log("[morning-alert] Berhasil dikirim ke Webhook URL");
      } else {
        console.warn("[morning-alert] Webhook mengembalikan status:", res.status);
      }
    } catch (err) {
      console.warn("[morning-alert] Error kirim Webhook:", (err as Error)?.message);
    }
  }

  // Jika tidak ada token (lingkungan pengujian lokal), tampilkan di konsol
  if (channels.length === 0) {
    console.log("[morning-alert] Mode simulasi (TELEGRAM_BOT_TOKEN atau ALERT_WEBHOOK_URL belum disetel). Pesan disiapkan untuk broadcast.");
  }

  return { delivered, channels, briefingText: messageText };
}

