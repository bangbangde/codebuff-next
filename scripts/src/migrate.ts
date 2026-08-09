import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import { getPostgresConfig } from "../../lib/db/config";

const migrationsFolder = fileURLToPath(new URL("./drizzle", import.meta.url));

export async function migrateDatabase(): Promise<void> {
  console.info("Applying pending database migrations...");

  const pool = new Pool(
    getPostgresConfig({ max: 1, application_name: "codebuff-next-migrate" }),
  );

  try {
    await migrate(drizzle(pool), { migrationsFolder });
    console.info("Database migrations are up to date.");
  } finally {
    await pool.end();
  }
}
