import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import { build } from "esbuild";

async function loadArticleValidationModule() {
  const result = await build({
    bundle: true,
    entryPoints: ["features/articles/article-validation.ts"],
    format: "esm",
    platform: "node",
    write: false,
  });
  const source = result.outputFiles[0].text;
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;

  return import(moduleUrl);
}

const {
  articleCreateSchema,
  articleIdSchema,
  articleMutationReferenceSchema,
  normalizeArticleCreateValues,
} = await loadArticleValidationModule();

async function loadArticleAssetReferenceModule() {
  const result = await build({
    bundle: true,
    entryPoints: ["features/articles/article-asset-reference.ts"],
    format: "esm",
    platform: "node",
    write: false,
  });
  const source = result.outputFiles[0].text;
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;

  return import(moduleUrl);
}

const assetReferences = await loadArticleAssetReferenceModule();

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

describe("Admin article creation slice", () => {
  it("normalizes and validates the unpublished article input", () => {
    const normalized = normalizeArticleCreateValues({
      bodyMarkdown: "# Hello\n",
      kind: "  工程札记 ",
      language: " zh-CN ",
      slug: "  First-ARTICLE ",
      summary: "  A summary. ",
      title: "  First article ",
    });
    const parsed = articleCreateSchema.safeParse(normalized);

    assert.equal(parsed.success, true);
    assert.deepEqual(normalized, {
      bodyMarkdown: "# Hello\n",
      kind: "工程札记",
      language: "zh-CN",
      slug: "first-article",
      summary: "A summary.",
      title: "First article",
    });
  });

  it("rejects invalid slugs, unsupported languages, and missing fields", () => {
    const parsed = articleCreateSchema.safeParse({
      bodyMarkdown: "",
      kind: "",
      language: "fr",
      slug: "not_a_slug",
      summary: "",
      title: "",
    });

    assert.equal(parsed.success, false);
    assert.deepEqual(Object.keys(parsed.error.flatten().fieldErrors).sort(), [
      "kind",
      "language",
      "slug",
      "title",
    ]);
  });

  it("protects the Server Action and maps expected create failures", async () => {
    const action = await readFile(
      "app/(admin)/admin/articles/new/actions.ts",
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

    assert.ok(
      action.indexOf("await requireAdmin()") <
        action.indexOf("articleCreateSchema.safeParse"),
    );
    assert.match(action, /error instanceof ArticleSlugConflictError/);
    assert.match(action, /revalidatePath\("\/admin\/articles"\)/);
    assert.match(action, /redirect\("\/admin\/articles\?created=1"\)/);
    assert.match(
      service,
      /drizzleArticleRepository\.create\(\s*input,\s*parseCanonicalAssetReferenceIds/,
    );
    assert.match(repository, /\.insert\(article\)/);
    assert.match(repository, /article_slug_unique/);
    assert.match(repository, /throw new ArticleSlugConflictError\(input\.slug\)/);
  });

  it("renders accessible create controls and honest success feedback", async () => {
    const form = await readFile(
      "app/(admin)/admin/articles/new/_components/article-create-form.tsx",
      "utf8",
    );
    const fields = await readFile(
      "app/(admin)/admin/articles/_components/article-fields.tsx",
      "utf8",
    );
    const newPage = await readFile(
      "app/(admin)/admin/articles/new/page.tsx",
      "utf8",
    );
    const listPage = await readFile(
      "app/(admin)/admin/articles/page.tsx",
      "utf8",
    );

    assert.match(form, /useActionState\(/);
    assert.match(form, /<ArticleFields/);
    assert.match(fields, /aria-invalid=/);
    assert.match(fields, /aria-describedby=/);
    assert.match(form, /aria-live="polite"/);
    assert.match(form, /保存未发布文章/);
    assert.match(newPage, /await requireAdmin\(\)/);
    assert.match(newPage, /<ArticleCreateForm \/>/);
    assert.match(listPage, /href="\/admin\/articles\/new"/);
    assert.match(listPage, /articleCreated/);
    assert.match(listPage, /目前仍处于未发布状态/);
  });
});

describe("Admin article detail and mutation slice", () => {
  it("validates stable article IDs and positive expected revisions", () => {
    assert.equal(
      articleIdSchema.safeParse("8e6e377f-76be-4a53-bf95-cd1f68f2660f")
        .success,
      true,
    );
    assert.equal(articleIdSchema.safeParse("first-article").success, false);
    assert.equal(
      articleMutationReferenceSchema.safeParse({
        articleId: "8e6e377f-76be-4a53-bf95-cd1f68f2660f",
        expectedRevision: "3",
      }).success,
      true,
    );
    assert.equal(
      articleMutationReferenceSchema.safeParse({
        articleId: "8e6e377f-76be-4a53-bf95-cd1f68f2660f",
        expectedRevision: "0",
      }).success,
      false,
    );
  });

  it("reads details and performs conditional update and delete mutations", async () => {
    const repository = await readFile(
      "features/articles/server/drizzle-article-repository.ts",
      "utf8",
    );
    const service = await readFile(
      "features/articles/server/article-service.ts",
      "utf8",
    );

    assert.match(repository, /async findById\(id: string\)/);
    assert.match(repository, /\.where\(eq\(article\.id, id\)\)/);
    assert.match(
      repository,
      /async update\(\s*input: UpdateArticleInput,\s*assetIds: readonly string\[\]/,
    );
    assert.match(repository, /\.update\(article\)/);
    assert.match(repository, /sql`\$\{article\.revision\} \+ 1`/);
    assert.match(
      repository,
      /eq\(article\.revision, input\.expectedRevision\)/,
    );
    assert.match(repository, /async delete\(input: DeleteArticleInput\)/);
    assert.match(repository, /\.delete\(article\)/);
    assert.match(repository, /status: "conflict"/);
    assert.match(repository, /status: "not_found"/);
    assert.match(service, /drizzleArticleRepository\.findById\(id\)/);
    assert.match(
      service,
      /drizzleArticleRepository\.update\(\s*input,\s*parseCanonicalAssetReferenceIds/,
    );
    assert.match(service, /drizzleArticleRepository\.delete\(input\)/);
  });

  it("protects and validates both mutation actions before writing", async () => {
    const actions = await readFile(
      "app/(admin)/admin/articles/[articleId]/actions.ts",
      "utf8",
    );

    const firstAuthorization = actions.indexOf("await requireAdmin()");
    const firstValidation = actions.indexOf(
      "articleMutationReferenceSchema.safeParse",
    );

    assert.ok(firstAuthorization >= 0);
    assert.ok(firstAuthorization < firstValidation);
    assert.equal(actions.match(/await requireAdmin\(\)/g)?.length, 4);
    assert.equal(
      actions.match(/articleMutationReferenceSchema\.safeParse/g)?.length,
      2,
    );
    assert.match(actions, /error instanceof ArticleSlugConflictError/);
    assert.match(actions, /result\.status === "conflict"/);
    assert.match(actions, /result\.status === "not_found"/);
    assert.match(actions, /redirect\(`\/admin\/articles\/\$\{/);
    assert.match(actions, /redirect\("\/admin\/articles\?deleted=1"\)/);
  });

  it("links stable detail routes and renders explicit conflict and delete UI", async () => {
    const listPage = await readFile(
      "app/(admin)/admin/articles/page.tsx",
      "utf8",
    );
    const detailPage = await readFile(
      "app/(admin)/admin/articles/[articleId]/page.tsx",
      "utf8",
    );
    const editForm = await readFile(
      "app/(admin)/admin/articles/[articleId]/_components/article-edit-form.tsx",
      "utf8",
    );
    const actions = await readFile(
      "app/(admin)/admin/articles/[articleId]/actions.ts",
      "utf8",
    );
    const deleteDialog = await readFile(
      "app/(admin)/admin/articles/[articleId]/_components/article-delete-dialog.tsx",
      "utf8",
    );

    assert.match(listPage, /href={`\/admin\/articles\/\$\{article\.id\}`}/);
    assert.match(listPage, /articleDeleted/);
    assert.match(detailPage, /await requireAdmin\(\)/);
    assert.match(detailPage, /articleIdSchema\.safeParse/);
    assert.match(detailPage, /notFound\(\)/);
    assert.match(detailPage, /key={article\.revision}/);
    assert.match(editForm, /name="expectedRevision"/);
    assert.match(editForm, /state\.conflictRevision/);
    assert.match(actions, /你的输入仍保留/);
    assert.match(deleteDialog, /<DialogTitle>永久删除未发布文章？/);
    assert.match(deleteDialog, /你将删除“{title}”/);
    assert.match(deleteDialog, /name="expectedRevision"/);
  });

  it("captures object keys before deletion to clean up Garage objects", async () => {
    const service = await readFile(
      "features/articles/server/article-service.ts",
      "utf8",
    );

    // deleteArticle 必须先抓取 keys 再删除文章，否则 ON DELETE cascade
    // 会立即移除 article_asset 行，导致后续查 keys 返回空数组。
    assert.match(service, /listArticleAssetObjectKeys\(input\.id\)/);
    assert.match(service, /drizzleArticleRepository\.delete\(input\)/);
    assert.match(service, /deleteArticleAssetObjectsByKeys\(objectKeys\)/);

    // 验证调用顺序：先 listArticleAssetObjectKeys，再 delete，再 deleteArticleAssetObjectsByKeys
    const listIndex = service.indexOf("listArticleAssetObjectKeys(input.id)");
    const deleteIndex = service.indexOf(
      "drizzleArticleRepository.delete(input)",
    );
    const cleanupIndex = service.indexOf(
      "deleteArticleAssetObjectsByKeys(objectKeys)",
    );

    assert.ok(listIndex >= 0);
    assert.ok(deleteIndex > listIndex);
    assert.ok(cleanupIndex > deleteIndex);
  });
});

describe("Canonical article asset references", () => {
  const firstAssetId = "8e6e377f-76be-4a53-bf95-cd1f68f2660f";
  const secondAssetId = "b6716c96-bb3f-4f67-a622-1ab8e01a83c1";

  it("extracts unique canonical IDs and ignores ordinary Markdown links", () => {
    assert.deepEqual(
      assetReferences.parseCanonicalAssetReferenceIds(`
![cover](cq-asset://${firstAssetId})
[download](cq-asset://${secondAssetId})
![repeat](cq-asset://${firstAssetId})
[external](https://example.com/file.pdf)
![relative](./cover.png)
      `),
      [firstAssetId, secondAssetId],
    );
  });

  it("rejects malformed managed references", () => {
    assert.throws(
      () =>
        assetReferences.parseCanonicalAssetReferenceIds(
          "[broken](cq-asset://not-a-uuid)",
        ),
      (error) => error.name === "ArticleAssetReferenceSyntaxError",
    );
  });

  it("formats image and file references without trusting Markdown labels", () => {
    assert.equal(
      assetReferences.formatCanonicalAssetReference(
        {
          id: firstAssetId,
          mediaType: "image/png",
          originalFilename: "cover.png",
        },
        "cover ] image",
      ),
      `![cover \\] image](cq-asset://${firstAssetId})`,
    );
    assert.equal(
      assetReferences.formatCanonicalAssetReference({
        id: secondAssetId,
        mediaType: "application/pdf",
        originalFilename: "notes.pdf",
      }),
      `[notes.pdf](cq-asset://${secondAssetId})`,
    );
  });

  it("owns article-asset persistence and the editor asset panel", async () => {
    const migration = await readFile(
      "drizzle/0005_tiresome_hellcat.sql",
      "utf8",
    );
    const schema = await readFile(
      "lib/db/schema/article-asset.ts",
      "utf8",
    );
    const repository = await readFile(
      "features/articles/server/drizzle-article-repository.ts",
      "utf8",
    );
    const panel = await readFile(
      "app/(admin)/admin/articles/_components/article-asset-panel.tsx",
      "utf8",
    );

    assert.match(migration, /CREATE TABLE "article_asset"/);
    assert.match(migration, /ON DELETE cascade/);
    assert.match(migration, /DROP TABLE "media_asset"/);
    assert.match(migration, /DROP TABLE "article_media_reference"/);
    assert.match(schema, /onDelete: "cascade"/);
    assert.match(schema, /objectKey/);
    assert.match(repository, /\.articleId !== input\.id/);
    assert.match(panel, /textarea\.setRangeText/);
    assert.match(panel, /type="button"/);
    assert.match(panel, /cq-asset:\/\//);
  });
});
