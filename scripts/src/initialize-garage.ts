import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import process from "node:process";

import { objectStorageBuckets } from "../../lib/object-storage/schema.mjs";

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function runtimeCredential(
  deploymentVariable: string,
  applicationVariable: string,
): string {
  return (
    process.env[deploymentVariable]?.trim() ||
    requiredEnvironmentVariable(applicationVariable)
  );
}

function requiredBucketNames(): string[] {
  return Object.values(objectStorageBuckets).map(({ environmentVariable }) =>
    requiredEnvironmentVariable(environmentVariable),
  );
}

export async function initializeGarage(): Promise<void> {
  const scriptPath = fileURLToPath(
    new URL("./initialize-garage.sh", import.meta.url),
  );
  const shell =
    process.env.GARAGE_INIT_SHELL?.trim() ||
    (process.platform === "win32" ? "sh" : "/bin/sh");
  const runtimeAccessKeyId = runtimeCredential(
    "GARAGE_RUNTIME_ACCESS_KEY_ID",
    "OBJECT_STORAGE_ACCESS_KEY_ID",
  );
  const runtimeSecretAccessKey = runtimeCredential(
    "GARAGE_RUNTIME_SECRET_ACCESS_KEY",
    "OBJECT_STORAGE_SECRET_ACCESS_KEY",
  );

  await new Promise<void>((resolve, reject) => {
    const child = spawn(shell, [scriptPath], {
      env: {
        ...process.env,
        GARAGE_REQUIRED_BUCKETS: requiredBucketNames().join(","),
        GARAGE_RUNTIME_ACCESS_KEY_ID: runtimeAccessKeyId,
        GARAGE_RUNTIME_SECRET_ACCESS_KEY: runtimeSecretAccessKey,
      },
      stdio: "inherit",
      windowsHide: true,
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `Garage initialization failed with ${
            signal ? `signal ${signal}` : `exit code ${code}`
          }`,
        ),
      );
    });
  });
}
