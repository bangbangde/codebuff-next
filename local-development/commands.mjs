import { rmSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { ensureLocalGarageRuntimeKey } from "./garage.mjs";
import { workspaceEnvironment } from "./instance.mjs";
import {
  localComposeFile,
  projectRoot,
  workspaceEnvironmentFile,
  workspaceStateDirectory,
} from "./paths.mjs";
import { releasePortReservation } from "./ports.mjs";
import { run } from "./process.mjs";

function composeArguments(instance, args) {
  return [
    "compose",
    "-p",
    instance.composeProject,
    "--env-file",
    workspaceEnvironmentFile,
    "-f",
    localComposeFile,
    ...args,
  ];
}

function processEnvironment(instance, options) {
  return {
    ...process.env,
    ...workspaceEnvironment(instance, options),
  };
}

function runCompose(instance, args, options) {
  return run("docker", composeArguments(instance, args), options);
}

export async function startInfrastructure(instance) {
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

export async function bootstrap(instance) {
  await doctor(instance, { includeStatus: false });
  await startInfrastructure(instance);
  const readyInstance = await ensureLocalGarageRuntimeKey(instance);
  const env = processEnvironment(readyInstance);
  await run("pnpm", ["build:scripts"], { env });
  await run("node", [".build/deploy.mjs", "prepare"], { env });
  await run("node", [".build/deploy.mjs", "auth:bootstrap"], { env });
  console.info("Local development workspace is ready.");
  await status(readyInstance);
}

export async function status(instance) {
  console.info(`Instance: ${instance.instanceId}`);
  console.info(`Compose project: ${instance.composeProject}`);
  console.info(`Application: http://localhost:${instance.ports.app}`);
  console.info(`PostgreSQL: 127.0.0.1:${instance.ports.postgres}`);
  console.info(`Garage S3: http://127.0.0.1:${instance.ports.garageS3}`);
  console.info(
    `Garage Admin: http://127.0.0.1:${instance.ports.garageAdmin}`,
  );
  await runCompose(instance, ["--profile", "app", "ps"], {
    allowFailure: true,
  });
}

export async function doctor(instance, { includeStatus = true } = {}) {
  console.info(`Node.js ${process.version}`);
  await run("pnpm", ["--version"]);
  await run("docker", ["version", "--format", "Docker {{.Server.Version}}"]);
  await run("docker", ["compose", "version"]);
  await runCompose(instance, ["--profile", "app", "config", "--quiet"]);

  if (includeStatus) {
    await status(instance);
  }
}

export async function hostDevelopment(instance) {
  await bootstrap(instance);
  await run(
    "pnpm",
    ["exec", "next", "dev", "--port", String(instance.ports.app)],
    { env: processEnvironment(instance) },
  );
}

export async function containerDevelopment(instance) {
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

export async function verify(instance) {
  const env = processEnvironment(instance);
  await run("pnpm", ["lint"], { env });
  await run("pnpm", ["exec", "tsc", "--noEmit"], { env });
  await run("pnpm", ["build"], { env });
  await run("git", ["diff", "--check"]);
}

export async function containerVerify(instance) {
  await bootstrap(instance);
  await runCompose(instance, [
    "--profile",
    "app",
    "run",
    "--rm",
    "--no-deps",
    "--volume",
    "/workspace/.next",
    "app",
    "sh",
    "-lc",
    "pnpm install --frozen-lockfile --offline --store-dir=/pnpm/store && pnpm lint && pnpm exec tsc --noEmit && pnpm build",
  ]);
  await run("git", ["diff", "--check"]);
}

export async function stop(instance) {
  await runCompose(instance, ["--profile", "app", "stop"]);
}

export async function reset(instance) {
  await runCompose(instance, [
    "--profile",
    "app",
    "down",
    "--volumes",
    "--remove-orphans",
  ]);
  await bootstrap(instance);
}

export async function destroy(instance) {
  if (instance.composeProject !== `codebuff-${instance.instanceId}`) {
    throw new Error("Refusing to destroy an unrecognized Compose project.");
  }

  await runCompose(instance, [
    "--profile",
    "app",
    "down",
    "--volumes",
    "--remove-orphans",
  ]);
  releasePortReservation(instance.slot);

  const resolvedStateDirectory = path.resolve(workspaceStateDirectory);
  if (path.dirname(resolvedStateDirectory) !== projectRoot) {
    throw new Error("Refusing to remove an unexpected local state directory.");
  }

  rmSync(resolvedStateDirectory, { recursive: true, force: true });
  console.info(`Destroyed ${instance.composeProject}.`);
}
