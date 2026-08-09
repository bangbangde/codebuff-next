import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const stateDirectory = path.join(projectRoot, ".dev");
const instanceFile = path.join(stateDirectory, "instance.json");
const environmentFile = path.join(stateDirectory, "environment.env");
const composeFile = path.join(projectRoot, "compose.yml");
const instanceSchemaVersion = 1;
const portSlotCount = 6_000;
const portBlockStart = 20_000;
const portBlockSize = 6;

function normalizedPath(value) {
  const resolved = path.resolve(value).replaceAll("\\", "/");
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function shortHash(value, length = 8) {
  return createHash("sha256").update(value).digest("hex").slice(0, length);
}

function invocation(command, args) {
  if (
    command === "pnpm" &&
    process.env.npm_execpath &&
    existsSync(process.env.npm_execpath)
  ) {
    return {
      command: process.execPath,
      args: [process.env.npm_execpath, ...args],
    };
  }

  return { command, args };
}

function capture(command, args, { allowFailure = false } = {}) {
  const target = invocation(command, args);
  const result = spawnSync(target.command, target.args, {
    cwd: projectRoot,
    encoding: "utf8",
    env: process.env,
    windowsHide: true,
  });

  if (result.error) {
    if (allowFailure) {
      return "";
    }
    throw result.error;
  }

  if (result.status !== 0) {
    if (allowFailure) {
      return "";
    }

    const detail = (result.stderr || result.stdout || "").trim();
    throw new Error(
      `${command} ${args.join(" ")} failed${detail ? `: ${detail}` : ""}`,
    );
  }

  return result.stdout.trim();
}

function run(command, args, { env = process.env, allowFailure = false } = {}) {
  return new Promise((resolve, reject) => {
    const target = invocation(command, args);
    const child = spawn(target.command, target.args, {
      cwd: projectRoot,
      env,
      stdio: "inherit",
      windowsHide: true,
    });

    child.once("error", (error) => {
      if (allowFailure) {
        resolve(false);
      } else {
        reject(error);
      }
    });
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve(true);
        return;
      }

      if (allowFailure) {
        resolve(false);
        return;
      }

      reject(
        new Error(
          `${command} ${args.join(" ")} failed with ${
            signal ? `signal ${signal}` : `exit code ${code}`
          }`,
        ),
      );
    });
  });
}

function repositoryRegistryKey() {
  const remote = capture("git", ["remote", "get-url", "origin"], {
    allowFailure: true,
  });
  return shortHash(remote || normalizedPath(projectRoot), 12);
}

function reservationDirectory() {
  return path.join(
    os.tmpdir(),
    "codebuff-next-local-environment",
    repositoryRegistryKey(),
    "ports",
  );
}

function reservationFile(slot) {
  return path.join(reservationDirectory(), `${slot}.json`);
}

function portsForSlot(slot) {
  const base = portBlockStart + slot * portBlockSize;
  return {
    app: base,
    postgres: base + 1,
    garageS3: base + 2,
    garageRpc: base + 3,
    garageWeb: base + 4,
  };
}

function portIsAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.listen({ host: "127.0.0.1", port, exclusive: true }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function portsAreAvailable(ports) {
  const results = await Promise.all(
    Object.values(ports).map((port) => portIsAvailable(port)),
  );
  return results.every(Boolean);
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function releaseReservation(slot, expectedRoot = normalizedPath(projectRoot)) {
  const file = reservationFile(slot);
  if (!existsSync(file)) {
    return;
  }

  try {
    const record = readJson(file);
    if (record.projectRoot === expectedRoot) {
      unlinkSync(file);
    }
  } catch {
    // A malformed reservation is left untouched for a human to inspect.
  }
}

async function reservePortSlot(instanceId) {
  const directory = reservationDirectory();
  mkdirSync(directory, { recursive: true });
  const canonicalRoot = normalizedPath(projectRoot);
  const seed = Number.parseInt(instanceId.slice(0, 8), 16) % portSlotCount;

  for (let offset = 0; offset < portSlotCount; offset += 1) {
    const slot = (seed + offset) % portSlotCount;
    const file = reservationFile(slot);
    let handle;

    try {
      handle = openSync(file, "wx");
      writeFileSync(
        handle,
        `${JSON.stringify(
          {
            instanceId,
            projectRoot: canonicalRoot,
            reservedAt: new Date().toISOString(),
          },
          null,
          2,
        )}\n`,
      );
      closeSync(handle);
      handle = undefined;

      const ports = portsForSlot(slot);
      if (await portsAreAvailable(ports)) {
        return { ports, slot };
      }

      releaseReservation(slot, canonicalRoot);
    } catch (error) {
      if (handle !== undefined) {
        closeSync(handle);
      }

      if (error?.code !== "EEXIST") {
        throw error;
      }

      try {
        const record = readJson(file);
        if (record.projectRoot === canonicalRoot) {
          return { ports: portsForSlot(slot), slot };
        }

        if (!existsSync(record.projectRoot)) {
          unlinkSync(file);
          offset -= 1;
        }
      } catch {
        // Skip reservations that are concurrently written or malformed.
      }
    }
  }

  throw new Error("No free local development port block is available.");
}

function validateInstance(instance) {
  const canonicalRoot = normalizedPath(projectRoot);
  const validPorts =
    instance?.ports &&
    Object.values(instance.ports).every(
      (port) => Number.isSafeInteger(port) && port > 0 && port <= 65_535,
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
    !instance?.secrets?.garageAccessKeyId ||
    !instance?.secrets?.garageSecretAccessKey
  ) {
    throw new Error(
      `Invalid local environment state at ${path.relative(projectRoot, instanceFile)}. ` +
        "Inspect the file and the matching Compose project before removing .dev and bootstrapping again.",
    );
  }

  return instance;
}

function environmentFor(instance, { container = false } = {}) {
  const postgresHost = container ? "postgres" : "127.0.0.1";
  const postgresPort = container ? 5432 : instance.ports.postgres;
  const objectStorageEndpoint = container
    ? "http://garage:3900"
    : `http://127.0.0.1:${instance.ports.garageS3}`;

  return {
    DEV_INSTANCE_ID: instance.instanceId,
    COMPOSE_PROJECT_NAME: instance.composeProject,
    APP_PORT: String(instance.ports.app),
    PORT: String(instance.ports.app),
    DEV_POSTGRES_USER: "codebuff",
    DEV_POSTGRES_PASSWORD: instance.secrets.postgresPassword,
    DEV_POSTGRES_DB: "codebuff_next",
    DEV_POSTGRES_PORT: String(instance.ports.postgres),
    DEV_GARAGE_S3_PORT: String(instance.ports.garageS3),
    DEV_GARAGE_RPC_PORT: String(instance.ports.garageRpc),
    DEV_GARAGE_WEB_PORT: String(instance.ports.garageWeb),
    GARAGE_BOOTSTRAP_BUCKET: `codebuff-${instance.instanceId}-article`,
    GARAGE_BOOTSTRAP_ACCESS_KEY_ID: instance.secrets.garageAccessKeyId,
    GARAGE_BOOTSTRAP_SECRET_ACCESS_KEY:
      instance.secrets.garageSecretAccessKey,
    PG_USER: "codebuff",
    PG_PWD: instance.secrets.postgresPassword,
    PG_DB: "codebuff_next",
    PG_HOST: postgresHost,
    PG_PORT: String(postgresPort),
    PG_POOL_MAX: "5",
    PG_CONNECTION_TIMEOUT_MS: "10000",
    BETTER_AUTH_URL: `http://localhost:${instance.ports.app}`,
    PASSKEY_RP_ID: "localhost",
    BETTER_AUTH_SECRETS: `0:${instance.secrets.betterAuthSecret}`,
    OBJECT_STORAGE_ENDPOINT: objectStorageEndpoint,
    OBJECT_STORAGE_REGION: "garage",
    OBJECT_STORAGE_BUCKET: `codebuff-${instance.instanceId}-article`,
    OBJECT_STORAGE_ACCESS_KEY_ID: instance.secrets.garageAccessKeyId,
    OBJECT_STORAGE_SECRET_ACCESS_KEY:
      instance.secrets.garageSecretAccessKey,
    AUTH_BOOTSTRAP_NAME: "Codebuff Admin",
    AUTH_BOOTSTRAP_EMAIL: "admin@codebuff.local",
    AUTH_BOOTSTRAP_PASSWORD: "Local-Dev-Bootstrap-Password",
    AUTH_BOOTSTRAP_IF_MISSING: "true",
  };
}

function writeEnvironmentFile(instance) {
  const environment = environmentFor(instance);
  const lines = [
    "# Generated by scripts/local-environment.mjs. Do not edit or commit.",
    ...Object.entries(environment).map(([name, value]) => `${name}=${value}`),
    "",
  ];
  writeFileSync(environmentFile, lines.join("\n"), { mode: 0o600 });
}

function claimExistingReservation(instance) {
  const directory = reservationDirectory();
  const file = reservationFile(instance.slot);
  const canonicalRoot = normalizedPath(projectRoot);
  mkdirSync(directory, { recursive: true });

  if (existsSync(file)) {
    const record = readJson(file);
    if (record.projectRoot !== canonicalRoot) {
      throw new Error(
        `Port block ${instance.slot} is reserved by another worktree. ` +
          "Destroy this local environment and bootstrap it again to allocate a new block.",
      );
    }
    return;
  }

  let handle;
  try {
    handle = openSync(file, "wx");
    writeFileSync(
      handle,
      `${JSON.stringify(
        {
          instanceId: instance.instanceId,
          projectRoot: canonicalRoot,
          reservedAt: new Date().toISOString(),
        },
        null,
        2,
      )}\n`,
    );
    closeSync(handle);
  } catch (error) {
    if (handle !== undefined) {
      closeSync(handle);
    }
    throw error;
  }
}

async function createInstance() {
  const canonicalRoot = normalizedPath(projectRoot);
  const instanceId = shortHash(canonicalRoot);
  const { ports, slot } = await reservePortSlot(instanceId);
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
      garageAccessKeyId: `GK${randomBytes(12).toString("hex")}`,
      garageSecretAccessKey: randomBytes(32).toString("hex"),
    },
  };

  mkdirSync(stateDirectory, { recursive: true });
  writeFileSync(instanceFile, `${JSON.stringify(instance, null, 2)}\n`, {
    mode: 0o600,
  });
  writeEnvironmentFile(instance);
  return instance;
}

