import assert from "node:assert/strict";
import { File } from "node:buffer";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";

import { build } from "esbuild";

async function loadMediaModule(entryPoint) {
  const outputPath = path.resolve(
    ".build",
    `test-${path.basename(entryPoint, ".ts")}.mjs`,
  );
  await mkdir(path.dirname(outputPath), { recursive: true });
  await build({
    bundle: true,
    entryPoints: [entryPoint],
    format: "esm",
    outfile: outputPath,
    packages: "external",
    platform: "node",
    plugins: [
      {
        name: "server-only-stub",
        setup(buildContext) {
          buildContext.onResolve(
            { filter: /^server-only$/ },
            () => ({
              namespace: "server-only-stub",
              path: "server-only",
            }),
          );
          buildContext.onLoad(
            { filter: /.*/, namespace: "server-only-stub" },
            () => ({ contents: "" }),
          );
        },
      },
    ],
  });

  return import(`${pathToFileURL(outputPath).href}?v=${Date.now()}`);
}

const validation = await loadMediaModule(
  "features/media/media-file-validation.ts",
);
const uploadService = await loadMediaModule(
  "features/media/server/media-upload-service.ts",
);

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlRrGQAAAAASUVORK5CYII=",
  "base64",
);

function pngFile(
  name = "pixel.png",
  type = "image/png",
) {
  return new File([onePixelPng], name, { type });
}

function createFakeRepository() {
  const records = new Map();

  return {
    records,
    async createPending(input) {
      const now = new Date().toISOString();
      const asset = {
        ...input,
        createdAt: now,
        failureCode: null,
        status: "pending",
        updatedAt: now,
      };
      records.set(input.id, asset);
      return asset;
    },
    async list() {
      return [...records.values()];
    },
    async markFailed(id, failureCode) {
      const asset = {
        ...records.get(id),
        failureCode,
        status: "failed",
        updatedAt: new Date().toISOString(),
      };
      records.set(id, asset);
      return asset;
    },
    async markReady(id) {
      const asset = {
        ...records.get(id),
        failureCode: null,
        status: "ready",
        updatedAt: new Date().toISOString(),
      };
      records.set(id, asset);
      return asset;
    },
  };
}

