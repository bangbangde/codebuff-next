import { cpSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const buildRoot = path.join(projectRoot, ".build");
const migrationsSource = path.join(projectRoot, "drizzle");

if (!existsSync(migrationsSource)) {
  throw new Error(`Required deployment source is missing: ${migrationsSource}`);
}

rmSync(buildRoot, { force: true, recursive: true });

await build({
  absWorkingDir: projectRoot,
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
  bundle: true,
  entryNames: "[name]",
  entryPoints: {
    deploy: "scripts/src/deploy.ts",
  },
  format: "esm",
  logLevel: "info",
  minify: false,
  outExtension: { ".js": ".mjs" },
  outdir: buildRoot,
  packages: "bundle",
  platform: "node",
  sourcemap: false,
  target: "node22",
});

cpSync(migrationsSource, path.join(buildRoot, "drizzle"), {
  recursive: true,
});
