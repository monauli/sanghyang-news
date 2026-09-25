import puppeteer from "puppeteer";

export type GoogleHotelRate = {
  hotelName: string;
  price: number;
  currency: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  source: "Google Hotels lowest displayed rate";
  sourceUrl: string;
  observedAt: Date;
};

export function parseDisplayedRate(text: string, context: Omit<GoogleHotelRate, "price" | "currency" | "source" | "observedAt">): GoogleHotelRate | null {
  const prices = [...text.matchAll(/(?:Rp|IDR)\s*([\d.]+)/gi)]
    .map((match) => Number(match[1].replace(/\./g, "")))
    .filter((price) => Number.isFinite(price) && price > 0);
  if (!prices.length) return null;
  return { ...context, price: Math.min(...prices), currency: "IDR", source: "Google Hotels lowest displayed rate", observedAt: new Date() };
}

export async function fetchGoogleHotelRate(url: string, context: Omit<GoogleHotelRate, "price" | "currency" | "source" | "sourceUrl" | "observedAt">) {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const target = `${url}${url.includes("?") ? "&" : "?"}hl=id&checkin=${context.checkIn.toISOString().slice(0, 10)}&checkout=${context.checkOut.toISOString().slice(0, 10)}&adults=${context.guests}`;
    await page.goto(target, { waitUntil: "networkidle2", timeout: 30_000 });
    return parseDisplayedRate(await page.evaluate(() => document.body.innerText), { ...context, sourceUrl: target });
  } finally {
    await browser.close();
  }
}
