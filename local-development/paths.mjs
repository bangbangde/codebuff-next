import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceModuleDirectory = path.dirname(fileURLToPath(import.meta.url));

export const projectRoot = path.resolve(workspaceModuleDirectory, "..");
export const workspaceStateDirectory = path.join(projectRoot, ".dev");
export const workspaceInstanceFile = path.join(
  workspaceStateDirectory,
  "instance.json",
);
export const workspaceEnvironmentFile = path.join(
  workspaceStateDirectory,
  "environment.env",
);
export const localComposeFile = path.join(
  projectRoot,
  "local-development",
  "compose.yml",
);
