import process from "node:process";

import {
  bootstrap,
  containerDevelopment,
  containerVerify,
  destroy,
  doctor,
  hostDevelopment,
  reset,
  startInfrastructure,
  status,
  stop,
  verify,
} from "./workspace/commands.mjs";
import {
  ensureWorkspaceInstance,
  requireWorkspaceInstance,
} from "./workspace/instance.mjs";

const commands = {
  bootstrap: async () => bootstrap(await ensureWorkspaceInstance()),
  up: async () => startInfrastructure(await ensureWorkspaceInstance()),
  dev: async () => hostDevelopment(await ensureWorkspaceInstance()),
  "container-dev": async () =>
    containerDevelopment(await ensureWorkspaceInstance()),
  status: async () => status(requireWorkspaceInstance()),
  doctor: async () => doctor(await ensureWorkspaceInstance()),
  stop: async () => stop(requireWorkspaceInstance()),
  reset: async () => reset(requireWorkspaceInstance()),
  destroy: async () => destroy(requireWorkspaceInstance()),
  verify: async () => verify(await ensureWorkspaceInstance()),
  "container-verify": async () =>
    containerVerify(await ensureWorkspaceInstance()),
};

async function main() {
  const commandName = process.argv[2];
  const command = commands[commandName];

  if (!command) {
    throw new Error(
      `Usage: node scripts/local/workspace.mjs <${Object.keys(commands).join("|")}>`,
    );
  }

  await command();
}

void main().catch((error) => {
  console.error(`Local workspace command failed: ${error.message}`);
  process.exitCode = 1;
});
