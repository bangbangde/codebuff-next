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
  normalizePublishValues,
  publishArticleSchema,
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
    assert.match(migration, /"body_markdown" text DEFAULT '' NOT NULL/);
    assert.match(migration, /"revision" integer DEFAULT 1 NOT NULL/);
    assert.match(migration, /article_revision_check/);
    assert.match(migration, /CREATE INDEX "article_updated_at_idx"/);
    assert.doesNotMatch(
      migration,
      /ALTER TABLE "(user|account|session|verification|two_factor|passkey|rate_limit)"/,
    );
    assert.doesNotMatch(migration, /\bDROP\b|\bRENAME\b/);
  });

  it("drops legacy article fields in migration 0006 and adds taxonomy in 0007", async () => {
    const dropMigration = await readFile(
      "drizzle/0006_drop_legacy_article_fields.sql",
      "utf8",
    );
    const taxonomyMigration = await readFile(
      "drizzle/0007_add_article_taxonomy.sql",
      "utf8",
    );

    // 0006: 纯删除，无新增列，避免 drizzle-kit 交互确认
    assert.match(dropMigration, /DROP CONSTRAINT "article_slug_format_check"/);
    assert.match(dropMigration, /DROP CONSTRAINT "article_language_check"/);
    assert.match(dropMigration, /DROP INDEX "article_slug_unique"/);
    assert.match(dropMigration, /ALTER TABLE "article" DROP COLUMN "slug"/);
    assert.match(dropMigration, /ALTER TABLE "article" DROP COLUMN "summary"/);
    assert.match(dropMigration, /ALTER TABLE "article" DROP COLUMN "kind"/);
    assert.match(dropMigration, /ALTER TABLE "article" DROP COLUMN "language"/);

    // 0007: 新增分类/标签结构与 article.category_id
    assert.match(taxonomyMigration, /CREATE TABLE "category"/);
    assert.match(taxonomyMigration, /CREATE TABLE "tag"/);
    assert.match(taxonomyMigration, /CREATE TABLE "article_tag"/);
    assert.match(
      taxonomyMigration,
      /"id" uuid PRIMARY KEY DEFAULT gen_random_uuid\(\) NOT NULL/,
    );
    assert.match(taxonomyMigration, /CREATE UNIQUE INDEX "category_name_unique"/);
    assert.match(taxonomyMigration, /CREATE UNIQUE INDEX "tag_name_unique"/);
    assert.match(
      taxonomyMigration,
      /ALTER TABLE "article" ADD COLUMN "category_id"/,
    );
    assert.match(taxonomyMigration, /article_category_id_category_id_fk/);
    assert.match(taxonomyMigration, /ON DELETE set null/);
  });

  it("rebuilds taxonomy name indexes as case-insensitive in migration 0008", async () => {
    const migration = await readFile(
      "drizzle/0008_case_insensitive_taxonomy_names.sql",
      "utf8",
    );

    assert.match(migration, /DROP INDEX "category_name_unique"/);
    assert.match(migration, /DROP INDEX "tag_name_unique"/);
    assert.match(
      migration,
      /CREATE UNIQUE INDEX "category_name_unique" ON "category" USING btree \(lower\("name"\)\)/,
    );
    assert.match(
      migration,
      /CREATE UNIQUE INDEX "tag_name_unique" ON "tag" USING btree \(lower\("name"\)\)/,
    );
  });

  it("refactors article to double-slot draft/published model in migration 0009", async () => {
    const migration = await readFile(
      "drizzle/0009_double_slot_article.sql",
      "utf8",
    );
    const schema = await readFile("lib/db/schema/article.ts", "utf8");

    // 草稿槽位：重命名旧字段
    assert.match(migration, /RENAME COLUMN "title" TO "draft_title"/);
    assert.match(migration, /RENAME COLUMN "body_markdown" TO "draft_content"/);
    assert.match(migration, /RENAME COLUMN "revision" TO "draft_revision"/);
    assert.match(migration, /RENAME COLUMN "updated_at" TO "draft_updated_at"/);
    // 线上槽位：新增可空字段
    assert.match(migration, /ADD COLUMN "title" text/);
    assert.match(migration, /ADD COLUMN "content" text/);
    assert.match(migration, /ADD COLUMN "summary" text DEFAULT '' NOT NULL/);
    assert.match(migration, /ADD COLUMN "cover_asset_id" uuid/);
    // 发布元数据
    assert.match(migration, /ADD COLUMN "published_at" timestamp with time zone/);
    assert.match(
      migration,
      /ADD COLUMN "published_updated_at" timestamp with time zone/,
    );
    assert.match(migration, /ADD COLUMN "published_from_revision" integer/);
    // 修订约束重命名
    assert.match(migration, /DROP CONSTRAINT "article_revision_check"/);
    assert.match(
      migration,
      /ADD CONSTRAINT "article_draft_revision_check" CHECK \("article"\."draft_revision" >= 1\)/,
    );
    assert.match(migration, /ALTER INDEX "article_updated_at_idx" RENAME TO "article_draft_updated_at_idx"/);
    // schema 文件包含双槽位字段
    assert.match(schema, /draftTitle: text\("draft_title"\)/);
    assert.match(schema, /draftContent: text\("draft_content"\)/);
    assert.match(schema, /draftRevision: integer\("draft_revision"\)/);
    assert.match(schema, /publishedAt: timestamp\("published_at"/);
    assert.match(schema, /publishedFromRevision: integer\("published_from_revision"\)/);
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
      /orderBy\(\s*desc\(article\.draftUpdatedAt\),\s*asc\(article\.draftTitle\),?\s*\)/,
    );
    assert.match(service, /drizzleArticleRepository\.listSummaries\(\)/);
    assert.doesNotMatch(page, /fetch\(|\/api\/admin\/articles/);
  });
});

