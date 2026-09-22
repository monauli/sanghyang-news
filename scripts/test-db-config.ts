import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const sentinel = `DATABASE_URL_SENTINEL_${Date.now()}_${Math.random().toString(36).slice(2)}`;
let failure: unknown;
try {
  execFileSync(
    process.execPath,
    [
      "node_modules/tsx/dist/cli.mjs",
      "-e",
      "import { getDatabaseUrl } from './lib/db.ts'; try { getDatabaseUrl({}); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exit(1); }",
    ],
    {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: sentinel },
      encoding: "utf8",
      stdio: "pipe",
    },
  );
} catch (error) {
  failure = error;
}

assert.ok(failure instanceof Error);
const childOutput = failure as Error & { stdout?: string; stderr?: string };
const stdout = String(childOutput.stdout ?? "");
const stderr = String(childOutput.stderr ?? failure);
assert.match(stderr, /DATABASE_URL is required/);
assert.ok(!stdout.includes(sentinel));
assert.ok(!stderr.includes(sentinel));

console.log("db config check passed without printing DATABASE_URL");