async function ensureInstance() {
  if (existsSync(instanceFile)) {
    const instance = validateInstance(readJson(instanceFile));
    claimExistingReservation(instance);
    writeEnvironmentFile(instance);
    return instance;
  }

  return createInstance();
}

function existingInstance() {
  if (!existsSync(instanceFile)) {
    throw new Error(
      "This worktree has no local environment. Run pnpm local:bootstrap first.",
    );
  }

  const instance = validateInstance(readJson(instanceFile));
  claimExistingReservation(instance);
  writeEnvironmentFile(instance);
  return instance;
}

function composeArguments(instance, args) {
  return [
    "compose",
    "-p",
    instance.composeProject,
    "--env-file",
    environmentFile,
    "-f",
    composeFile,
    ...args,
  ];
}

function instanceProcessEnvironment(instance, options) {
  return {
    ...process.env,
    ...environmentFor(instance, options),
  };
}

async function runCompose(instance, args, options) {
  return run("docker", composeArguments(instance, args), options);
}

async function startInfrastructure(instance) {
  console.info(`Starting ${instance.composeProject} infrastructure...`);
  await runCompose(instance, [
    "up",
    "--detach",
    "--build",
    "--wait",
    "postgres",
    "garage",
  ]);
}

async function bootstrap(instance) {
  await doctor(instance, { includeStatus: false });
  await startInfrastructure(instance);
  const env = instanceProcessEnvironment(instance);
  await run("pnpm", ["db:migrate"], { env });
  await run("pnpm", ["auth:bootstrap"], { env });
  console.info("Local development environment is ready.");
  await status(instance);
}

