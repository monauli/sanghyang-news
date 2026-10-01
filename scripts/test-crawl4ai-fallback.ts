import assert from "node:assert/strict";
import { createCrawl4AIFallback } from "../lib/market/browser-fallback";

const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
const fallback = createCrawl4AIFallback({
  endpoint: "http://crawl4ai.test/md",
  token: "test-token",
  fetcher: async (input, init) => {
    calls.push({ input, init });
    return new Response(JSON.stringify({ url: "https://example.com/article", fit_markdown: "# Preferred\n\nBody", markdown: "# Other", metadata: { title: "Metadata title" } }), { status: 200 });
  },
});

assert.ok(fallback);

(async () => {
  const result = await fallback("https://example.com");
  assert.deepEqual(result, {
    article: { title: "Metadata title", canonicalUrl: "https://example.com/article", content: "# Preferred\n\nBody" },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input, "http://crawl4ai.test/md");
  assert.equal(calls[0].init?.method, "POST");
  assert.equal(new Headers(calls[0].init?.headers).get("authorization"), "Bearer test-token");
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { url: "https://example.com" });

  const disabled = createCrawl4AIFallback({ endpoint: "" });
  assert.equal(disabled, undefined);

  const rejected = createCrawl4AIFallback({
    endpoint: "http://crawl4ai.test/md",
    fetcher: async () => new Response("", { status: 503 }),
  });
  assert.ok(rejected);
  const failure = await rejected("https://example.com");
  assert.ok("error" in failure);
  if ("error" in failure) assert.match(failure.error.message, /503/);

  console.log("Crawl4AI fallback tests passed.");
})();
