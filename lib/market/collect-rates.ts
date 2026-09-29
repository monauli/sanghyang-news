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

export async function collectGoogleHotelMarketRates(options?: {
  checkIn?: Date;
  checkOut?: Date;
  targets?: HotelTarget[];
}): Promise<{ hotel: string; price: number; currency: string; sourceUrl: string }[]> {
  const checkIn = options?.checkIn ?? new Date("2026-10-11T00:00:00Z");
  const checkOut = options?.checkOut ?? new Date("2026-10-12T00:00:00Z");
  const targets = options?.targets ?? DEFAULT_HOTEL_TARGETS;

  const results: { hotel: string; price: number; currency: string; sourceUrl: string }[] = [];

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
      console.error(`[collect-rates] Failed to fetch rate for ${hotel.name}:`, error);
      continue;
    }

    if (!rate) {
      console.warn(`[collect-rates] No rate found for ${hotel.name}`);
      continue;
    }

    const observedAt = new Date();

    if (hotel.competitorId) {
      await db.competitorPriceSnapshot.deleteMany({
        where: { competitorId: hotel.competitorId, packageName: HOTEL_PACKAGE_NAME },
      });
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
    } else {
      await db.sanghyangPriceSnapshot.deleteMany({
        where: { packageName: HOTEL_PACKAGE_NAME },
      });
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

    results.push({
      hotel: hotel.name,
      price: rate.price,
      currency: rate.currency,
      sourceUrl: rate.sourceUrl,
    });
  }

  return results;
}
