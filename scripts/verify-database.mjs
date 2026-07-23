import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import pg from "pg";

const { Client, escapeIdentifier, escapeLiteral } = pg;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const imageFlagIndex = process.argv.indexOf("--image");
const imageName = imageFlagIndex === -1 ? undefined : process.argv[imageFlagIndex + 1];

if (imageFlagIndex !== -1 && !imageName) {
  throw new Error("--image requires an image name");
}

const adminHost = process.env.PG_ADMIN_HOST?.trim() || "127.0.0.1";
const adminPort = Number(process.env.PG_ADMIN_PORT?.trim() || "5432");
const adminDatabase = process.env.PG_ADMIN_DB?.trim() || "postgres";
const adminUser = process.env.PG_ADMIN_USER?.trim() || "postgres";
const adminPassword = process.env.PG_ADMIN_PWD?.trim();

if (!Number.isSafeInteger(adminPort) || adminPort <= 0) {
  throw new Error("PG_ADMIN_PORT must be a positive integer");
}

const suffix = `${imageName ? "image" : "local"}_${process.pid}_${randomBytes(4).toString("hex")}`;
const databaseName = `codebuff_next_${suffix}`;
const migrationRole = `cb_migration_${suffix}`;
const runtimeRole = `cb_runtime_${suffix}`;
const migrationPassword = randomBytes(24).toString("base64url");
const runtimePassword = randomBytes(24).toString("base64url");
const additionalSecrets = new Set();
const expectedTables = [
  "account",
  "passkey",
  "rate_limit",
  "session",
  "two_factor",
  "user",
  "verification",
];

function clientConfig(database, user, password) {
  return {
    host: adminHost,
    port: adminPort,
    database,
    user,
    ...(password ? { password } : {}),
    connectionTimeoutMillis: 10_000,
  };
}

function redactSecrets(value) {
  let message = value instanceof Error ? value.message : String(value);

  for (const secret of [
    adminPassword,
    migrationPassword,
    runtimePassword,
    ...additionalSecrets,
  ]) {
    if (secret) {
      message = message.replaceAll(secret, "[redacted]");
    }
  }

  return message;
}

function runMigration(user, password, { stdio = "inherit" } = {}) {
  const childEnvironment = {
    ...process.env,
    PG_HOST: adminHost,
    PG_PORT: String(adminPort),
    PG_DB: databaseName,
    PG_USER: user,
    PG_PWD: password,
    PG_POOL_MAX: "1",
  };

  const command = imageName ? "docker" : process.execPath;
  const args = imageName
    ? [
        "run",
        "--rm",
        "--network",
        "host",
        "--env",
        "PG_HOST",
        "--env",
        "PG_PORT",
        "--env",
        "PG_DB",
        "--env",
        "PG_USER",
        "--env",
        "PG_PWD",
        "--env",
        "PG_POOL_MAX",
        imageName,
        "node",
        "migrate/index.js",
      ]
    : [path.join(projectRoot, ".build", "migrate", "migrate", "index.js")];

  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: childEnvironment,
    stdio,
  });

  if (result.error) {
    throw result.error;
  }

  return result.status ?? 1;
}

async function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Unable to allocate a local verification port"));
        return;
      }

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(address.port);
      });
    });
  });
}

function startApplication(environment, port) {
  const nextCli = path.join(
    projectRoot,
    "node_modules",
    "next",
    "dist",
    "bin",
    "next",
  );
  const child = spawn(
    process.execPath,
    [nextCli, "start", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: projectRoot,
      env: {
        ...environment,
        NODE_ENV: "production",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  let startupError;

  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.once("error", (error) => {
    startupError = error;
  });

  return {
    child,
    getOutput: () => output,
    getStartupError: () => startupError,
  };
}

async function stopApplication(application) {
  if (application.child.exitCode !== null) {
    return;
  }

  application.child.kill();

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (application.child.exitCode !== null) {
      return;
    }

    await delay(100);
  }

  application.child.kill("SIGKILL");
}

async function waitForApplication(application, url) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const startupError = application.getStartupError();

    if (startupError) {
      throw startupError;
    }

    if (application.child.exitCode !== null) {
      throw new Error(
        `Application exited during startup: ${application.getOutput()}`,
      );
    }

    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {
      // The server may still be binding its port.
    }

    await delay(250);
  }

  throw new Error(
    `Application did not become ready: ${application.getOutput()}`,
  );
}

function responseCookieHeader(response) {
  const setCookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);

  return {
    cookie: setCookies.map((value) => value.split(";", 1)[0]).join("; "),
    setCookies,
  };
}

