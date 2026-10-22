import { db } from "../db";
import { fetchGoogleHotelRate, type GoogleHotelRate } from "./google-hotel-rate";

export type HotelTarget = {
  name: string;
  competitorId?: string;
  url: string;
};

export const DEFAULT_HOTEL_TARGETS: HotelTarget[] = [
  {
    name: "Sanghyang",
    url: "https://www.google.co.id/travel/hotels/entity/ChcI3eSggaqXsutkGgsvZy8xdGd6a2psZhAB",
  },
  {
    name: "Aston Anyer Beach Hotel",
    competitorId: "10000000-0000-4000-8000-000000000001",
    url: "https://www.google.com/travel/hotels/entity/CgsIyMeqy4H4hJPOARAB",
  },
  {
    name: "Mambruk Hotel & Convention",
    competitorId: "10000000-0000-4000-8000-000000000002",
    url: "https://www.google.com/travel/hotels/entity/CgoInq6j7auKrqlzEAE",
  },
  {
    name: "The Jayakarta Villas Anyer Beach Resort",
    competitorId: "10000000-0000-4000-8000-000000000003",
    url: "https://www.google.com/travel/hotels/entity/ChgI_9neisz9vOACGgwvZy8xcHpwaGt4MnMQAQ",
  },
];

export const HOTEL_PACKAGE_NAME = "Google Hotels displayed rate";

export type DynamicDatePair = {
  label: "tomorrow" | "weekend";
  checkIn: Date;
  checkOut: Date;
};

/**
 * Menghitung tanggal menginap target secara dinamis setiap kali cron berjalan:
 * 1. Besok malam (last-minute weekday/weekend rate)
 * 2. Sabtu terdekat mendatang (peak weekend staycation rate)
 */
export function getDynamicTargetDates(baseDate: Date = new Date()): {
  tomorrow: DynamicDatePair;
  weekend: DynamicDatePair;
} {
  const y = baseDate.getFullYear();
  const m = baseDate.getMonth();
  const d = baseDate.getDate();

  // Besok (+1 hari)
  const tomorrowCheckIn = new Date(Date.UTC(y, m, d + 1, 0, 0, 0));
  const tomorrowCheckOut = new Date(Date.UTC(y, m, d + 2, 0, 0, 0));

  // Sabtu terdekat mendatang
  const dayOfWeek = baseDate.getDay(); // 0: Minggu, 6: Sabtu
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
  const weekendCheckIn = new Date(Date.UTC(y, m, d + daysUntilSaturday, 0, 0, 0));
  const weekendCheckOut = new Date(Date.UTC(y, m, d + daysUntilSaturday + 1, 0, 0, 0));

  return {
    tomorrow: { label: "tomorrow", checkIn: tomorrowCheckIn, checkOut: tomorrowCheckOut },
    weekend: { label: "weekend", checkIn: weekendCheckIn, checkOut: weekendCheckOut },
  };
}

export type CollectRatesOptions = {
  checkIn?: Date;
  checkOut?: Date;
  targets?: HotelTarget[];
  dateMode?: "tomorrow" | "weekend" | "both";
};

export type CollectedRateResult = {
  hotel: string;
  price: number;
  currency: string;
  sourceUrl: string;
  checkIn: Date;
  checkOut: Date;
};

