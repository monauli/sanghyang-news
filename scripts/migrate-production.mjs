import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

if (process.env.VERCEL_ENV !== "production") process.exit(0);

async function main() {
  const migrationsPath = new URL("../prisma/migrations/", import.meta.url);
  const pendingMigration = "20261011000000_add_occ_version_columns";
  const previousMigrations = readdirSync(migrationsPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== pendingMigration)
    .map((entry) => entry.name);
  const prisma = new PrismaClient();

  try {
    const applied = await prisma.$queryRawUnsafe(
      'SELECT "migration_name" FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL',
    );
    const appliedMigrations = new Set(applied.map((migration) => migration.migration_name));
    const missing = previousMigrations.filter((migration) => !appliedMigrations.has(migration));

    if (missing.length > 0) {
      throw new Error(`Refusing production migration; historical migrations are not recorded as applied: ${missing.join(", ")}`);
    }
  } finally {
    await prisma.$disconnect();
  }

  const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