function assertOutputDoesNotContainSecrets(output, secrets) {
  for (const secret of secrets) {
    if (secret) {
      assert.equal(output.includes(secret), false);
    }
  }
}

function runAccountBootstrap(environment, secrets) {
  const result = spawnSync(
    process.execPath,
    [path.join(projectRoot, "scripts", "bootstrap-auth-user.mjs")],
    {
      cwd: projectRoot,
      env: environment,
      encoding: "utf8",
    },
  );
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

  assertOutputDoesNotContainSecrets(output, secrets);

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Authentication bootstrap failed: ${output}`);
  }

  assert.match(output, /Authentication account created\./);
}

async function verifyRuntimeAuthentication(
  runtimeClient,
  runtimeEnvironment,
) {
  const authSecret = randomBytes(32).toString("base64url");
  const versionedSecret = `1:${authSecret}`;
  const accountPassword = `Ci-${randomBytes(24).toString("base64url")}`;
  const accountEmail = `auth-${suffix}@example.invalid`;
  const accountName = "CI Auth User";

  for (const secret of [authSecret, versionedSecret, accountPassword]) {
    additionalSecrets.add(secret);
  }

  runAccountBootstrap(
    {
      ...runtimeEnvironment,
      AUTH_BOOTSTRAP_NAME: accountName,
      AUTH_BOOTSTRAP_EMAIL: accountEmail,
      AUTH_BOOTSTRAP_PASSWORD: accountPassword,
    },
    [
      authSecret,
      versionedSecret,
      accountPassword,
      runtimeEnvironment.PG_PWD,
    ],
  );

  const accountRows = await runtimeClient.query(
    `SELECT "user".email, account.password
     FROM "user"
     JOIN account ON account.user_id = "user".id
     WHERE "user".email = $1`,
    [accountEmail],
  );
  assert.equal(accountRows.rowCount, 1);
  assert.notEqual(accountRows.rows[0].password, accountPassword);

  const port = await getAvailablePort();
  const baseURL = `http://127.0.0.1:${port}`;
  const applicationEnvironment = {
    ...runtimeEnvironment,
    BETTER_AUTH_URL: baseURL,
    BETTER_AUTH_SECRETS: versionedSecret,
  };
  const application = startApplication(applicationEnvironment, port);
  let sessionToken;

  try {
    await waitForApplication(application, `${baseURL}/`);

    const unauthenticatedAccount = await fetch(`${baseURL}/account`, {
      redirect: "manual",
    });
    assert.ok([303, 307, 308].includes(unauthenticatedAccount.status));
    assert.equal(
      new URL(unauthenticatedAccount.headers.get("location"), baseURL)
        .pathname,
      "/sign-in",
    );

    const signUpResponse = await fetch(`${baseURL}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: baseURL,
      },
      body: JSON.stringify({
        name: "Public sign-up must stay disabled",
        email: `public-${suffix}@example.invalid`,
        password: accountPassword,
      }),
    });
    const signUpBody = await signUpResponse.json();
    assert.equal(signUpResponse.status, 400);
    assert.equal(signUpBody.code, "EMAIL_PASSWORD_SIGN_UP_DISABLED");

    const wrongPasswordResponse = await fetch(
      `${baseURL}/api/auth/sign-in/email`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: baseURL,
        },
        body: JSON.stringify({
          email: accountEmail,
          password: `${accountPassword}-wrong`,
        }),
      },
    );
    const wrongPasswordBody = await wrongPasswordResponse.json();

    const unknownEmailResponse = await fetch(
      `${baseURL}/api/auth/sign-in/email`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: baseURL,
        },
        body: JSON.stringify({
          email: `unknown-${suffix}@example.invalid`,
          password: accountPassword,
        }),
      },
    );
    const unknownEmailBody = await unknownEmailResponse.json();

    assert.equal(wrongPasswordResponse.status, unknownEmailResponse.status);
    assert.equal(wrongPasswordBody.code, unknownEmailBody.code);
    assert.equal(wrongPasswordBody.message, unknownEmailBody.message);

    const signInResponse = await fetch(`${baseURL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: baseURL,
      },
      body: JSON.stringify({
        email: accountEmail,
        password: accountPassword,
      }),
    });
    const signInBody = await signInResponse.json();
    assert.equal(signInResponse.status, 200);
    assert.equal(signInBody.user.email, accountEmail);

    sessionToken = signInBody.token;
    additionalSecrets.add(sessionToken);

    const { cookie, setCookies } = responseCookieHeader(signInResponse);
    assert.ok(cookie);
    assert.match(setCookies.join("\n"), /HttpOnly/i);
    assert.match(setCookies.join("\n"), /SameSite=Lax/i);
    assert.match(setCookies.join("\n"), /Path=\//i);

    const authenticatedSessionResponse = await fetch(
      `${baseURL}/api/auth/get-session`,
      {
        headers: {
          cookie,
        },
      },
    );
    const authenticatedSession = await authenticatedSessionResponse.json();
    assert.equal(authenticatedSessionResponse.status, 200);
    assert.equal(authenticatedSession.user.email, accountEmail);

    const authenticatedAccount = await fetch(`${baseURL}/account`, {
      headers: {
        cookie,
      },
      redirect: "manual",
    });
    const authenticatedAccountBody = await authenticatedAccount.text();
    assert.equal(authenticatedAccount.status, 200);
    assert.match(authenticatedAccountBody, /CI Auth User/);
    assert.match(authenticatedAccountBody, new RegExp(accountEmail));

    const activeSessions = await runtimeClient.query(
      'SELECT count(*)::integer AS count FROM "session"',
    );
    assert.equal(activeSessions.rows[0].count, 1);

    const rateLimitEntries = await runtimeClient.query(
      'SELECT count(*)::integer AS count FROM "rate_limit"',
    );
    assert.ok(rateLimitEntries.rows[0].count > 0);

    const signOutResponse = await fetch(`${baseURL}/api/auth/sign-out`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
        origin: baseURL,
      },
      body: "{}",
    });
    assert.equal(signOutResponse.status, 200);

    const revokedSessionResponse = await fetch(
      `${baseURL}/api/auth/get-session`,
      {
        headers: {
          cookie,
        },
      },
    );
    assert.equal(await revokedSessionResponse.json(), null);

    const remainingSessions = await runtimeClient.query(
      'SELECT count(*)::integer AS count FROM "session"',
    );
    assert.equal(remainingSessions.rows[0].count, 0);
  } finally {
    await stopApplication(application);
    assertOutputDoesNotContainSecrets(application.getOutput(), [
      authSecret,
      versionedSecret,
      accountPassword,
      runtimeEnvironment.PG_PWD,
      sessionToken,
    ]);
  }

  const unavailablePort = await getAvailablePort();
  const unavailableBaseURL = `http://127.0.0.1:${unavailablePort}`;
  const unavailableDatabaseApplication = startApplication(
    {
      ...applicationEnvironment,
      BETTER_AUTH_URL: unavailableBaseURL,
      PG_HOST: "127.0.0.1",
      PG_PORT: "1",
    },
    unavailablePort,
  );

  try {
    await waitForApplication(
      unavailableDatabaseApplication,
      `${unavailableBaseURL}/`,
    );

    for (const pathname of ["/", "/notes", "/me", "/sign-in"]) {
      const response = await fetch(`${unavailableBaseURL}${pathname}`);
      assert.equal(response.status, 200);
    }
  } finally {
    await stopApplication(unavailableDatabaseApplication);
    assertOutputDoesNotContainSecrets(
      unavailableDatabaseApplication.getOutput(),
      [
        authSecret,
        versionedSecret,
        accountPassword,
        runtimeEnvironment.PG_PWD,
        sessionToken,
      ],
    );
  }
}

