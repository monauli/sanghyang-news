import { searchAll } from "../googlenews";
import type { Scraper } from "./scraper";

type SearchAll = typeof searchAll;

export function createRssScraper({ searchAll: search = searchAll, now = () => new Date() }: { searchAll?: SearchAll; now?: () => Date } = {}): Scraper {
  return {
    async scrape() {
      const date = now().toISOString().slice(0, 10);
      const { articles } = await search(date, date);
      return articles.map((article) => ({
        title: article.title,
        canonicalUrl: article.link,
        ...(article.pubDate ? { publishedAt: new Date(`${article.pubDate}T00:00:00.000Z`) } : {}),
        ...(article.desc ? { description: article.desc } : {}),
      }));
    },
  };
}
