export type PriceSnapshot = {
  roomName: string;
  price: number;
  currency: string;
  guests: number;
  checkIn: Date;
  checkOut: Date;
  source: string;
  sourceUrl: string;
  competitorId?: string;
};

type JsonObject = Record<string, unknown>;

const asObjects = (value: unknown): JsonObject[] => {
  if (Array.isArray(value)) return value.flatMap(asObjects);
  if (!value || typeof value !== "object") return [];
  const object = value as JsonObject;
  return [object, ...asObjects(object["@graph"]), ...asObjects(object.itemOffered), ...asObjects(object.offers)];
};

export function parsePriceSnapshots(html: string, context: Omit<PriceSnapshot, "roomName" | "price" | "currency"> & { currency?: string }): PriceSnapshot[] {
  const results: PriceSnapshot[] = [];
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of scripts) {
    try {
      for (const item of asObjects(JSON.parse(match[1]))) {
        const offer = (item.offers && typeof item.offers === "object" ? item.offers : item) as JsonObject;
        const price = Number(offer.price ?? item.price);
        const roomName = String(item.name ?? item.roomName ?? offer.name ?? "").trim();
        const currency = String(offer.priceCurrency ?? item.priceCurrency ?? context.currency ?? "IDR").trim().toUpperCase();
        if (roomName && Number.isFinite(price) && price >= 0) results.push({ ...context, roomName, price, currency });
      }
    } catch {
      // Ignore malformed JSON-LD; another script or a browser fallback may still contain a price.
    }
  }
  return results;
}

export function matchComparablePrices<T extends PriceSnapshot, U extends PriceSnapshot>(sanghyang: T[], competitors: U[]) {
  return competitors.flatMap((competitor) => {
    const baseline = sanghyang.find((item) => item.roomName === competitor.roomName && item.currency === competitor.currency && item.guests === competitor.guests && item.checkIn.getTime() === competitor.checkIn.getTime() && item.checkOut.getTime() === competitor.checkOut.getTime());
    return baseline ? [{ baseline, competitor, difference: Number((competitor.price - baseline.price).toFixed(2)) }] : [];
  });
}
