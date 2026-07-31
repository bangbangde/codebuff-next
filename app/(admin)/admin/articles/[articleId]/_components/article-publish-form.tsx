"use client";

import { useActionState } from "react";

import { ArticleTaxonomyFields } from "@/app/(admin)/admin/articles/_components/article-taxonomy-fields";
import { Button } from "@/components/ui/button";
import type { ArticleAsset } from "@/features/article-assets/article-asset-dto";
import {
  articleFieldLimits,
  type CategoryOption,
  type TagOption,
} from "@/features/articles/article-dto";
import { initialArticlePublishFormState } from "@/features/articles/article-edit-form-state";
import { cn } from "@/lib/utils";
import { publishArticleAction } from "../actions";

const labelClassName = "block text-sm font-medium text-foreground";

const inputClassName =
  "mt-2 block min-h-(--control-height) w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-(--motion-duration) ease-(--motion-easing) placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15 motion-reduce:transition-none";

const textareaClassName = cn(
  inputClassName,
  "min-h-32 resize-y py-2 leading-6",
);

export function ArticlePublishForm({
  article,
  assets,
  categories,
  tags,
}: {
  article: {
    id: string;
    draftRevision: number;
    publishedAt: string | null;
    publishedFromRevision: number | null;
  };
  assets: readonly ArticleAsset[];
  categories: readonly CategoryOption[];
  tags: readonly TagOption[];
}) {
  const [state, action, pending] = useActionState(
    publishArticleAction,
    initialArticlePublishFormState,
  );

  const imageAssets = assets.filter((asset) =>
    asset.mediaType.startsWith("image/"),
  );

  const isPublished = article.publishedAt !== null;
  const isLiveLatest =
    isPublished && article.publishedFromRevision === article.draftRevision;

  const publishStatusLabel = !isPublished
    ? "未发布"
    : isLiveLatest
      ? "已发布 · 线上为最新"
      : "已发布 · 有未发布修改";

  const summaryErrorId = "publish-summary-error";
  const coverErrorId = "publish-cover-error";

  return (
    <div className="grid gap-6 rounded-lg border border-border bg-card p-5 shadow-xs sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold" id="publish-article-title">
            发布到线上
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            发布会将当前草稿复制为线上版本，并写入分类、标签、封面图与摘要。
            再次发布会整体替换线上版本。
          </p>
        </div>
        <p
          className="rounded-md border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground"
          role="status"
        >
          {publishStatusLabel}
        </p>
      </div>

      <form action={action} className="grid gap-6">
        <input name="articleId" type="hidden" value={article.id} />
        <input
          name="expectedRevision"
          type="hidden"
          value={article.draftRevision}
        />

        <div>
          <label className={labelClassName} htmlFor="publish-summary">
            摘要
          </label>
          <textarea
            aria-describedby={
              state.fieldErrors.summary?.length ? summaryErrorId : undefined
            }
            aria-invalid={Boolean(state.fieldErrors.summary?.length)}
            className={textareaClassName}
            defaultValue={state.values.summary}
            id="publish-summary"
            maxLength={articleFieldLimits.summary}
            name="summary"
            placeholder="一句话概述这篇文章，用于列表与分享卡片。"
          />
          {state.fieldErrors.summary?.length ? (
            <p
              className="mt-2 text-sm text-destructive"
              id={summaryErrorId}
            >
              {state.fieldErrors.summary[0]}
            </p>
          ) : null}
        </div>

        <ArticleTaxonomyFields
          categories={categories}
          fieldErrors={{
            categoryName: state.fieldErrors.categoryName,
            tagNames: state.fieldErrors.tagNames,
          }}
          initialCategoryName={state.values.categoryName}
          initialTagNames={state.values.tagNames}
          tags={tags}
        />

        <div>
          <label className={labelClassName} htmlFor="publish-cover">
            封面图
          </label>
          {imageAssets.length > 0 ? (
            <select
              aria-describedby={
                state.fieldErrors.coverAssetId?.length ? coverErrorId : undefined
              }
              aria-invalid={Boolean(state.fieldErrors.coverAssetId?.length)}
              className={inputClassName}
              defaultValue={state.values.coverAssetId}
              id="publish-cover"
              name="coverAssetId"
            >
              <option value="">请选择封面图</option>
              {imageAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.originalFilename}
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              本文还没有图片资产。请先在上方资产区上传图片，刷新后可选择为封面。
            </p>
          )}
          {state.fieldErrors.coverAssetId?.length ? (
            <p className="mt-2 text-sm text-destructive" id={coverErrorId}>
              {state.fieldErrors.coverAssetId[0]}
            </p>
          ) : null}
        </div>

        {state.formError ? (
          <p
            aria-live="polite"
            className="text-sm text-destructive"
            role="alert"
          >
            {state.formError}
          </p>
        ) : null}

        {state.conflictRevision !== null ? (
          <a
            className="inline-flex min-h-11 items-center text-sm font-medium text-foreground underline underline-offset-4"
            href={`/admin/articles/${article.id}`}
          >
            重新载入数据库版本（草稿修订 {state.conflictRevision}）
          </a>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={pending} type="submit">
            {pending
              ? "发布中…"
              : isPublished
                ? "更新线上版本"
                : "发布"}
          </Button>
          {isPublished ? (
            <p className="text-xs text-muted-foreground">
              将用当前草稿与本次发布信息整体替换线上版本。
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
}
