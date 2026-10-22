import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const snapshotPath = path.join(root, "deploy", "snapshot.json");
const reportDir = path.join(root, "deploy", "reports");
const outputDir = path.join(root, "deploy", "public");

let snapshot;
try {
  snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
} catch {
  throw new Error("Snapshot deployment tidak tersedia. Jalankan `uv run python scripts/export_vercel_snapshot.py` terlebih dahulu.");
}
if (!snapshot.run?.id || !["completed", "partial"].includes(snapshot.run.status) || !snapshot.run.report) {
  throw new Error("Snapshot harus memiliki run completed/partial beserta laporan.");
}

const entityIds = snapshot.entities.map((entity) => entity.id);
if (entityIds.some((id) => typeof id !== "string" || !/^[a-z0-9-]+$/.test(id))) {
  throw new Error("ID unit pada snapshot tidak valid.");
}
const reportFiles = ["portfolio.html", ...entityIds.map((id) => `${id}.html`)];
for (const report of reportFiles) {
  try {
    if (!(await readFile(path.join(reportDir, report), "utf8")).startsWith("<!doctype html>")) throw new Error();
  } catch {
    throw new Error(`Laporan deployment tidak tersedia: ${report}`);
  }
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await cp(path.join(root, "app", "static"), path.join(outputDir, "static"), {
  recursive: true,
  filter: (source) => path.basename(source) !== "index.html",
});
const htmlPath = path.join(root, "app", "static", "index.html");
const html = (await readFile(htmlPath, "utf8")).replace(
  "</head>",
  '<meta name="deployment-mode" content="snapshot"></head>',
);
await writeFile(path.join(outputDir, "index.html"), html);
