import { fetchGoogleHotelRate } from "../lib/market/google-hotel-rate";

const dates = { checkIn: new Date("2026-10-10T00:00:00Z"), checkOut: new Date("2026-10-12T00:00:00Z"), guests: 2 };
const hotels = [
  ["Sanghyang", "https://www.google.co.id/travel/hotels/entity/ChcI3eSggaqXsutkGgsvZy8xdGd6a2psZhAB"],
  ["Aston Anyer", "https://www.google.com/travel/hotels/entity/CgsIyMeqy4H4hJPOARAB"],
  ["Mambruk", "https://www.google.com/travel/hotels/entity/CgoInq6j7auKrqlzEAE"],
  ["Jayakarta Anyer", "https://www.google.com/travel/hotels/entity/ChgI_9neisz9vOACGgwvZy8xcHpwaGt4MnMQAQ"],
];

async function main() {
  for (const [hotelName, url] of hotels) {
    try {
      const rate = await fetchGoogleHotelRate(url, { hotelName, ...dates });
      console.log(JSON.stringify(rate ?? { hotelName, rate: null, reason: "No displayed IDR rate" }));
    } catch (error) {
      console.log(JSON.stringify({ hotelName, error: error instanceof Error ? error.message : String(error) }));
    }
  }
}

main();