async function status(instance) {
  console.info(`Instance: ${instance.instanceId}`);
  console.info(`Compose project: ${instance.composeProject}`);
  console.info(`Application: http://localhost:${instance.ports.app}`);
  console.info(`PostgreSQL: 127.0.0.1:${instance.ports.postgres}`);
  console.info(`Garage S3: http://127.0.0.1:${instance.ports.garageS3}`);
  await runCompose(instance, ["--profile", "app", "ps"], {
    allowFailure: true,
  });
}

async function doctor(instance, { includeStatus = true } = {}) {
  console.info(`Node.js ${process.version}`);
  await run("pnpm", ["--version"]);
  await run("docker", ["version", "--format", "Docker {{.Server.Version}}"]);
  await run("docker", ["compose", "version"]);
  await runCompose(instance, ["--profile", "app", "config", "--quiet"]);

  if (includeStatus) {
    await status(instance);
  }
}

async function hostDevelopment(instance) {
  await bootstrap(instance);
  await run(
    "pnpm",
    ["exec", "next", "dev", "--port", String(instance.ports.app)],
    {
      env: instanceProcessEnvironment(instance),
    },
  );
}

async function containerDevelopment(instance) {
  await bootstrap(instance);
  await runCompose(instance, [
    "--profile",
    "app",
    "up",
    "--build",
    "--no-deps",
    "app",
  ]);
}

async function verify(instance) {
  const env = instanceProcessEnvironment(instance);
  await run("pnpm", ["lint"], { env });
  await run("pnpm", ["exec", "tsc", "--noEmit"], { env });
  await run("pnpm", ["build"], { env });
  await run("git", ["diff", "--check"]);
}

async function containerVerify(instance) {
  await bootstrap(instance);
  await runCompose(instance, [
    "--profile",
    "app",
    "run",
    "--rm",
    "app",
    "sh",
    "-lc",
    "pnpm install --frozen-lockfile --offline --store-dir=/pnpm/store && pnpm lint && pnpm exec tsc --noEmit && pnpm build",
  ]);
  await run("git", ["diff", "--check"]);
}

async function reset(instance) {
  await runCompose(instance, ["down", "--volumes", "--remove-orphans"]);
  await bootstrap(instance);
}

async function destroy(instance) {
  if (instance.composeProject !== `codebuff-${instance.instanceId}`) {
    throw new Error("Refusing to destroy an unrecognized Compose project.");
  }

  await runCompose(instance, ["down", "--volumes", "--remove-orphans"]);
  releaseReservation(instance.slot);
  const resolvedStateDirectory = path.resolve(stateDirectory);
  if (path.dirname(resolvedStateDirectory) !== projectRoot) {
    throw new Error("Refusing to remove an unexpected local state directory.");
  }
  rmSync(resolvedStateDirectory, { recursive: true, force: true });
  console.info(`Destroyed ${instance.composeProject}.`);
}

async function main() {
  const action = process.argv[2];

  switch (action) {
    case "bootstrap": {
      await bootstrap(await ensureInstance());
      break;
    }
    case "up": {
      await startInfrastructure(await ensureInstance());
      break;
    }
    case "dev": {
      await hostDevelopment(await ensureInstance());
      break;
    }
    case "container-dev": {
      await containerDevelopment(await ensureInstance());
      break;
    }
    case "status": {
      await status(existingInstance());
      break;
    }
    case "doctor": {
      await doctor(await ensureInstance());
      break;
    }
    case "stop": {
      await runCompose(existingInstance(), ["--profile", "app", "stop"]);
      break;
    }
    case "reset": {
      await reset(existingInstance());
      break;
    }
    case "destroy": {
      await destroy(existingInstance());
      break;
    }
    case "verify": {
      await verify(await ensureInstance());
      break;
    }
    case "container-verify": {
      await containerVerify(await ensureInstance());
      break;
    }
    default:
      throw new Error(
        "Usage: node scripts/local-environment.mjs " +
          "<bootstrap|up|dev|container-dev|status|doctor|stop|reset|destroy|verify|container-verify>",
      );
  }
}

void main().catch((error) => {
  console.error(`Local environment command failed: ${error.message}`);
  process.exitCode = 1;
});