export async function collectGoogleHotelMarketRates(
  options?: CollectRatesOptions
): Promise<CollectedRateResult[]> {
  const targets = options?.targets ?? DEFAULT_HOTEL_TARGETS;
  const dynamicDates = getDynamicTargetDates();

  // Tentukan pasangan tanggal yang akan dikumpulkan
  const datePairs: { checkIn: Date; checkOut: Date }[] = [];
  if (options?.checkIn && options?.checkOut) {
    datePairs.push({ checkIn: options.checkIn, checkOut: options.checkOut });
  } else if (options?.dateMode === "weekend") {
    datePairs.push(dynamicDates.weekend);
  } else if (options?.dateMode === "both") {
    datePairs.push(dynamicDates.tomorrow);
    datePairs.push(dynamicDates.weekend);
  } else {
    // Default: besok malam (last-minute market rate)
    datePairs.push(dynamicDates.tomorrow);
  }

  const results: CollectedRateResult[] = [];

  for (const { checkIn, checkOut } of datePairs) {
    for (const hotel of targets) {
      let rate: GoogleHotelRate | null = null;
      try {
        rate = await fetchGoogleHotelRate(hotel.url, {
          hotelName: hotel.name,
          checkIn,
          checkOut,
          guests: 2,
        });
      } catch (error) {
        console.error(`[collect-rates] Gagal mengambil tarif ${hotel.name} (${checkIn.toISOString().split("T")[0]}):`, error);
        continue;
      }

      if (!rate) {
        console.warn(`[collect-rates] Tarif tidak ditemukan untuk ${hotel.name} (${checkIn.toISOString().split("T")[0]})`);
        continue;
      }

      const observedAt = new Date();
      // Jendela hari ini (12 jam terakhir) untuk idempotency tanpa menghapus histori kemarin
      const twelveHoursAgo = new Date(observedAt.getTime() - 12 * 60 * 60 * 1000);

      if (hotel.competitorId) {
        // Cari apakah sudah ada snapshot hari ini untuk hotel & tanggal checkIn yang sama
        const existingSnapshot = await db.competitorPriceSnapshot.findFirst({
          where: {
            competitorId: hotel.competitorId,
            packageName: HOTEL_PACKAGE_NAME,
            checkIn: rate.checkIn,
            observedAt: { gte: twelveHoursAgo },
          },
        });

        if (existingSnapshot) {
          await db.competitorPriceSnapshot.update({
            where: { id: existingSnapshot.id },
            data: {
              price: rate.price,
              currency: rate.currency,
              guests: rate.guests,
              checkIn: rate.checkIn,
              checkOut: rate.checkOut,
              source: rate.source,
              sourceUrl: rate.sourceUrl,
              observedAt,
              version: { increment: 1 },
            },
          });
        } else {
          await db.competitorPriceSnapshot.create({
            data: {
              competitorId: hotel.competitorId,
              roomName: "Market rate",
              packageName: HOTEL_PACKAGE_NAME,
              price: rate.price,
              currency: rate.currency,
              guests: rate.guests,
              checkIn: rate.checkIn,
              checkOut: rate.checkOut,
              source: rate.source,
              sourceUrl: rate.sourceUrl,
              observedAt,
            },
          });
        }
      } else {
        // Sanghyang Price Snapshot
        const existingSanghyang = await db.sanghyangPriceSnapshot.findFirst({
          where: {
            packageName: HOTEL_PACKAGE_NAME,
            checkIn: rate.checkIn,
            observedAt: { gte: twelveHoursAgo },
          },
        });

        if (existingSanghyang) {
          await db.sanghyangPriceSnapshot.update({
            where: { id: existingSanghyang.id },
            data: {
              price: rate.price,
              currency: rate.currency,
              guests: rate.guests,
              checkIn: rate.checkIn,
              checkOut: rate.checkOut,
              source: rate.source,
              sourceUrl: rate.sourceUrl,
              observedAt,
              version: { increment: 1 },
            },
          });
        } else {
          await db.sanghyangPriceSnapshot.create({
            data: {
              roomName: "Market rate",
              packageName: HOTEL_PACKAGE_NAME,
              price: rate.price,
              currency: rate.currency,
              guests: rate.guests,
              checkIn: rate.checkIn,
              checkOut: rate.checkOut,
              source: rate.source,
              sourceUrl: rate.sourceUrl,
              observedAt,
            },
          });
        }
      }

      results.push({
        hotel: hotel.name,
        price: rate.price,
        currency: rate.currency,
        sourceUrl: rate.sourceUrl,
        checkIn: rate.checkIn,
        checkOut: rate.checkOut,
      });
    }
  }

  return results;
}
