import { NextResponse } from "next/server";

const SOURCE_URL = "https://trends.google.com/trending/rss?geo=ID";
const relevantTerms = /hotel|resort|anyer|carita|cinangka|cilegon|serang|banten|pantai|wisata|pariwisata|travel|liburan|kuliner|restoran|cafe|event|festival|hiburan|konser|spa|villa|penginapan|akomodasi|destinasi/i;

const textBetween = (xml: string, tag: string) => {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return match?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim() ?? "";
};

export async function GET() {
  try {
    const response = await fetch(SOURCE_URL, { headers: { "User-Agent": "Sanghyang Highlights/1.0" }, next: { revalidate: 900 } });
    if (!response.ok) throw new Error(`Google Trends RSS returned ${response.status}`);
    const xml = await response.text();
    const trends = xml.split("<item>").slice(1).map((item) => {
      const topic = textBetween(item, "title");
      return { topic, traffic: textBetween(item, "ht:approx_traffic"), publishedAt: textBetween(item, "pubDate"), relevant: relevantTerms.test(topic) };
    }).filter((item) => item.topic).slice(0, 8);
    return NextResponse.json({ location: "Indonesia", source: SOURCE_URL, fetchedAt: new Date().toISOString(), trends });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Google Trends tidak dapat dimuat." }, { status: 502 });
  }
}
