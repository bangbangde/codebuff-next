import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";
import { getPostgresConfig } from "./config";

function createDatabase() {
  return drizzle(getPostgresPool(), { schema });
}

const databaseGlobals = globalThis as typeof globalThis & {
  codebuffDatabase?: ReturnType<typeof createDatabase>;
  codebuffPool?: Pool;
};

export function getPostgresPool(): Pool {
  databaseGlobals.codebuffPool ??= new Pool(
    getPostgresConfig({ application_name: "codebuff-next" }),
  );

  return databaseGlobals.codebuffPool;
}

export function getDatabase(): ReturnType<typeof createDatabase> {
  databaseGlobals.codebuffDatabase ??= createDatabase();

  return databaseGlobals.codebuffDatabase;
}
