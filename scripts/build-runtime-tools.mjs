import { cpSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const runtimeToolsRoot = path.join(projectRoot, ".build", "runtime-tools");
const authBuildRoot = path.join(runtimeToolsRoot, "auth");
const databaseBuildRoot = path.join(runtimeToolsRoot, "db");
const migrationsSource = path.join(projectRoot, "drizzle");
const migrationsDestination = path.join(databaseBuildRoot, "drizzle");

if (!existsSync(migrationsSource)) {
  throw new Error("The committed Drizzle migration directory is missing");
}

rmSync(runtimeToolsRoot, { force: true, recursive: true });

const sharedBuildOptions = {
  absWorkingDir: projectRoot,
  bundle: true,
  logLevel: "info",
  minify: false,
  packages: "bundle",
  platform: "node",
  sourcemap: false,
  target: "node22",
};

await Promise.all([
  build({
    ...sharedBuildOptions,
    entryPoints: ["migrate/index.ts"],
    format: "cjs",
    outfile: path.join(databaseBuildRoot, "migrate.cjs"),
  }),
  build({
    ...sharedBuildOptions,
    entryPoints: ["scripts/bootstrap-auth-user.mjs"],
    format: "cjs",
    outfile: path.join(authBuildRoot, "bootstrap-user.cjs"),
  }),
]);

cpSync(migrationsSource, migrationsDestination, { recursive: true });
