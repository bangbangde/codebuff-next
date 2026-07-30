import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import { after, before, describe, it } from "node:test";

import pg from "pg";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const { Client, Pool } = pg;

const migrateScript = fileURLToPath(
  new URL("../.build/runtime-tools/db/migrate.cjs", import.meta.url),
);
const testDatabaseName =
  `codebuff_article_assets_${process.pid}_${Date.now()}`.toLowerCase();

let adminClient;

function adminDatabaseConfig() {
  return {
    host: process.env.PG_HOST?.trim() || "127.0.0.1",
    port: Number(process.env.PG_PORT?.trim() || 5432),
    user: process.env.PG_USER?.trim() || "codebuff",
    password: process.env.PG_PWD?.trim() || "codebuff",
    database: process.env.PG_DB?.trim() || "codebuff",
  };
}

function testDatabaseConfig() {
  return { ...adminDatabaseConfig(), database: testDatabaseName };
}

function articleStorageConfig() {
  return {
    endpoint: process.env.ARTICLE_S3_ENDPOINT?.trim() || "http://127.0.0.1:3900",
    region: process.env.ARTICLE_S3_REGION?.trim() || "garage",
    bucket: process.env.ARTICLE_S3_BUCKET?.trim() || "codebuff-next-article",
    accessKeyId:
      process.env.ARTICLE_S3_ACCESS_KEY_ID?.trim() ||
      "GK0123456789abcdef01234567",
    secretAccessKey:
      process.env.ARTICLE_S3_SECRET_ACCESS_KEY?.trim() ||
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  };
}

function createS3Client() {
  const config = articleStorageConfig();
  return new S3Client({
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    endpoint: config.endpoint,
    forcePathStyle: true,
    region: config.region,
  });
}

