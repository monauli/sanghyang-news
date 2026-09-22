import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

let failure: unknown;
try {
  execFileSync(
    process.execPath,
    ["node_modules/tsx/dist/cli.mjs", "-e", "import('./lib/db.ts')"],
    {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: "" },
      encoding: "utf8",
      stdio: "pipe",
    },
  );
} catch (error) {
  failure = error;
}

assert.ok(failure instanceof Error);
const stderr = String((failure as Error & { stderr?: string }).stderr ?? failure);
assert.match(stderr, /DATABASE_URL is required/);
assert.doesNotMatch(stderr, /postgresql:\/\/user:password/);

console.log("db config check passed without printing DATABASE_URL");
