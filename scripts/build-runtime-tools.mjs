import { cpSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const buildRoot = path.join(projectRoot, ".build", "migrate");
const migrationsSource = path.join(projectRoot, "drizzle");
const migrationsDestination = path.join(buildRoot, "migrate", "drizzle");

if (!existsSync(migrationsSource)) {
  throw new Error("The committed Drizzle migration directory is missing");
}

rmSync(buildRoot, { force: true, recursive: true });

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
    outfile: path.join(buildRoot, "migrate", "index.js"),
  }),
  build({
    ...sharedBuildOptions,
    banner: {
      js: [
        'import { createRequire } from "node:module";',
        "const require = createRequire(import.meta.url);",
      ].join("\n"),
    },
    entryPoints: ["scripts/bootstrap-auth-user.mjs"],
    format: "esm",
    outfile: path.join(buildRoot, "scripts", "bootstrap-auth-user.mjs"),
  }),
]);

cpSync(migrationsSource, migrationsDestination, { recursive: true });
