import type { PoolConfig } from "pg";

const DEFAULT_HOST = "postgres";
const DEFAULT_PORT = 5432;
const DEFAULT_DATABASE = "codebuff_next";
const DEFAULT_POOL_MAX = 5;

function requiredEnvironmentVariable(name: "PG_USER" | "PG_PWD"): string {
  const rawValue = process.env[name];
  const value = name === "PG_USER" ? rawValue?.trim() : rawValue;

  if (!value) {
    throw new Error(`Missing required database environment variable: ${name}`);
  }

  return value;
}

function positiveIntegerEnvironmentVariable(
  name: "PG_PORT" | "PG_POOL_MAX",
  fallback: number,
): number {
  const rawValue = process.env[name]?.trim();

  if (!rawValue) {
    return fallback;
  }

  const value = Number(rawValue);

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
}

export function getPostgresConfig(
  overrides: Pick<PoolConfig, "max" | "application_name"> = {},
): PoolConfig {
  return {
    host: process.env.PG_HOST?.trim() || DEFAULT_HOST,
    port: positiveIntegerEnvironmentVariable("PG_PORT", DEFAULT_PORT),
    database: process.env.PG_DB?.trim() || DEFAULT_DATABASE,
    user: requiredEnvironmentVariable("PG_USER"),
    password: requiredEnvironmentVariable("PG_PWD"),
    max:
      overrides.max ??
      positiveIntegerEnvironmentVariable("PG_POOL_MAX", DEFAULT_POOL_MAX),
    ...(overrides.application_name
      ? { application_name: overrides.application_name }
      : {}),
  };
}
