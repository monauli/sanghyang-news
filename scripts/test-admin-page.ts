import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import puppeteer from "puppeteer";

const password = "admin-page-check";
const source = {
  id: "source-1", name: "Antara", domain: "https://example.com", category: "news", enabled: true,
  priority: 0, intervalMinutes: null, lastRunAt: "2026-09-22T00:00:00.000Z",
  lastSuccessAt: "2026-09-22T00:00:00.000Z", failureCount: 2,
};
const run = (id: string, status: "running" | "success") => ({
  id, sourceId: source.id, job: "news", status, startedAt: "2026-09-22T00:00:00.000Z",
  finishedAt: status === "success" ? "2026-09-22T00:01:00.000Z" : null,
  recordsDiscovered: 7, recordsSaved: 5, duplicates: 2, errors: 1, createdAt: "2026-09-22T00:00:00.000Z",
});

async function freePort() {
  return await new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as { port: number };
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

async function waitForServer(base: string) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const response = await fetch(`${base}/api/login`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }),
      });
      if (response.ok) return response.headers.get("set-cookie")?.split(";")[0] ?? "";
    } catch {
      // The dev server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Next dev server did not become ready");
}

void (async () => {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "-p", String(port)], {
    cwd: process.cwd(), env: { ...process.env, APP_PASSWORD: password }, stdio: "ignore",
  });
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;

  try {
    const session = await waitForServer(base);
    const anonymous = await fetch(`${base}/admin/scraping`, { redirect: "manual" });
    assert.equal(anonymous.status, 307);
    assert.equal(anonymous.headers.get("location"), "/login");

    let mode: "data" | "empty" | "error" = "data";
    let started = false;
    let pollsAfterStart = 0;
    let getRequests = 0;
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setCookie({ name: session.split("=")[0], value: session.split("=").slice(1).join("="), url: base });
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.pathname !== "/api/admin/scraping") return void request.continue();
      if (request.method() === "POST") {
        started = true;
        setTimeout(() => void request.respond({ status: 202, contentType: "application/json", body: JSON.stringify({ runId: "run-1", status: "running" }) }), 250);
        return;
      }
      getRequests++;
      if (mode === "error") return void request.respond({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "postgresql://admin:password@example.com/secret" }) });
      if (mode === "empty") return void request.respond({ contentType: "application/json", body: JSON.stringify({ sources: [], runs: [] }) });
      const target = started ? pollsAfterStart++ : 2;
      const runs = target === 0 ? [run("unrelated-run", "running")] : [run("run-1", target === 1 ? "running" : "success"), run("unrelated-run", "running")];
      return void request.respond({ contentType: "application/json", body: JSON.stringify({ sources: [source], runs }) });
    });

    const pageResponse = await page.goto(`${base}/admin/scraping`, { waitUntil: "domcontentloaded" });
    assert.equal(pageResponse?.status(), 200, "the protected admin page must exist");
    await page.waitForFunction(() => document.body.innerText.includes("Memuat status pengambilan berita…"));
    await page.waitForFunction(() => document.body.innerText.includes("Antara"));
    assert.match(await page.evaluate(() => document.body.innerText), /Aktif[\s\S]*2 kegagalan berturut-turut[\s\S]*Ditemukan: 7[\s\S]*Disimpan: 5/);
    const requestsBeforeClick = getRequests;
    await new Promise((resolve) => setTimeout(resolve, 1_200));
    assert.equal(getRequests, requestsBeforeClick, "the page must not poll before a user starts a run");

    await page.evaluate(() => (Array.from(document.querySelectorAll("button")).find((button) => button.textContent === "Run News Now") as HTMLButtonElement).click());
    await page.waitForFunction(() => document.body.innerText.includes("Menjalankan…"));
    await page.waitForFunction(() => document.body.innerText.includes("Sedang berjalan…"), { timeout: 5_000 });
    await page.waitForFunction(() => document.body.innerText.includes("Selesai") && !document.body.innerText.includes("Sedang berjalan"), { timeout: 5_000 });
    const requestsAtTerminal = getRequests;
    await new Promise((resolve) => setTimeout(resolve, 1_200));
    assert.equal(getRequests, requestsAtTerminal, "polling must stop after a terminal run status");

    mode = "empty";
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.innerText.includes("Belum ada riwayat pengambilan berita."));

    mode = "error";
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.innerText.includes("Tidak dapat memuat status pengambilan berita."));
    assert.doesNotMatch(await page.evaluate(() => document.body.innerText), /postgresql:|password|secret/);

    console.log("admin page checks passed");
  } finally {
    await browser?.close();
    child.kill();
    await new Promise((resolve) => child.once("exit", resolve));
  }
})();
