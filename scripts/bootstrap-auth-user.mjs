import { randomUUID } from "node:crypto";
import process from "node:process";

import { hashPassword } from "better-auth/crypto";
import pg from "pg";

const { Client } = pg;

function requiredEnvironmentVariable(name, { trim = true } = {}) {
  const rawValue = process.env[name];
  const value = trim ? rawValue?.trim() : rawValue;

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function positiveIntegerEnvironmentVariable(name, fallback) {
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

function booleanEnvironmentVariable(name, fallback = false) {
  const rawValue = process.env[name]?.trim();

  if (!rawValue) {
    return fallback;
  }

  if (rawValue === "true") {
    return true;
  }

  if (rawValue === "false") {
    return false;
  }

  throw new Error(`${name} must be either true or false`);
}

function redactSecrets(value, secrets) {
  let message = value instanceof Error ? value.message : String(value);

  for (const secret of secrets) {
    if (secret) {
      message = message.replaceAll(secret, "[redacted]");
    }
  }

  return message;
}

const secretsToRedact = [
  process.env.AUTH_BOOTSTRAP_PASSWORD,
  process.env.PG_PWD,
  process.env.BETTER_AUTH_SECRET,
  process.env.BETTER_AUTH_SECRETS,
];

async function bootstrapAuthUser() {
  const password = requiredEnvironmentVariable("AUTH_BOOTSTRAP_PASSWORD", {
    trim: false,
  });
  const name = requiredEnvironmentVariable("AUTH_BOOTSTRAP_NAME");
  const email = requiredEnvironmentVariable(
    "AUTH_BOOTSTRAP_EMAIL",
  ).toLowerCase();
  const databasePassword = requiredEnvironmentVariable("PG_PWD", {
    trim: false,
  });
  const bootstrapIfMissing = booleanEnvironmentVariable(
    "AUTH_BOOTSTRAP_IF_MISSING",
  );

  if (name.length > 100) {
    throw new Error("AUTH_BOOTSTRAP_NAME must be at most 100 characters");
  }

  if (email.length > 320 || !/^[^\s@]+@[^\s@]+$/.test(email)) {
    throw new Error("AUTH_BOOTSTRAP_EMAIL must be a valid email address");
  }

  if (password.length < 15 || password.length > 128) {
    throw new Error(
      "AUTH_BOOTSTRAP_PASSWORD must be between 15 and 128 characters",
    );
  }

  const client = new Client({
    host: process.env.PG_HOST?.trim() || "postgres",
    port: positiveIntegerEnvironmentVariable("PG_PORT", 5432),
    database: process.env.PG_DB?.trim() || "codebuff_next",
    user: requiredEnvironmentVariable("PG_USER"),
    password: databasePassword,
    application_name: "codebuff-next-auth-bootstrap",
    connectionTimeoutMillis: positiveIntegerEnvironmentVariable(
      "PG_CONNECTION_TIMEOUT_MS",
      10_000,
    ),
  });

  try {
    await client.connect();
    await client.query("BEGIN");

    const existingAccount = await client.query(
      'SELECT 1 FROM "user" WHERE email = $1 LIMIT 1',
      [email],
    );

    if (existingAccount.rowCount) {
      if (!bootstrapIfMissing) {
        throw new Error("An authentication account already exists");
      }

      await client.query("ROLLBACK");
      console.info("Authentication account already exists; skipping.");
    } else {
      const userId = randomUUID();
      const passwordHash = await hashPassword(password);

      await client.query(
        'INSERT INTO "user" (id, name, email) VALUES ($1, $2, $3)',
        [userId, name, email],
      );
      await client.query(
        `INSERT INTO "account"
          (id, account_id, provider_id, user_id, password, updated_at)
         VALUES ($1, $2, 'credential', $2, $3, now())`,
        [randomUUID(), userId, passwordHash],
      );

      await client.query("COMMIT");
      console.info("Authentication account created.");
    }
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // The original failure is the useful error when no transaction started.
    }

    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

try {
  await bootstrapAuthUser();
} catch (error) {
  console.error(
    `Authentication account bootstrap failed: ${redactSecrets(
      error,
      secretsToRedact,
    )}`,
  );
  process.exitCode = 1;
}
