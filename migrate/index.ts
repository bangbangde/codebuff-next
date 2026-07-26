import path from "node:path";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import { getPostgresConfig } from "../lib/db/config";

const migrationsFolder = path.join(__dirname, "drizzle");

function describeMigrationError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const databasePassword = process.env.PG_PWD;

  return databasePassword
    ? message.replaceAll(databasePassword, "[redacted]")
    : message;
}

async function runMigrations(): Promise<void> {
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

void runMigrations().catch((error: unknown) => {
  console.error(`Database migration failed: ${describeMigrationError(error)}`);
  process.exitCode = 1;
});
