import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import esbuild from "esbuild";
import pg from "pg";

const { Client } = pg;

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const buildDirectory = fileURLToPath(new URL("../.build/", import.meta.url));
const runnerPath = fileURLToPath(
  new URL("../.build/media-runtime-integration.mjs", import.meta.url),
);
const migrationPath = fileURLToPath(
  new URL("../.build/runtime-tools/db/migrate.cjs", import.meta.url),
);
const testDatabaseName =
  `codebuff_media_integration_${process.pid}_${Date.now()}`.toLowerCase();

function databaseConfig(database) {
  return {
    connectionTimeoutMillis: Number(
      process.env.PG_CONNECTION_TIMEOUT_MS?.trim() || "10000",
    ),
    database,
    host: process.env.PG_HOST?.trim() || "127.0.0.1",
    password: process.env.PG_PWD || "codebuff",
    port: Number(process.env.PG_PORT?.trim() || "5432"),
    user: process.env.PG_USER?.trim() || "codebuff",
  };
}

async function usingDatabase(database, callback) {
  const client = new Client(databaseConfig(database));

  try {
    await client.connect();
    return await callback(client);
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function createTestDatabase() {
  assert.match(testDatabaseName, /^[a-z0-9_]+$/);

  await usingDatabase(
    process.env.PG_MAINTENANCE_DB?.trim() || "postgres",
    (client) => client.query(`CREATE DATABASE "${testDatabaseName}"`),
  );
}

async function dropTestDatabase() {
  await usingDatabase(
    process.env.PG_MAINTENANCE_DB?.trim() || "postgres",
    async (client) => {
      await client.query(
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
        [testDatabaseName],
      );
      await client.query(`DROP DATABASE IF EXISTS "${testDatabaseName}"`);
    },
  );
}

async function runNode(label, script, environment) {
  const child = spawn(process.execPath, [script], {
    cwd: projectRoot,
    env: environment,
    stdio: "inherit",
    windowsHide: true,
  });
  const [exitCode] = await once(child, "exit");

  if (exitCode !== 0) {
    throw new Error(`${label} exited with code ${exitCode}`);
  }
}

async function buildRunner() {
  await mkdir(buildDirectory, { recursive: true });
  await esbuild.build({
    absWorkingDir: projectRoot,
    bundle: true,
    format: "esm",
    logLevel: "silent",
    outfile: runnerPath,
    packages: "external",
    platform: "node",
    plugins: [
      {
        name: "server-only-stub",
        setup(build) {
          build.onResolve({ filter: /^server-only$/ }, () => ({
            namespace: "server-only-stub",
            path: "server-only",
          }));
          build.onLoad(
            { filter: /.*/, namespace: "server-only-stub" },
            () => ({ contents: "export {};", loader: "js" }),
          );
        },
      },
    ],
    stdin: {
      contents: `
        import assert from "node:assert/strict";
        import { File } from "node:buffer";
        import { randomUUID } from "node:crypto";
        import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
        import { eq } from "drizzle-orm";

        import {
          deleteMediaAsset,
          readMediaAsset,
          retryMediaAsset,
          uploadMediaAsset,
        } from "./features/media/server/media-service";
        import { getMediaStorageConfig } from "./features/media/server/media-storage-config";
        import { getDatabase, getPostgresPool } from "./lib/db/client";
        import {
          article,
          articleMediaReference,
          mediaAsset,
        } from "./lib/db/schema";

        const png = Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlRrGQAAAAASUVORK5CYII=",
          "base64",
        );
        let asset;
        let articleId;
        let cleanupClient;
        let retryAssetId;
        const cleanupObjectKeys = new Set();

        try {
          asset = await uploadMediaAsset(
            new File([png], "media-runtime-proof.png", { type: "image/png" }),
          );
          cleanupObjectKeys.add(asset.objectKey);
          assert.equal(asset.status, "ready");

          const [persisted] = await getDatabase()
            .select()
            .from(mediaAsset)
            .where(eq(mediaAsset.id, asset.id));
          assert.equal(persisted?.status, "ready");
          assert.equal(persisted?.sha256, asset.sha256);

          const read = await readMediaAsset(asset.id);
          assert.deepEqual(Buffer.from(read.body), png);

          const [createdArticle] = await getDatabase()
            .insert(article)
            .values({
              bodyMarkdown: \`![proof](cq-media://\${asset.id})\`,
              kind: "note",
              language: "zh-CN",
              slug: \`media-runtime-\${process.pid}-\${Date.now()}\`,
              summary: "",
              title: "Media runtime proof",
            })
            .returning({ id: article.id });
          articleId = createdArticle.id;
          await getDatabase().insert(articleMediaReference).values({
            articleId,
            mediaId: asset.id,
          });

          await assert.rejects(
            deleteMediaAsset(asset.id),
            (error) => error.name === "MediaReferencedError",
          );
          assert.equal((await readMediaAsset(asset.id)).asset.id, asset.id);

          await getDatabase().delete(article).where(eq(article.id, articleId));
          articleId = undefined;
          await deleteMediaAsset(asset.id);
          cleanupObjectKeys.delete(asset.objectKey);
          asset = undefined;

          retryAssetId = randomUUID();
          const retryObjectKey = \`media/\${retryAssetId}\`;
          cleanupObjectKeys.add(retryObjectKey);
          await getDatabase().insert(mediaAsset).values({
            byteSize: png.byteLength,
            failureCode: "storage_unavailable",
            id: retryAssetId,
            mediaType: "image/png",
            objectKey: retryObjectKey,
            originalFilename: "media-runtime-retry.png",
            sha256: persisted.sha256,
            status: "failed",
          });

          const retried = await retryMediaAsset(
            retryAssetId,
            new File([png], "media-runtime-retry.png", { type: "image/png" }),
          );
          assert.equal(retried.status, "ready");
          assert.deepEqual(
            Buffer.from((await readMediaAsset(retryAssetId)).body),
            png,
          );
          await deleteMediaAsset(retryAssetId);
          cleanupObjectKeys.delete(retryObjectKey);
          retryAssetId = undefined;

          console.log("Media lifecycle runtime integration passed");
        } finally {
          if (articleId) {
            await getDatabase()
              .delete(article)
              .where(eq(article.id, articleId))
              .catch(() => undefined);
          }

          if (retryAssetId) {
            await getDatabase()
              .delete(mediaAsset)
              .where(eq(mediaAsset.id, retryAssetId))
              .catch(() => undefined);
          }

          if (asset) {
            await getDatabase()
              .delete(mediaAsset)
              .where(eq(mediaAsset.id, asset.id))
              .catch(() => undefined);
          }

          if (cleanupObjectKeys.size > 0) {
            const config = getMediaStorageConfig();
            cleanupClient = new S3Client({
              credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
              },
              endpoint: config.endpoint,
              forcePathStyle: true,
              region: config.region,
            });
            for (const objectKey of cleanupObjectKeys) {
              await cleanupClient.send(
                new DeleteObjectCommand({
                  Bucket: config.bucket,
                  Key: objectKey,
                }),
              ).catch(() => undefined);
            }
          }

          cleanupClient?.destroy();
          await getPostgresPool().end();
        }
      `,
      loader: "ts",
      resolveDir: projectRoot,
      sourcefile: "media-runtime-integration-entry.ts",
    },
    target: "node22",
  });
}

const environment = {
  ...process.env,
  MEDIA_S3_ACCESS_KEY_ID:
    process.env.MEDIA_S3_ACCESS_KEY_ID ||
    "GK0123456789abcdef01234567",
  MEDIA_S3_BUCKET:
    process.env.MEDIA_S3_BUCKET || "codebuff-next-media",
  MEDIA_S3_ENDPOINT:
    process.env.MEDIA_S3_ENDPOINT || "http://127.0.0.1:3900",
  MEDIA_S3_REGION: process.env.MEDIA_S3_REGION || "garage",
  MEDIA_S3_SECRET_ACCESS_KEY:
    process.env.MEDIA_S3_SECRET_ACCESS_KEY ||
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  PG_DB: testDatabaseName,
};

let databaseCreated = false;

try {
  await buildRunner();
  await createTestDatabase();
  databaseCreated = true;
  await runNode("Media integration migration", migrationPath, environment);
  await runNode("Media integration runner", runnerPath, environment);
} finally {
  if (databaseCreated) {
    await dropTestDatabase();
  }
}