async function runMigrations() {
  const child = spawn("node", [migrateScript], {
    env: {
      ...process.env,
      PG_DB: testDatabaseName,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  const [code] = await once(child, "exit");

  if (code !== 0) {
    throw new Error(
      `Migrations failed (exit ${code}). stdout: ${stdout}. stderr: ${stderr}`,
    );
  }
}

async function seedArticle(client, overrides = {}) {
  const id = overrides.id ?? randomUUID();
  await client.query(
    `INSERT INTO "article"
      ("id", "slug", "title", "summary", "body_markdown", "kind", "language", "revision")
     VALUES ($1, $2, $3, $4, $5, $6, $7, 1)`,
    [
      id,
      overrides.slug ?? `article-${id.slice(0, 8)}`,
      overrides.title ?? "Test article",
      overrides.summary ?? "A test article.",
      overrides.bodyMarkdown ?? "# Hello",
      overrides.kind ?? "工程札记",
      overrides.language ?? "zh-CN",
    ],
  );
  return id;
}

async function seedArticleAsset(client, articleId, overrides = {}) {
  const id = overrides.id ?? randomUUID();
  const objectKey = overrides.objectKey ?? `articles/${articleId}/${id}`;
  await client.query(
    `INSERT INTO "article_asset"
      ("id", "article_id", "object_key", "original_filename", "media_type", "byte_size", "sha256")
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      articleId,
      objectKey,
      overrides.originalFilename ?? "cover.png",
      overrides.mediaType ?? "image/png",
      overrides.byteSize ?? 68,
      overrides.sha256 ?? "a".repeat(64),
    ],
  );
  return { id, objectKey };
}

async function countArticleAssets(client, articleId) {
  const result = await client.query(
    'SELECT COUNT(*)::integer AS "count" FROM "article_asset" WHERE "article_id" = $1',
    [articleId],
  );
  return result.rows[0].count;
}

async function putTestObject(s3, objectKey, body = Buffer.from("test-payload")) {
  const config = articleStorageConfig();
  await s3.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
      Body: body,
      ContentType: "image/png",
    }),
  );
}

async function objectExists(s3, objectKey) {
  const config = articleStorageConfig();
  try {
    await s3.send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

async function deleteTestObject(s3, objectKey) {
  const config = articleStorageConfig();
  await s3.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
    }),
  );
}

async function withTestDatabase(callback) {
  const pool = new Pool({ ...testDatabaseConfig(), max: 1 });
  try {
    const client = await pool.connect();
    try {
      return await callback(client);
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

describe("Article assets integration", () => {
  before(async () => {
    adminClient = new Client(adminDatabaseConfig());
    await adminClient.connect();
    await adminClient.query(
      `CREATE DATABASE "${testDatabaseName}" TEMPLATE "template0"`,
    );

    await runMigrations();
  });

  after(async () => {
    if (adminClient) {
      await adminClient.query(`DROP DATABASE IF EXISTS "${testDatabaseName}"`);
      await adminClient.end();
    }
  });

  it("applies all migrations including the article_asset table", async () => {
    await withTestDatabase(async (client) => {
      const tables = await client.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name IN ('article', 'article_asset', 'media_asset', 'article_media_reference')
         ORDER BY table_name`,
      );

      const tableNames = tables.rows.map((row) => row.table_name);

      assert.ok(tableNames.includes("article_asset"));
      assert.ok(!tableNames.includes("media_asset"));
      assert.ok(!tableNames.includes("article_media_reference"));
    });
  });

  it("enforces the cascade from article deletion to article_asset", async () => {
    const s3 = createS3Client();

    await withTestDatabase(async (client) => {
      const articleId = await seedArticle(client, {
        slug: "cascade-test-article",
      });
      const { id: assetId, objectKey } = await seedArticleAsset(
        client,
        articleId,
      );

      await putTestObject(s3, objectKey);
      assert.equal(await countArticleAssets(client, articleId), 1);

      await client.query('DELETE FROM "article" WHERE "id" = $1', [articleId]);

      assert.equal(await countArticleAssets(client, articleId), 0);

      const orphan = await client.query(
        'SELECT 1 FROM "article_asset" WHERE "id" = $1',
        [assetId],
      );
      assert.equal(orphan.rowCount, 0);
    });
  });

  it("captures object keys before cascade so Garage objects can be cleaned up", async () => {
    // 回归测试：deleteArticle 服务必须在删除文章之前抓取 object keys，
    // 因为 ON DELETE cascade 会立即移除 article_asset 行。
    // 此测试复现该逻辑路径，验证 cascade 后提前抓取的 keys 仍可用于清理。
    // article-management.test.mjs 中的静态断言会验证代码实际调用顺序。
    const s3 = createS3Client();

    await withTestDatabase(async (client) => {
      const articleId = await seedArticle(client, {
        slug: "service-cleanup-test-article",
      });
      const { objectKey } = await seedArticleAsset(client, articleId);

      await putTestObject(s3, objectKey);
      assert.equal(await objectExists(s3, objectKey), true);

      // 1. 先抓取 object keys（模拟 deleteArticle 服务的修复后逻辑）
      const keysResult = await client.query(
        'SELECT object_key FROM "article_asset" WHERE "article_id" = $1',
        [articleId],
      );
      const objectKeys = keysResult.rows.map((row) => row.object_key);
      assert.equal(objectKeys.length, 1);

      // 2. 删除文章（触发 ON DELETE cascade）
      await client.query('DELETE FROM "article" WHERE "id" = $1', [articleId]);

      // cascade 后 article_asset 行已消失，但 keys 已被抓取
      const remainingAssets = await client.query(
        'SELECT COUNT(*)::integer AS "count" FROM "article_asset" WHERE "article_id" = $1',
        [articleId],
      );
      assert.equal(remainingAssets.rows[0].count, 0);

      // 3. 按 keys 删除 Garage 对象
      const config = articleStorageConfig();
      await Promise.all(
        objectKeys.map(async (key) => {
          await s3.send(
            new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
          );
        }),
      );

      assert.equal(await objectExists(s3, objectKey), false);
    });
  });

  it("round-trips an object through Garage put/get/delete", async () => {
    const s3 = createS3Client();
    const objectKey = `articles/integration-test/${randomUUID()}`;
    const payload = Buffer.from("integration-test-payload");

    try {
      await putTestObject(s3, objectKey, payload);

      const config = articleStorageConfig();
      const response = await s3.send(
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: objectKey,
        }),
      );

      const body = await response.Body.transformToByteArray();
      assert.deepEqual(Buffer.from(body), payload);
    } finally {
      await deleteTestObject(s3, objectKey);
      assert.equal(await objectExists(s3, objectKey), false);
    }
  });

  it("rejects invalid media types and oversized files at the database level", async () => {
    await withTestDatabase(async (client) => {
      const articleId = await seedArticle(client, {
        slug: "constraint-test-article",
      });

      await assert.rejects(
        () =>
          client.query(
            `INSERT INTO "article_asset"
              ("id", "article_id", "object_key", "original_filename", "media_type", "byte_size", "sha256")
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              randomUUID(),
              articleId,
              "articles/test/bad",
              "bad.exe",
              "application/x-msdownload",
              100,
              "b".repeat(64),
            ],
          ),
        /article_asset_type_check/,
      );

      await assert.rejects(
        () =>
          client.query(
            `INSERT INTO "article_asset"
              ("id", "article_id", "object_key", "original_filename", "media_type", "byte_size", "sha256")
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              randomUUID(),
              articleId,
              "articles/test/huge",
              "huge.png",
              "image/png",
              20 * 1024 * 1024,
              "c".repeat(64),
            ],
          ),
        /article_asset_size_check/,
      );

      await assert.rejects(
        () =>
          client.query(
            `INSERT INTO "article_asset"
              ("id", "article_id", "object_key", "original_filename", "media_type", "byte_size", "sha256")
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              randomUUID(),
              articleId,
              "articles/test/badhash",
              "bad.png",
              "image/png",
              100,
              "not-a-hash",
            ],
          ),
        /article_asset_sha256_check/,
      );
    });
  });
});