describe("Media persistence contract", () => {
  it("adds one project-owned media table in migration 0003", async () => {
    const schema = await readFile("lib/db/schema/media.ts", "utf8");
    const migration = await readFile(
      "drizzle/0003_material_synch.sql",
      "utf8",
    );
    const drizzleConfig = await readFile("drizzle.config.ts", "utf8");
    const schemaIndex = await readFile("lib/db/schema/index.ts", "utf8");

    assert.match(schema, /pgTable\(\s*"media_asset"/);
    assert.match(schema, /media_asset_type_check/);
    assert.match(schema, /media_asset_failure_check/);
    assert.match(migration, /CREATE TABLE "media_asset"/);
    assert.match(migration, /"id" uuid PRIMARY KEY NOT NULL/);
    assert.match(migration, /"object_key" text NOT NULL/);
    assert.match(migration, /"status" text DEFAULT 'pending' NOT NULL/);
    assert.match(migration, /media_asset_size_check/);
    assert.match(migration, /media_asset_sha256_check/);
    assert.doesNotMatch(migration, /\bDROP\b|\bRENAME\b/);
    assert.match(drizzleConfig, /schema\/media\.ts/);
    assert.match(schemaIndex, /export \* from "\.\/media"/);
  });

  it("keeps local Garage bootstrap private, least-privilege, and repeatable", async () => {
    const compose = await readFile("docker-compose-dev.yml", "utf8");
    const entrypoint = await readFile(
      "docker/garage-entrypoint.sh",
      "utf8",
    );
    const environmentExample = await readFile(".env.example", "utf8");
    const packageManifest = JSON.parse(
      await readFile("package.json", "utf8"),
    );
    const runtimeIntegration = await readFile(
      "test/media-runtime.integration.mjs",
      "utf8",
    );

    assert.match(compose, /MEDIA_S3_BUCKET:/);
    assert.match(compose, /MEDIA_S3_ACCESS_KEY_ID:/);
    assert.match(compose, /MEDIA_S3_SECRET_ACCESS_KEY:/);
    assert.match(entrypoint, /key info "\$media_access_key_id"/);
    assert.match(entrypoint, /key import/);
    assert.match(entrypoint, /bucket info "\$media_bucket"/);
    assert.match(entrypoint, /bucket create "\$media_bucket"/);
    assert.match(entrypoint, /bucket allow \\\n  --write/);
    assert.doesNotMatch(entrypoint, /bucket allow[\s\S]*--read/);
    assert.doesNotMatch(entrypoint, /bucket allow[\s\S]*--owner/);
    assert.match(environmentExample, /loopback-only local Garage/);
    assert.match(
      packageManifest.scripts["test:integration:media"],
      /media-runtime\.integration\.mjs/,
    );
    assert.match(runtimeIntegration, /CREATE DATABASE/);
    assert.match(runtimeIntegration, /DROP DATABASE IF EXISTS/);
    assert.match(runtimeIntegration, /DeleteObjectCommand/);
  });
});

describe("Media signature validation", () => {
  it("accepts a matching PNG and computes authoritative metadata", async () => {
    const verified = await validation.verifyMediaFile(pngFile());

    assert.equal(verified.mediaType, "image/png");
    assert.equal(verified.originalFilename, "pixel.png");
    assert.equal(verified.byteSize, onePixelPng.byteLength);
    assert.match(verified.sha256, /^[0-9a-f]{64}$/);
  });

  it("rejects mismatched declarations, unsupported types, and path names", async () => {
    await assert.rejects(
      validation.verifyMediaFile(pngFile("pixel.jpg", "image/jpeg")),
      (error) => error.code === "signature_mismatch",
    );
    await assert.rejects(
      validation.verifyMediaFile(
        new File(["hello"], "note.txt", { type: "text/plain" }),
      ),
      (error) => error.code === "unsupported_media_type",
    );
    await assert.rejects(
      validation.verifyMediaFile(pngFile("../pixel.png")),
      (error) => error.code === "invalid_filename",
    );
  });

  it("rejects empty and oversized files before signature inspection", async () => {
    await assert.rejects(
      validation.verifyMediaFile(
        new File([], "empty.png", { type: "image/png" }),
      ),
      (error) => error.code === "empty_file",
    );
    await assert.rejects(
      validation.verifyMediaFile(
        new File(
          [new Uint8Array(10 * 1024 * 1024 + 1)],
          "large.png",
          { type: "image/png" },
        ),
      ),
      (error) => error.code === "file_too_large",
    );
  });
});

describe("Media upload lifecycle", () => {
  it("uses a server-generated object key and marks confirmed writes ready", async () => {
    const repository = createFakeRepository();
    let storedObject;
    const asset =
      await uploadService.uploadMediaAssetWithDependencies(
        pngFile("owner-photo.png"),
        {
          repository,
          storage: {
            async put(input) {
              storedObject = input;
            },
          },
        },
      );

    assert.equal(asset.status, "ready");
    assert.equal(asset.originalFilename, "owner-photo.png");
    assert.match(asset.objectKey, /^media\/[0-9a-f-]{36}$/);
    assert.equal(asset.objectKey.includes("owner-photo"), false);
    assert.equal(storedObject.objectKey, asset.objectKey);
    assert.equal(storedObject.sha256, asset.sha256);
  });

  it("persists a failed state when Garage rejects the object write", async () => {
    const repository = createFakeRepository();
    const originalConsoleError = console.error;
    console.error = () => undefined;

    try {
      await assert.rejects(
        uploadService.uploadMediaAssetWithDependencies(pngFile(), {
          repository,
          storage: {
            async put() {
              throw new Error("Garage unavailable");
            },
          },
        }),
        (error) => error.name === "MediaStorageError",
      );
    } finally {
      console.error = originalConsoleError;
    }

    const [asset] = [...repository.records.values()];
    assert.equal(asset.status, "failed");
    assert.equal(asset.failureCode, "storage_unavailable");
  });
});

describe("Admin media product slice", () => {
  it("protects the upload boundary before parsing multipart input", async () => {
    const route = await readFile("app/api/admin/media/route.ts", "utf8");
    const authorization = route.indexOf("await requireAdmin()");
    const multipartRead = route.indexOf("await request.formData()");

    assert.ok(authorization >= 0);
    assert.ok(authorization < multipartRead);
    assert.match(route, /file instanceof File/);
    assert.match(route, /MediaValidationError/);
    assert.match(route, /MediaStorageError/);
    assert.match(route, /revalidatePath\("\/admin\/media"\)/);
    assert.doesNotMatch(route, /objectKey/);
    assert.doesNotMatch(route, /MEDIA_S3_(ACCESS_KEY_ID|SECRET_ACCESS_KEY)/);
  });

  it("renders the protected library, upload progress, and bounded states", async () => {
    const page = await readFile(
      "app/(admin)/admin/media/page.tsx",
      "utf8",
    );
    const form = await readFile(
      "app/(admin)/admin/media/_components/media-upload-form.tsx",
      "utf8",
    );
    const navigation = await readFile(
      "app/(admin)/admin/_components/admin-navigation.ts",
      "utf8",
    );

    assert.match(page, /await requireAdmin\(\)/);
    assert.match(page, /await listMediaAssets\(\)/);
    assert.match(page, /assets\.length === 0/);
    assert.match(page, /statusPresentation\[asset\.status\]/);
    assert.match(form, /new XMLHttpRequest\(\)/);
    assert.match(form, /xhr\.upload\.addEventListener\("progress"/);
    assert.match(form, /role="progressbar"/);
    assert.match(form, /router\.refresh\(\)/);
    assert.match(navigation, /href: "\/admin\/media"/);
  });
});
