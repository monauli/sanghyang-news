import { db } from "../lib/db";
import { fetchGoogleHotelRate } from "../lib/market/google-hotel-rate";

const checkIn = new Date("2026-10-10T00:00:00Z");
const checkOut = new Date("2026-10-12T00:00:00Z");
const packageName = "Google Hotels displayed rate";
const hotels = [
  { name: "Sanghyang", url: "https://www.google.co.id/travel/hotels/entity/ChcI3eSggaqXsutkGgsvZy8xdGd6a2psZhAB" },
  { name: "Aston Anyer Beach Hotel", competitorId: "10000000-0000-4000-8000-000000000001", url: "https://www.google.com/travel/hotels/entity/CgsIyMeqy4H4hJPOARAB" },
  { name: "Mambruk Hotel & Convention", competitorId: "10000000-0000-4000-8000-000000000002", url: "https://www.google.com/travel/hotels/entity/CgoInq6j7auKrqlzEAE" },
];

async function main() {
  for (const hotel of hotels) {
    const rate = await fetchGoogleHotelRate(hotel.url, { hotelName: hotel.name, checkIn, checkOut, guests: 2 });
    if (!rate) { console.log(`${hotel.name}: no displayed rate`); continue; }
    if (hotel.competitorId) {
      await db.competitorPriceSnapshot.deleteMany({ where: { competitorId: hotel.competitorId, packageName, checkIn, checkOut, guests: 2 } });
      await db.competitorPriceSnapshot.create({ data: { competitorId: hotel.competitorId, roomName: "Market rate", packageName, price: rate.price, currency: rate.currency, guests: rate.guests, checkIn: rate.checkIn, checkOut: rate.checkOut, source: rate.source, sourceUrl: rate.sourceUrl, observedAt: rate.observedAt } });
    } else {
      await db.sanghyangPriceSnapshot.deleteMany({ where: { roomName: "Market rate", packageName, checkIn, checkOut, guests: 2 } });
      await db.sanghyangPriceSnapshot.create({ data: { roomName: "Market rate", packageName, price: rate.price, currency: rate.currency, guests: rate.guests, checkIn: rate.checkIn, checkOut: rate.checkOut, source: rate.source, sourceUrl: rate.sourceUrl, observedAt: rate.observedAt } });
    }
    console.log(`${hotel.name}: IDR ${rate.price.toLocaleString("id-ID")}`);
  }
}

main().finally(() => db.$disconnect());