describe("Admin article creation slice", () => {
  it("normalizes draft input and merges whitespace in title", () => {
    const normalized = normalizeArticleCreateValues({
      bodyMarkdown: "# Hello\n",
      title: "  First article ",
    });
    const parsed = articleCreateSchema.safeParse(normalized);

    assert.equal(parsed.success, true);
    assert.deepEqual(normalized, {
      bodyMarkdown: "# Hello\n",
      title: "First article",
    });
  });

  it("accepts empty drafts with no required fields", () => {
    const parsed = articleCreateSchema.safeParse({
      bodyMarkdown: "",
      title: "",
    });

    assert.equal(parsed.success, true);
  });

  it("rejects oversized titles", () => {
    const parsed = articleCreateSchema.safeParse({
      bodyMarkdown: "",
      title: "x".repeat(201),
    });

    assert.equal(parsed.success, false);
    assert.deepEqual(
      Object.keys(parsed.error.flatten().fieldErrors).sort(),
      ["title"],
    );
  });

  it("protects the draft Server Action and redirects to the edit page", async () => {
    const action = await readFile(
      "app/(admin)/admin/articles/actions.ts",
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

    assert.ok(action.indexOf("await requireAdmin()") < action.indexOf("createDraft("));
    assert.match(action, /revalidatePath\("\/admin\/articles"\)/);
    assert.match(action, /redirect\(`\/admin\/articles\/\$\{created\.id\}`\)/);
    assert.match(service, /drizzleArticleRepository\.createDraft\(\)/);
    assert.match(repository, /async createDraft/);
    assert.match(repository, /未命名文章/);
  });

  it("renders a draft-first create entry and accessible edit fields", async () => {
    const fields = await readFile(
      "app/(admin)/admin/articles/_components/article-fields.tsx",
      "utf8",
    );
    const listPage = await readFile(
      "app/(admin)/admin/articles/page.tsx",
      "utf8",
    );

    // 列表页直接触发草稿创建，无中间页
    assert.match(listPage, /createDraftAction/);
    assert.match(listPage, /创建文章/);
    assert.doesNotMatch(listPage, /\/admin\/articles\/new/);
    assert.match(fields, /aria-invalid=/);
    assert.match(fields, /aria-describedby=/);
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
    // M015-1: 双槽位模型，草稿编辑只更新草稿槽位，乐观锁基于 draftRevision
    assert.match(repository, /sql`\$\{article\.draftRevision\} \+ 1`/);
    assert.match(
      repository,
      /eq\(article\.draftRevision, input\.expectedRevision\)/,
    );
    assert.match(repository, /draftContent: input\.bodyMarkdown/);
    assert.match(repository, /draftTitle: input\.title/);
    assert.match(repository, /async delete\(input: DeleteArticleInput\)/);
    assert.match(repository, /\.delete\(article\)/);
    assert.match(repository, /status: "conflict"/);
    assert.match(repository, /status: "not_found"/);
    // M015-2: 发布流程恢复 taxonomy 处理；草稿编辑(update) 仍只写草稿槽位
    assert.match(repository, /async publish\(/);
    assert.match(repository, /resolveCategoryId/);
    assert.match(repository, /resolveTagIds/);
    assert.match(repository, /articleTag/);
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
    assert.equal(actions.match(/await requireAdmin\(\)/g)?.length, 5);
    assert.equal(
      actions.match(/articleMutationReferenceSchema\.safeParse/g)?.length,
      3,
    );
    assert.match(actions, /error instanceof ArticleAssetUnavailableError/);
    assert.match(actions, /result\.status === "conflict"/);
    assert.match(actions, /result\.status === "not_found"/);
    // #105: updateArticleAction 不再 redirect，返回 saved 状态与修订号供自动保存使用
    // M015-1: 使用草稿修订号
    assert.match(actions, /status: "saved"/);
    assert.match(actions, /savedRevision: result\.article\.draftRevision/);
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
    // #105: 移除 key={article.revision}，避免自动保存成功后 revalidatePath
    // 导致 revision 变化触发组件重新挂载，丢失 saveStatus 状态
    assert.doesNotMatch(detailPage, /key=\{article\.revision\}/);
    assert.match(editForm, /name="expectedRevision"/);
    // #105: 重构为手动状态管理后，conflictRevision 是独立 useState
    assert.match(editForm, /conflictRevision/);
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

describe("Admin article publish slice", () => {
  it("exposes publish DTO types, limits, and an empty publish form state", async () => {
    const dto = await readFile("features/articles/article-dto.ts", "utf8");
    const formState = await readFile(
      "features/articles/article-edit-form-state.ts",
      "utf8",
    );

    assert.match(dto, /export type PublishArticleValues = Readonly</);
    assert.match(dto, /export type PublishArticleInput = PublishArticleValues/);
    assert.match(dto, /expectedRevision: number;/);
    assert.match(dto, /status: "published"/);
    assert.match(dto, /summary: 500,/);
    assert.match(dto, /categoryName: 50,/);
    assert.match(dto, /tagName: 50,/);
    assert.match(formState, /export type ArticlePublishFormState/);
    assert.match(formState, /export const initialArticlePublishFormState/);
    assert.match(formState, /coverAssetId: "",/);
    assert.match(formState, /tagNames: \[\],/);
  });

  it("validates publish values and rejects incomplete publish input", () => {
    const valid = publishArticleSchema.safeParse({
      categoryName: "工程",
      coverAssetId: "8e6e377f-76be-4a53-bf95-cd1f68f2660f",
      summary: "摘要内容",
      tagNames: ["a", "b"],
    });
    assert.equal(valid.success, true);

    assert.equal(
      publishArticleSchema.safeParse({
        categoryName: "",
        coverAssetId: "8e6e377f-76be-4a53-bf95-cd1f68f2660f",
        summary: "x",
        tagNames: ["a"],
      }).success,
      false,
    );

    assert.equal(
      publishArticleSchema.safeParse({
        categoryName: "工程",
        coverAssetId: "not-a-uuid",
        summary: "x",
        tagNames: ["a"],
      }).success,
      false,
    );

    assert.equal(
      publishArticleSchema.safeParse({
        categoryName: "工程",
        coverAssetId: "8e6e377f-76be-4a53-bf95-cd1f68f2660f",
        summary: "x",
        tagNames: [],
      }).success,
      false,
    );

    assert.equal(
      publishArticleSchema.safeParse({
        categoryName: "工程",
        coverAssetId: "8e6e377f-76be-4a53-bf95-cd1f68f2660f",
        summary: "x",
        tagNames: Array.from({ length: 21 }, (_, i) => `t${i}`),
      }).success,
      false,
    );
  });

  it("normalizes publish values, trimming fields and dropping empty tags", () => {
    const normalized = normalizePublishValues({
      categoryName: "  工程  ",
      coverAssetId: "8e6e377f-76be-4a53-bf95-cd1f68f2660f",
      summary: "  摘要  ",
      tagNames: [" A ", "", "  ", "B"],
    });

    assert.deepEqual(normalized, {
      categoryName: "工程",
      coverAssetId: "8e6e377f-76be-4a53-bf95-cd1f68f2660f",
      summary: "摘要",
      tagNames: ["A", "B"],
    });
  });

  it("publishes by copying the draft slot to live and syncing taxonomy", async () => {
    const repository = await readFile(
      "features/articles/server/drizzle-article-repository.ts",
      "utf8",
    );
    const service = await readFile(
      "features/articles/server/article-service.ts",
      "utf8",
    );

    // 签名：传入 coverAssetId 用于归属校验
    assert.match(
      repository,
      /async publish\(\s*input: PublishArticleInput,\s*assetIds: readonly string\[\]/,
    );
    // 将草稿槽位复制到线上槽位
    assert.match(repository, /content: sql`\$\{article\.draftContent\}`/);
    assert.match(repository, /title: sql`\$\{article\.draftTitle\}`/);
    // publishedAt 仅首次发布写入；publishedFromRevision 记录发布时草稿修订
    assert.match(repository, /publishedAt: sql`coalesce/);
    assert.match(repository, /publishedFromRevision: sql`\$\{article\.draftRevision\}`/);
    // 乐观锁基于草稿修订
    assert.match(
      repository,
      /eq\(article\.draftRevision, input\.expectedRevision\)/,
    );
    // 同步 article_tag：先删后插
    assert.match(
      repository,
      /\.delete\(articleTag\)\s*\.where\(eq\(articleTag\.articleId/,
    );
    assert.match(repository, /\.insert\(articleTag\)\.values/);
    assert.match(repository, /status: "published"/);
    assert.match(repository, /status: "conflict"/);
    assert.match(repository, /status: "not_found"/);

    assert.match(service, /export function publishArticle/);
    assert.match(
      service,
      /drizzleArticleRepository\.publish\(input, \[input\.coverAssetId\]\)/,
    );
  });

  it("protects and validates the publish action before writing", async () => {
    const actions = await readFile(
      "app/(admin)/admin/articles/[articleId]/actions.ts",
      "utf8",
    );

    const firstAuthorization = actions.indexOf("await requireAdmin()");
    const publishActionIndex = actions.indexOf("publishArticleAction");
    const publishValidation = actions.indexOf("publishArticleSchema.safeParse");

    assert.ok(publishActionIndex >= 0);
    assert.ok(firstAuthorization >= 0);
    assert.ok(
      actions.indexOf("await requireAdmin()", firstAuthorization + 1) <
        publishValidation,
      "publishArticleAction must authorize before validating",
    );
    assert.match(actions, /readPublishValues\(formData\)/);
    assert.match(actions, /await publishArticle\(/);
    assert.match(actions, /error instanceof ArticleAssetUnavailableError/);
    assert.match(actions, /result\.status === "conflict"/);
    assert.match(actions, /result\.status === "not_found"/);
    assert.match(
      actions,
      /revalidatePath\(`\/admin\/articles\/\$\{reference\.data\.articleId\}`\)/,
    );
  });

  it("renders the publish form with taxonomy, cover, and live status on the edit page", async () => {
    const page = await readFile(
      "app/(admin)/admin/articles/[articleId]/page.tsx",
      "utf8",
    );
    const form = await readFile(
      "app/(admin)/admin/articles/[articleId]/_components/article-publish-form.tsx",
      "utf8",
    );

    // 页面恢复 taxonomy 查询并下发给发布表单
    assert.match(page, /listCategories\(\)/);
    assert.match(page, /listTags\(\)/);
    assert.match(page, /<ArticlePublishForm/);
    assert.match(page, /categories=\{categories\}/);
    assert.match(page, /tags=\{tags\}/);
    assert.match(page, /publishedFromRevision: article\.publishedFromRevision/);
    // 发布状态文案
    assert.match(page, /有未发布修改/);
    assert.match(page, /线上为最新/);

    // 表单复用 taxonomy 字段，封面仅展示图片资产
    assert.match(form, /useActionState\(\s*publishArticleAction/);
    assert.match(form, /ArticleTaxonomyFields/);
    assert.match(form, /name="coverAssetId"/);
    assert.match(form, /asset\.mediaType\.startsWith\("image\/"\)/);
    assert.match(form, /更新线上版本/);
    assert.match(form, /发布中…/);
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
    const editForm = await readFile(
      "app/(admin)/admin/articles/[articleId]/_components/article-edit-form.tsx",
      "utf8",
    );

    assert.match(migration, /CREATE TABLE "article_asset"/);
    assert.match(migration, /ON DELETE cascade/);
    assert.match(migration, /DROP TABLE "media_asset"/);
    assert.match(migration, /DROP TABLE "article_media_reference"/);
    assert.match(schema, /onDelete: "cascade"/);
    assert.match(schema, /objectKey/);
    assert.match(repository, /\.articleId !== input\.id/);
    // #96/#104: DOM 操作解耦到 edit-form，panel 通过 callback 回调；
    // CodeMirror 编辑器通过 MarkdownEditorHandle.insertText 插入引用
    assert.match(editForm, /editor\.insertText/);
    assert.match(editForm, /MarkdownEditorHandle/);
    assert.match(panel, /onInsertReference/);
    assert.doesNotMatch(panel, /document\.getElementById/);
    assert.match(panel, /type="button"/);
    assert.match(panel, /cq-asset:\/\//);
  });
});

describe("Public article page slice", () => {
  it("exposes published-only DTO types that hide draft fields", async () => {
    const dto = await readFile("features/articles/article-dto.ts", "utf8");

    assert.match(dto, /export type PublishedArticleSummary = Readonly</);
    assert.match(dto, /export type PublishedArticleDetail = Readonly</);
    // 公开 DTO 仅包含线上槽位字段
    assert.match(dto, /title: string;[\s\S]*?content: string;[\s\S]*?summary: string;/);
    // 公开 DTO 不应包含草稿字段
    const summaryBlock = dto.match(
      /export type PublishedArticleSummary = Readonly<\{[\s\S]*?\}>;/,
    );
    const detailBlock = dto.match(
      /export type PublishedArticleDetail = Readonly<\{[\s\S]*?\}>;/,
    );
    assert.ok(summaryBlock, "PublishedArticleSummary type missing");
    assert.ok(detailBlock, "PublishedArticleDetail type missing");
    assert.doesNotMatch(summaryBlock[0], /draft/);
    assert.doesNotMatch(detailBlock[0], /draft/);
  });

  it("queries published articles without exposing draft columns", async () => {
    const repository = await readFile(
      "features/articles/server/drizzle-article-repository.ts",
      "utf8",
    );
    const service = await readFile(
      "features/articles/server/article-service.ts",
      "utf8",
    );

    // listPublishedArticles 仅查 publishedAt != null 的行
    assert.match(repository, /async listPublishedArticles\(\)/);
    assert.match(repository, /isNotNull\(article\.publishedAt\)/);
    assert.match(repository, /desc\(article\.publishedUpdatedAt\)/);
    // 左连接 category 以获取分类名
    assert.match(
      repository,
      /leftJoin\(category, eq\(article\.categoryId, category\.id\)\)/,
    );

    // getPublishedArticle 同样基于 publishedAt 过滤
    assert.match(repository, /async getPublishedArticle\(/);
    assert.match(
      repository,
      /and\(eq\(article\.id, id\), isNotNull\(article\.publishedAt\)\)/,
    );
    // 通过 articleTag join 读取标签
    assert.match(
      repository,
      /innerJoin\(tag, eq\(articleTag\.tagId, tag\.id\)\)/,
    );

    // Service 透传
    assert.match(service, /export function listPublishedArticles\(\)/);
    assert.match(service, /export function getPublishedArticle\(/);
    assert.match(service, /drizzleArticleRepository\.listPublishedArticles\(\)/);
    assert.match(
      service,
      /drizzleArticleRepository\.getPublishedArticle\(id\)/,
    );
  });

  it("renders the public list page without admin authorization", async () => {
    const page = await readFile("app/(site)/articles/page.tsx", "utf8");

    // 不调用 requireAdmin
    assert.doesNotMatch(page, /requireAdmin/);
    // 通过公开 service 读取已发布文章
    assert.match(page, /listPublishedArticles\(\)/);
    // 链接到详情页
    assert.match(page, /href=\{`\/articles\/\$\{article\.id\}`\}/);
    // 显示分类名
    assert.match(page, /article\.categoryName/);
    // 渲染摘要
    assert.match(page, /article\.summary/);
  });

  it("renders the public detail page with markdown and 404 fallback", async () => {
    const page = await readFile(
      "app/(site)/articles/[articleId]/page.tsx",
      "utf8",
    );

    // 不调用 requireAdmin
    assert.doesNotMatch(page, /requireAdmin/);
    // 通过 articleIdSchema 校验路径参数
    assert.match(page, /articleIdSchema\.safeParse\(articleId\)/);
    // 调用公开 service
    assert.match(page, /getPublishedArticle\(articleId\)/);
    // 未发布或不存在走 notFound()
    assert.match(page, /notFound\(\)/);
    // 复用 MarkdownRenderer 渲染线上 content
    assert.match(page, /MarkdownRenderer/);
    assert.match(page, /\{article\.content\}/);
    // generateMetadata 返回 title 与 summary
    assert.match(page, /generateMetadata/);
    assert.match(page, /title: article\.title/);
    assert.match(page, /description: article\.summary/);
    // 不暴露草稿字段
    assert.doesNotMatch(page, /draftTitle|draftContent|draftRevision/);
  });

  it("adds an Articles entry to the site header navigation", async () => {
    const header = await readFile(
      "app/(site)/_components/site-header.tsx",
      "utf8",
    );

    assert.match(header, /href="\/articles"/);
    assert.match(header, /Articles/);
  });
});
