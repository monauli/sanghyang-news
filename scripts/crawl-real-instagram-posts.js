/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const puppeteer = require('puppeteer');
const fs = require('fs');

const profiles = [
  { name: 'Aston Anyer', username: 'astonanyer', url: 'https://www.instagram.com/astonanyer/' },
  { name: 'Novus Jiva', username: 'novusjivaanyer', url: 'https://www.instagram.com/novusjivaanyer/' },
  { name: 'Mambruk Hotel', username: 'mambrukhotelanyer', url: 'https://www.instagram.com/mambrukhotelanyer/' },
  { name: 'Andalan Beach', username: 'andalanbeach', url: 'https://www.instagram.com/andalanbeach/' },
  { name: 'Beach Point Anyer', username: 'beachpointanyer', url: 'https://www.instagram.com/beachpointanyer/' },
  { name: 'BM Seaside View', username: 'bmseasideview', url: 'https://www.instagram.com/bmseasideview/' },
  { name: 'Kalani Beach Resto', username: 'kalanibeachresto', url: 'https://www.instagram.com/kalanibeachresto/' },
  { name: 'Kamalika Beach', username: 'kamalikabeach', url: 'https://www.instagram.com/kamalikabeach/' },
  { name: 'Dewa Laut Carita', username: 'dewalautcarita', url: 'https://www.instagram.com/dewalautcarita/' },
  { name: 'The Jayakarta Anyer', username: 'thejayakartaanyer', url: 'https://www.instagram.com/thejayakartaanyer/' },
  { name: 'Marbella Anyer', username: 'marbellaplaceanyer', url: 'https://www.instagram.com/marbellaplaceanyer/' },
  { name: 'Mutiara Carita', username: 'mutiaracarita', url: 'https://www.instagram.com/mutiaracarita/' },
  { name: 'Movenpick Carita', username: 'movenpickresortcarita', url: 'https://www.instagram.com/movenpickresortcarita/' },
];

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1280, height: 800 });

  const results = {};

  for (const p of profiles) {
    console.log(`Crawling ${p.name} (${p.url})...`);
    try {
      await page.goto(p.url, { waitUntil: 'networkidle2', timeout: 30000 });
      // Scroll slightly to trigger lazy images/links
      await page.evaluate(() => window.scrollBy(0, 500));
      await new Promise(r => setTimeout(r, 2000));

      const data = await page.evaluate((uname) => {
        const anchors = Array.from(document.querySelectorAll('a'));
        const posts = [];
        for (const a of anchors) {
          const href = a.href;
          if ((href.includes('/p/') || href.includes('/reel/')) && !posts.includes(href)) {
            // Prefer posts owned by username or matching pattern
            posts.push(href);
          }
        }
        return posts;
      }, p.username);

      console.log(`-> Found ${data.length} posts for ${p.name}`);
      results[p.username] = data;
    } catch (e) {
      console.error(`Failed ${p.name}:`, e.message);
      results[p.username] = [];
    }
  }

  await browser.close();

  const outPath = '/home/user/Documents/sanghyang-news/scripts/crawled-instagram-posts.json';
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`Saved results to ${outPath}`);
})();

