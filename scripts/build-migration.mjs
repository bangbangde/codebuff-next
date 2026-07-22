import { spawnSync } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const buildRoot = path.join(projectRoot, ".build", "migrate");
const typescriptCli = path.join(
  projectRoot,
  "node_modules",
  "typescript",
  "bin",
  "tsc",
);
const migrationsSource = path.join(projectRoot, "drizzle");
const migrationsDestination = path.join(buildRoot, "migrate", "drizzle");

rmSync(buildRoot, { force: true, recursive: true });

const compilation = spawnSync(
  process.execPath,
  [typescriptCli, "-p", path.join(projectRoot, "tsconfig.migrate.json")],
  { cwd: projectRoot, stdio: "inherit" },
);

if (compilation.error) {
  throw compilation.error;
}

if (compilation.status !== 0) {
  process.exit(compilation.status ?? 1);
}

if (!existsSync(migrationsSource)) {
  throw new Error("The committed Drizzle migration directory is missing");
}

cpSync(migrationsSource, migrationsDestination, { recursive: true });
