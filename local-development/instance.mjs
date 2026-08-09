import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";

import {
  projectRoot,
  workspaceEnvironmentFile,
  workspaceInstanceFile,
  workspaceStateDirectory,
} from "./paths.mjs";
import {
  claimPortReservation,
  normalizedPath,
  reservePortBlock,
  workspaceInstanceId,
} from "./ports.mjs";
import { objectStorageBuckets } from "../lib/object-storage/schema.mjs";

const instanceSchemaVersion = 2;

const localDefaults = Object.freeze({
  postgresUser: "codebuff",
  postgresDatabase: "codebuff_next",
  postgresPoolMax: "5",
  postgresConnectionTimeoutMs: "10000",
  objectStorageRegion: "garage",
  authBootstrapName: "Codebuff Admin",
  authBootstrapEmail: "admin@codebuff.local",
  authBootstrapPassword: "Local-Dev-Bootstrap-Password",
});

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function writeWorkspaceInstance(instance) {
  writeFileSync(
    workspaceInstanceFile,
    `${JSON.stringify(instance, null, 2)}\n`,
    { mode: 0o600 },
  );
}

function migrateWorkspaceInstance(instance) {
  if (instance?.schemaVersion !== 1) {
    return { changed: false, instance };
  }

  return {
    changed: true,
    instance: {
      ...instance,
      schemaVersion: instanceSchemaVersion,
      ports: {
        ...instance.ports,
        garageAdmin: instance.ports.app + 5,
      },
      secrets: {
        ...instance.secrets,
        garageAdminToken: randomBytes(32).toString("hex"),
      },
    },
  };
}

function validateWorkspaceInstance(instance) {
  const canonicalRoot = normalizedPath(projectRoot);
  const requiredPortNames = [
    "app",
    "postgres",
    "garageS3",
    "garageRpc",
    "garageWeb",
    "garageAdmin",
  ];
  const validPorts =
    instance?.ports &&
    requiredPortNames.every(
      (name) =>
        Number.isSafeInteger(instance.ports[name]) &&
        instance.ports[name] > 0 &&
        instance.ports[name] <= 65_535,
    );

  if (
    instance?.schemaVersion !== instanceSchemaVersion ||
    instance?.projectRoot !== canonicalRoot ||
    !/^[a-z0-9][a-z0-9_-]+$/.test(instance?.composeProject || "") ||
    instance?.composeProject !== `codebuff-${instance?.instanceId}` ||
    !Number.isSafeInteger(instance?.slot) ||
    !validPorts ||
    !instance?.secrets?.postgresPassword ||
    !instance?.secrets?.betterAuthSecret ||
    !/^[0-9a-f]{64}$/.test(instance?.secrets?.garageAdminToken || "") ||
    !/^GK[0-9a-f]{24}$/.test(instance?.secrets?.garageAccessKeyId || "") ||
    !/^[0-9a-f]{64}$/.test(instance?.secrets?.garageSecretAccessKey || "")
  ) {
    throw new Error(
      "Invalid local workspace state at .dev/instance.json. " +
        "Inspect the file and matching Compose project before removing .dev and bootstrapping again.",
    );
  }

  return instance;
}