async function schemaFingerprint(client) {
  const result = await client.query(`
    SELECT object_type, object_name, definition
    FROM (
      SELECT
        'column' AS object_type,
        table_schema || '.' || table_name || '.' || column_name AS object_name,
        data_type || ':' || is_nullable || ':' || COALESCE(column_default, '') AS definition
      FROM information_schema.columns
      WHERE table_schema IN ('public', 'drizzle')

      UNION ALL

      SELECT
        'constraint',
        namespace.nspname || '.' || relation.relname || '.' || constraint_record.conname,
        pg_get_constraintdef(constraint_record.oid)
      FROM pg_constraint AS constraint_record
      JOIN pg_class AS relation ON relation.oid = constraint_record.conrelid
      JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname IN ('public', 'drizzle')

      UNION ALL

      SELECT
        'index',
        schemaname || '.' || indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname IN ('public', 'drizzle')
    ) AS database_objects
    ORDER BY object_type, object_name
  `);

  return JSON.stringify(result.rows);
}

async function verifyRuntimeDml(runtimeClient) {
  await runtimeClient.query("BEGIN");

  try {
    await runtimeClient.query(`
      INSERT INTO "user" (id, name, email)
      VALUES ('user-1', 'CI User', 'ci-user@example.invalid')
    `);
    await runtimeClient.query(`
      INSERT INTO "account" (
        id, account_id, provider_id, user_id, password, updated_at
      ) VALUES (
        'account-1', 'user-1', 'credential', 'user-1', 'test-password-hash', now()
      )
    `);
    await runtimeClient.query(`
      INSERT INTO "session" (id, expires_at, token, updated_at, user_id)
      VALUES ('session-1', now() + interval '1 hour', 'session-token-1', now(), 'user-1')
    `);
    await runtimeClient.query(`
      INSERT INTO "verification" (id, identifier, value, expires_at)
      VALUES ('verification-1', 'ci-user@example.invalid', 'test-verification', now() + interval '5 minutes')
    `);
    await runtimeClient.query(`
      INSERT INTO "two_factor" (id, secret, backup_codes, user_id)
      VALUES ('two-factor-1', 'encrypted-test-secret', 'encrypted-test-codes', 'user-1')
    `);
    await runtimeClient.query(`
      INSERT INTO "passkey" (
        id, public_key, user_id, credential_id, counter, device_type, backed_up, created_at
      ) VALUES (
        'passkey-1', 'test-public-key', 'user-1', 'credential-1', 0, 'singleDevice', false, now()
      )
    `);
    await runtimeClient.query(`
      INSERT INTO "rate_limit" (id, key, count, last_request)
      VALUES ('rate-limit-1', 'ci-rate-limit', 1, 1)
    `);

    const counts = await runtimeClient.query(`
      SELECT
        (SELECT count(*)::integer FROM "user") AS users,
        (SELECT count(*)::integer FROM "account") AS accounts,
        (SELECT count(*)::integer FROM "session") AS sessions,
        (SELECT count(*)::integer FROM "verification") AS verifications,
        (SELECT count(*)::integer FROM "two_factor") AS two_factors,
        (SELECT count(*)::integer FROM "passkey") AS passkeys,
        (SELECT count(*)::integer FROM "rate_limit") AS rate_limits
    `);

    assert.deepEqual(Object.values(counts.rows[0]), [1, 1, 1, 1, 1, 1, 1]);

    await runtimeClient.query(`UPDATE "user" SET name = 'Updated CI User' WHERE id = 'user-1'`);
    await runtimeClient.query(`UPDATE "account" SET scope = 'updated' WHERE id = 'account-1'`);
    await runtimeClient.query(`UPDATE "session" SET user_agent = 'ci' WHERE id = 'session-1'`);
    await runtimeClient.query(`UPDATE "verification" SET value = 'updated' WHERE id = 'verification-1'`);
    await runtimeClient.query(`UPDATE "two_factor" SET verified = true WHERE id = 'two-factor-1'`);
    await runtimeClient.query(`UPDATE "passkey" SET counter = 1 WHERE id = 'passkey-1'`);
    await runtimeClient.query(`UPDATE "rate_limit" SET count = 2 WHERE id = 'rate-limit-1'`);

    await runtimeClient.query(`DELETE FROM "verification" WHERE id = 'verification-1'`);
    await runtimeClient.query(`DELETE FROM "rate_limit" WHERE id = 'rate-limit-1'`);
    await runtimeClient.query(`DELETE FROM "user" WHERE id = 'user-1'`);

    const remaining = await runtimeClient.query(`
      SELECT
        (SELECT count(*)::integer FROM "user") +
        (SELECT count(*)::integer FROM "account") +
        (SELECT count(*)::integer FROM "session") +
        (SELECT count(*)::integer FROM "verification") +
        (SELECT count(*)::integer FROM "two_factor") +
        (SELECT count(*)::integer FROM "passkey") +
        (SELECT count(*)::integer FROM "rate_limit") AS total
    `);

    assert.equal(remaining.rows[0].total, 0);
  } finally {
    await runtimeClient.query("ROLLBACK");
  }
}

