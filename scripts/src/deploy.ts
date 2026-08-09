import process from "node:process";

import { bootstrapAuthUser } from "./bootstrap-user";
import { initializeGarage } from "./initialize-garage";
import { migrateDatabase } from "./migrate";

const commands = {
  prepare: async () => {
    await migrateDatabase();
    await initializeGarage();
  },
  migrate: migrateDatabase,
  "garage:initialize": initializeGarage,
  "auth:bootstrap": bootstrapAuthUser,
};

const secretEnvironmentVariables = [
  "AUTH_BOOTSTRAP_PASSWORD",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_SECRETS",
  "GARAGE_RUNTIME_SECRET_ACCESS_KEY",
  "OBJECT_STORAGE_SECRET_ACCESS_KEY",
  "PG_PWD",
] as const;

function describeError(error: unknown): string {
  const messages: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (current !== undefined && current !== null && !seen.has(current)) {
    seen.add(current);
    const message = current instanceof Error ? current.message : String(current);
    if (message && messages.at(-1) !== message) {
      messages.push(message);
    }
    current = current instanceof Error ? current.cause : undefined;
  }

  let description = messages.join(": ");
  for (const name of secretEnvironmentVariables) {
    const secret = process.env[name];
    if (secret) {
      description = description.replaceAll(secret, "[redacted]");
    }
  }

  return description;
}

async function main(): Promise<void> {
  const commandName = process.argv[2];
  const command = commands[commandName as keyof typeof commands];

  if (!command) {
    throw new Error(
      `Usage: node .build/deploy.mjs <${Object.keys(commands).join("|")}>`,
    );
  }

  await command();
}

void main().catch((error: unknown) => {
  console.error(`Deployment command failed: ${describeError(error)}`);
  process.exitCode = 1;
});
