import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("Article schema ownership", () => {
  it("isolates generated Auth schema from project-owned tables", async () => {
    const packageJson = await readFile("package.json", "utf8");
    const drizzleConfig = await readFile("drizzle.config.ts", "utf8");
    const authSchema = await readFile(
      "lib/db/schema/auth.generated.ts",
      "utf8",
    );
    const articleSchema = await readFile("lib/db/schema/article.ts", "utf8");
    const schemaIndex = await readFile("lib/db/schema/index.ts", "utf8");
    const runtime = await readFile("lib/auth/runtime.ts", "utf8");
    const client = await readFile("lib/db/client.ts", "utf8");

    assert.match(
      packageJson,
      /--output \.\/lib\/db\/schema\/auth\.generated\.ts/,
    );
    assert.doesNotMatch(packageJson, /--output \.\/lib\/db\/schema\.ts/);
    assert.match(drizzleConfig, /schema\/auth\.generated\.ts/);
    assert.match(drizzleConfig, /schema\/article\.ts/);
    assert.match(authSchema, /export const user = pgTable/);
    assert.match(authSchema, /role: text\("role"\)/);
    assert.doesNotMatch(authSchema, /pgTable\("article"/);
    assert.match(articleSchema, /pgTable\(\s*"article"/);
    assert.match(schemaIndex, /export \* from "\.\/auth\.generated"/);
    assert.match(schemaIndex, /export \* from "\.\/article"/);
    assert.match(runtime, /import \* as authSchema/);
    assert.match(runtime, /schema: authSchema/);
    assert.match(client, /import \* as schema from "\.\/schema"/);
  });

  it("adds only the approved article persistence in migration 0002", async () => {
    const migration = await readFile(
      "drizzle/0002_article-persistence.sql",
      "utf8",
    );

    assert.match(migration, /CREATE TABLE "article"/);
    assert.match(migration, /"id" uuid PRIMARY KEY DEFAULT gen_random_uuid\(\)/);
    assert.match(migration, /"slug" text NOT NULL/);
    assert.match(migration, /"body_markdown" text DEFAULT '' NOT NULL/);
    assert.match(migration, /"revision" integer DEFAULT 1 NOT NULL/);
    assert.match(migration, /article_slug_format_check/);
    assert.match(migration, /article_language_check/);
    assert.match(migration, /article_revision_check/);
    assert.match(migration, /CREATE UNIQUE INDEX "article_slug_unique"/);
    assert.match(migration, /CREATE INDEX "article_updated_at_idx"/);
    assert.doesNotMatch(
      migration,
      /ALTER TABLE "(user|account|session|verification|two_factor|passkey|rate_limit)"/,
    );
    assert.doesNotMatch(migration, /\bDROP\b|\bRENAME\b/);
  });
});

describe("Admin article list slice", () => {
  it("protects the page and reads summaries directly through the service", async () => {
    const page = await readFile(
      "app/(admin)/admin/articles/page.tsx",
      "utf8",
    );
    const repository = await readFile(
      "features/articles/server/drizzle-article-repository.ts",
      "utf8",
    );
    const service = await readFile(
      "features/articles/server/article-service.ts",
      "utf8",
    );

    assert.match(page, /await requireAdmin\(\)/);
    assert.match(page, /await listArticleSummaries\(\)/);
    assert.match(page, /articles\.length === 0/);
    assert.match(repository, /from\(article\)/);
    assert.match(
      repository,
      /orderBy\(desc\(article\.updatedAt\), asc\(article\.slug\)\)/,
    );
    assert.match(service, /drizzleArticleRepository\.listSummaries\(\)/);
    assert.doesNotMatch(page, /fetch\(|\/api\/admin\/articles/);
  });
});
