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
  new URL("../.build/article-media-reference-integration.mjs", import.meta.url),
);
const migrationPath = fileURLToPath(
  new URL("../.build/runtime-tools/db/migrate.cjs", import.meta.url),
);
const testDatabaseName =
  `codebuff_article_media_${process.pid}_${Date.now()}`.toLowerCase();

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
        import { randomUUID } from "node:crypto";
        import { and, eq } from "drizzle-orm";

        import { ArticleMediaUnavailableError } from "./features/articles/article-errors";
        import {
          createArticle,
          deleteArticle,
          updateArticle,
        } from "./features/articles/server/article-service";
        import { getDatabase, getPostgresPool } from "./lib/db/client";
        import {
          article,
          articleMediaReference,
          mediaAsset,
        } from "./lib/db/schema";

        const firstMediaId = randomUUID();
        const secondMediaId = randomUUID();
        const pendingMediaId = randomUUID();
        const missingMediaId = randomUUID();
        const sha256 = "a".repeat(64);
        const baseArticle = {
          bodyMarkdown: "",
          kind: "Integration",
          language: "en",
          slug: "article-media-integration",
          summary: "Article media reference integration.",
          title: "Article media integration",
        };

        try {
          await getDatabase().insert(mediaAsset).values([
            {
              byteSize: 68,
              id: firstMediaId,
              mediaType: "image/png",
              objectKey: "integration/" + firstMediaId,
              originalFilename: "first.png",
              sha256,
              status: "ready",
            },
            {
              byteSize: 68,
              id: secondMediaId,
              mediaType: "image/png",
              objectKey: "integration/" + secondMediaId,
              originalFilename: "second.png",
              sha256,
              status: "ready",
            },
            {
              byteSize: 68,
              id: pendingMediaId,
              mediaType: "image/png",
              objectKey: "integration/" + pendingMediaId,
              originalFilename: "pending.png",
              sha256,
              status: "pending",
            },
          ]);

          const created = await createArticle({
            ...baseArticle,
            bodyMarkdown:
              "![first](cq-media://" + firstMediaId + ")\\n" +
              "![repeat](cq-media://" + firstMediaId + ")\\n" +
              "[external](https://example.com/file.pdf)",
          });
          let references = await getDatabase()
            .select()
            .from(articleMediaReference)
            .where(eq(articleMediaReference.articleId, created.id));
          assert.deepEqual(references.map((row) => row.mediaId), [firstMediaId]);

          await assert.rejects(
            createArticle({
              ...baseArticle,
              bodyMarkdown: "![pending](cq-media://" + pendingMediaId + ")",
              slug: "pending-media-article",
            }),
            (error) => error instanceof ArticleMediaUnavailableError,
          );
          const [rolledBackCreate] = await getDatabase()
            .select({ id: article.id })
            .from(article)
            .where(eq(article.slug, "pending-media-article"));
          assert.equal(rolledBackCreate, undefined);

          const updated = await updateArticle({
            ...baseArticle,
            bodyMarkdown: "![second](cq-media://" + secondMediaId + ")",
            expectedRevision: 1,
            id: created.id,
          });
          assert.equal(updated.status, "updated");
          references = await getDatabase()
            .select()
            .from(articleMediaReference)
            .where(eq(articleMediaReference.articleId, created.id));
          assert.deepEqual(references.map((row) => row.mediaId), [secondMediaId]);

          const stale = await updateArticle({
            ...baseArticle,
            bodyMarkdown: "![first](cq-media://" + firstMediaId + ")",
            expectedRevision: 1,
            id: created.id,
          });
          assert.equal(stale.status, "conflict");

          await assert.rejects(
            updateArticle({
              ...baseArticle,
              bodyMarkdown: "![missing](cq-media://" + missingMediaId + ")",
              expectedRevision: 2,
              id: created.id,
            }),
            (error) => error instanceof ArticleMediaUnavailableError,
          );
          const [unchanged] = await getDatabase()
            .select({ revision: article.revision })
            .from(article)
            .where(eq(article.id, created.id));
          assert.equal(unchanged.revision, 2);
          references = await getDatabase()
            .select()
            .from(articleMediaReference)
            .where(eq(articleMediaReference.articleId, created.id));
          assert.deepEqual(references.map((row) => row.mediaId), [secondMediaId]);

          const deleted = await deleteArticle({
            expectedRevision: 2,
            id: created.id,
          });
          assert.equal(deleted.status, "deleted");
          const remainingReferences = await getDatabase()
            .select()
            .from(articleMediaReference)
            .where(
              and(
                eq(articleMediaReference.articleId, created.id),
                eq(articleMediaReference.mediaId, secondMediaId),
              ),
            );
          assert.equal(remainingReferences.length, 0);

          console.log("Article media reference integration passed.");
        } finally {
          await getPostgresPool().end();
        }
      `,
      loader: "ts",
      resolveDir: projectRoot,
      sourcefile: "article-media-reference-integration-entry.ts",
    },
    target: "node22",
  });
}

const environment = {
  ...process.env,
  PG_DB: testDatabaseName,
};
let databaseCreated = false;

try {
  await buildRunner();
  assert.match(testDatabaseName, /^[a-z0-9_]+$/);
  await usingDatabase(
    process.env.PG_MAINTENANCE_DB?.trim() || "postgres",
    (client) => client.query(`CREATE DATABASE "${testDatabaseName}"`),
  );
  databaseCreated = true;
  await runNode("Article media migration", migrationPath, environment);
  await runNode("Article media integration", runnerPath, environment);
} finally {
  if (databaseCreated) {
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
}