export function workspaceEnvironment(instance, { container = false } = {}) {
  const postgresHost = container ? "postgres" : "127.0.0.1";
  const postgresPort = container ? 5432 : instance.ports.postgres;
  const objectStorageEndpoint = container
    ? "http://garage:3900"
    : `http://127.0.0.1:${instance.ports.garageS3}`;
  const garageAdminEndpoint = container
    ? "http://garage:3903"
    : `http://127.0.0.1:${instance.ports.garageAdmin}`;
  const objectStorageBucketNames = Object.fromEntries(
    Object.entries(objectStorageBuckets).map(
      ([name, bucket]) => [
        name,
        `codebuff-${instance.instanceId}-${bucket.localNameSuffix}`,
      ],
    ),
  );
  const articleAssetsBucket = objectStorageBucketNames.articleAssets;

  return {
    DEV_INSTANCE_ID: instance.instanceId,
    COMPOSE_PROJECT_NAME: instance.composeProject,
    APP_PORT: String(instance.ports.app),
    PORT: String(instance.ports.app),
    DEV_POSTGRES_USER: localDefaults.postgresUser,
    DEV_POSTGRES_PASSWORD: instance.secrets.postgresPassword,
    DEV_POSTGRES_DB: localDefaults.postgresDatabase,
    DEV_POSTGRES_PORT: String(instance.ports.postgres),
    DEV_GARAGE_S3_PORT: String(instance.ports.garageS3),
    DEV_GARAGE_RPC_PORT: String(instance.ports.garageRpc),
    DEV_GARAGE_WEB_PORT: String(instance.ports.garageWeb),
    DEV_GARAGE_ADMIN_PORT: String(instance.ports.garageAdmin),
    GARAGE_ADMIN_ENDPOINT: garageAdminEndpoint,
    GARAGE_ADMIN_TOKEN: instance.secrets.garageAdminToken,
    PG_USER: localDefaults.postgresUser,
    PG_PWD: instance.secrets.postgresPassword,
    PG_DB: localDefaults.postgresDatabase,
    PG_HOST: postgresHost,
    PG_PORT: String(postgresPort),
    PG_POOL_MAX: localDefaults.postgresPoolMax,
    PG_CONNECTION_TIMEOUT_MS: localDefaults.postgresConnectionTimeoutMs,
    BETTER_AUTH_URL: `http://localhost:${instance.ports.app}`,
    PASSKEY_RP_ID: "localhost",
    BETTER_AUTH_SECRETS: `0:${instance.secrets.betterAuthSecret}`,
    OBJECT_STORAGE_ENDPOINT: objectStorageEndpoint,
    OBJECT_STORAGE_REGION: localDefaults.objectStorageRegion,
    OBJECT_STORAGE_BUCKET: articleAssetsBucket,
    OBJECT_STORAGE_ACCESS_KEY_ID: instance.secrets.garageAccessKeyId,
    OBJECT_STORAGE_SECRET_ACCESS_KEY:
      instance.secrets.garageSecretAccessKey,
    AUTH_BOOTSTRAP_NAME: localDefaults.authBootstrapName,
    AUTH_BOOTSTRAP_EMAIL: localDefaults.authBootstrapEmail,
    AUTH_BOOTSTRAP_PASSWORD: localDefaults.authBootstrapPassword,
    AUTH_BOOTSTRAP_IF_MISSING: "true",
  };
}

function writeWorkspaceEnvironment(instance) {
  const lines = [
    "# Generated by local-development/cli.mjs. Do not edit or commit.",
    ...Object.entries(workspaceEnvironment(instance)).map(
      ([name, value]) => `${name}=${value}`,
    ),
    "",
  ];
  writeFileSync(workspaceEnvironmentFile, lines.join("\n"), { mode: 0o600 });
}

async function createWorkspaceInstance() {
  const canonicalRoot = normalizedPath(projectRoot);
  const instanceId = workspaceInstanceId();
  const { ports, slot } = await reservePortBlock(instanceId);
  const instance = {
    schemaVersion: instanceSchemaVersion,
    projectRoot: canonicalRoot,
    instanceId,
    composeProject: `codebuff-${instanceId}`,
    slot,
    ports,
    secrets: {
      postgresPassword: randomBytes(24).toString("base64url"),
      betterAuthSecret: randomBytes(32).toString("hex"),
      garageAdminToken: randomBytes(32).toString("hex"),
      garageAccessKeyId: `GK${randomBytes(12).toString("hex")}`,
      garageSecretAccessKey: randomBytes(32).toString("hex"),
    },
  };

  mkdirSync(workspaceStateDirectory, { recursive: true });
  writeWorkspaceInstance(instance);
  writeWorkspaceEnvironment(instance);
  return instance;
}

function loadWorkspaceInstance() {
  const migrated = migrateWorkspaceInstance(readJson(workspaceInstanceFile));
  const instance = validateWorkspaceInstance(migrated.instance);
  if (migrated.changed) {
    writeWorkspaceInstance(instance);
  }
  claimPortReservation(instance);
  writeWorkspaceEnvironment(instance);
  return instance;
}

export async function ensureWorkspaceInstance() {
  return existsSync(workspaceInstanceFile)
    ? loadWorkspaceInstance()
    : createWorkspaceInstance();
}

export function requireWorkspaceInstance() {
  if (!existsSync(workspaceInstanceFile)) {
    throw new Error(
      "This worktree has no local workspace. Run pnpm local:bootstrap first.",
    );
  }

  return loadWorkspaceInstance();
}