async function expectInsufficientPrivilege(client, statement) {
  try {
    await client.query(statement);
    assert.fail("Runtime role unexpectedly executed DDL");
  } catch (error) {
    assert.equal(error?.code, "42501");
  }
}

const adminClient = new Client(
  clientConfig(adminDatabase, adminUser, adminPassword),
);
let databaseCreated = false;
let migrationRoleCreated = false;
let runtimeRoleCreated = false;

try {
  await adminClient.connect();
  await adminClient.query(
    `CREATE ROLE ${escapeIdentifier(migrationRole)} NOINHERIT LOGIN PASSWORD ${escapeLiteral(migrationPassword)}`,
  );
  migrationRoleCreated = true;
  await adminClient.query(
    `CREATE ROLE ${escapeIdentifier(runtimeRole)} NOINHERIT LOGIN PASSWORD ${escapeLiteral(runtimePassword)}`,
  );
  runtimeRoleCreated = true;
  await adminClient.query(
    `CREATE DATABASE ${escapeIdentifier(databaseName)} OWNER ${escapeIdentifier(migrationRole)}`,
  );
  databaseCreated = true;
  await adminClient.query(
    `REVOKE ALL ON DATABASE ${escapeIdentifier(databaseName)} FROM PUBLIC`,
  );
  await adminClient.query(
    `GRANT CONNECT ON DATABASE ${escapeIdentifier(databaseName)} TO ${escapeIdentifier(runtimeRole)}`,
  );

  const migrationClient = new Client(
    clientConfig(databaseName, migrationRole, migrationPassword),
  );
  await migrationClient.connect();

  try {
    await migrationClient.query("REVOKE ALL ON SCHEMA public FROM PUBLIC");
    await migrationClient.query(
      `GRANT USAGE ON SCHEMA public TO ${escapeIdentifier(runtimeRole)}`,
    );
    await migrationClient.query(`
      ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${escapeIdentifier(runtimeRole)}
    `);
    await migrationClient.query(`
      ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT USAGE, SELECT ON SEQUENCES TO ${escapeIdentifier(runtimeRole)}
    `);

    assert.equal(runMigration(migrationRole, migrationPassword), 0);

    const tables = await migrationClient.query(`
      SELECT tablename, tableowner
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    assert.deepEqual(
      tables.rows.map(({ tablename }) => tablename),
      expectedTables,
    );
    assert.ok(tables.rows.every(({ tableowner }) => tableowner === migrationRole));

    const journalBefore = await migrationClient.query(
      "SELECT count(*)::integer AS count FROM drizzle.__drizzle_migrations",
    );
    const fingerprintBefore = await schemaFingerprint(migrationClient);

    assert.equal(runMigration(migrationRole, migrationPassword), 0);

    const journalAfter = await migrationClient.query(
      "SELECT count(*)::integer AS count FROM drizzle.__drizzle_migrations",
    );
    const fingerprintAfter = await schemaFingerprint(migrationClient);
    assert.equal(journalBefore.rows[0].count, 1);
    assert.equal(journalAfter.rows[0].count, 1);
    assert.equal(fingerprintAfter, fingerprintBefore);
  } finally {
    await migrationClient.end();
  }

  const runtimeClient = new Client(
    clientConfig(databaseName, runtimeRole, runtimePassword),
  );
  await runtimeClient.connect();

  try {
    await verifyRuntimeDml(runtimeClient);

    if (!imageName) {
      await verifyRuntimeAuthentication(runtimeClient, {
        ...process.env,
        PG_HOST: adminHost,
        PG_PORT: String(adminPort),
        PG_DB: databaseName,
        PG_USER: runtimeRole,
        PG_PWD: runtimePassword,
        PG_POOL_MAX: "3",
      });
    }

    await expectInsufficientPrivilege(
      runtimeClient,
      "CREATE TABLE runtime_must_not_create_tables (id integer)",
    );
    await expectInsufficientPrivilege(
      runtimeClient,
      'ALTER TABLE "user" ADD COLUMN runtime_must_not_alter_tables integer',
    );
    await expectInsufficientPrivilege(
      runtimeClient,
      "SELECT * FROM drizzle.__drizzle_migrations",
    );
    assert.notEqual(
      runMigration(runtimeRole, runtimePassword, { stdio: "ignore" }),
      0,
    );
  } finally {
    await runtimeClient.end();
  }

  console.info(
    `PostgreSQL role and ${imageName ? "image" : "local"} migration verification passed.`,
  );
} catch (error) {
  console.error(`Database verification failed: ${redactSecrets(error)}`);
  process.exitCode = 1;
} finally {
  if (databaseCreated) {
    await adminClient.query(
      `DROP DATABASE IF EXISTS ${escapeIdentifier(databaseName)} WITH (FORCE)`,
    );
  }
  if (runtimeRoleCreated) {
    await adminClient.query(`DROP ROLE IF EXISTS ${escapeIdentifier(runtimeRole)}`);
  }
  if (migrationRoleCreated) {
    await adminClient.query(`DROP ROLE IF EXISTS ${escapeIdentifier(migrationRole)}`);
  }
  await adminClient.end();
}
