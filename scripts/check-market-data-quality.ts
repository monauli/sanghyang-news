import { db } from "../lib/db";
import { isMarketRelevant } from "../lib/market/classifier";

async function main() {
const now = new Date();
const articles = await db.article.findMany({
  select: {
    title: true,
    description: true,
    canonicalUrl: true,
    publishedAt: true,
    marketItem: { select: { kind: true } },
    source: { select: { name: true } },
  },
});
const [competitorPrices, sanghyangPrices] = await Promise.all([
  db.competitorPriceSnapshot.findMany({ select: { packageName: true, roomName: true } }),
  db.sanghyangPriceSnapshot.findMany({ select: { packageName: true, roomName: true } }),
]);

const normalizedTitles = new Map<string, number>();
for (const article of articles) {
  const title = article.title.trim().toLowerCase().replace(/\s+/g, " ");
  normalizedTitles.set(title, (normalizedTitles.get(title) ?? 0) + 1);
}

const duplicateTitleRows = [...normalizedTitles.values()]
  .filter((count) => count > 1)
  .reduce((total, count) => total + count, 0);
const kindCounts = Object.fromEntries(
  ["fnb", "event", "entertainment", "destination"].map((kind) => [
    kind,
    articles.filter((article) => article.marketItem?.kind === kind).length,
  ]),
);
const sourceCounts = Object.fromEntries(
  [...new Set(articles.map((article) => article.source.name))].map((source) => [
    source,
    articles.filter((article) => article.source.name === source).length,
  ]),
);
const priceRows = [...competitorPrices, ...sanghyangPrices];
const marketRateRows = priceRows.filter((row) => row.packageName === "Google Hotels displayed rate").length;
const exactPriceRows = priceRows.length - marketRateRows;
const report = {
  articles: articles.length,
  categorized: articles.filter((article) => article.marketItem).length,
  relevantCategorized: articles.filter((article) => article.marketItem && isMarketRelevant({ title: article.title, text: article.description ?? "" })).length,
  missingTitles: articles.filter((article) => !article.title.trim()).length,
  missingDates: articles.filter((article) => !article.publishedAt).length,
  futureDates: articles.filter((article) => article.publishedAt && article.publishedAt > now).length,
  invalidUrls: articles.filter((article) => article.canonicalUrl && !/^https?:\/\//i.test(article.canonicalUrl)).length,
  duplicateTitleRows,
  kindCounts,
  sourceCounts,
  priceRows: { total: priceRows.length, marketRateRows, exactPriceRows },
};

console.log(JSON.stringify(report, null, 2));
if (report.missingTitles || report.missingDates || report.invalidUrls || report.futureDates) {
  process.exitCode = 1;
}
await db.$disconnect();
}

void main();
