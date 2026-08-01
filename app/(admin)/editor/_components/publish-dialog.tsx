"use client";

import { useActionState, useMemo, useRef, useState, useTransition } from "react";

import { ArticleTaxonomyFields } from "./article-taxonomy-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AcceptedAssetType, ArticleAsset } from "@/features/article-assets/article-asset-dto";
import { initialArticleAssetUploadFormState } from "@/features/article-assets/article-asset-form-state";
import {
  articleFieldLimits,
  type CategoryOption,
  type TagOption,
} from "@/features/articles/article-dto";
import { initialArticlePublishFormState } from "@/features/articles/article-edit-form-state";
import { cn } from "@/lib/utils";
import { publishArticleAction, uploadArticleAssetAction } from "../[articleId]/actions";

const textareaClassName =
  "mt-2 block min-h-32 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-(--motion-duration) ease-(--motion-easing) placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15 motion-reduce:transition-none";

const labelClassName = "block text-sm font-medium text-foreground";

function resolveAssetUrl(articleId: string, assetId: string) {
  return `/api/admin/articles/${articleId}/assets/${assetId}/content`;
}

export function PublishDialog({
  article,
  assets,
  categories,
  initialCategoryName,
  initialCoverAssetId,
  initialSummary,
  initialTagNames,
  onOpenChange,
  open,
  tags,
}: {
  article: {
    id: string;
    revision: number;
    publishedAt: string | null;
    publishedFromRevision: number | null;
  };
  assets: readonly ArticleAsset[];
  categories: readonly CategoryOption[];
  initialCategoryName: string;
  initialCoverAssetId: string | null;
  initialSummary: string;
  initialTagNames: readonly string[];
  onOpenChange: (open: boolean) => void;
  open: boolean;
  tags: readonly TagOption[];
}) {
  const initialPublishState = useMemo(
    () => ({
      ...initialArticlePublishFormState,
      values: {
        categoryName: initialCategoryName,
        coverAssetId: initialCoverAssetId ?? "",
        summary: initialSummary,
        tagNames: initialTagNames,
      },
    }),
    [initialCategoryName, initialCoverAssetId, initialSummary, initialTagNames],
  );
  const [state, action, pending] = useActionState(publishArticleAction, initialPublishState);

  const imageAssets = useMemo(
    () => assets.filter((a) => a.mediaType.startsWith("image/")),
    [assets],
  );

  const [extraAssets, setExtraAssets] = useState<ArticleAsset[]>([]);
  const [selectedCoverId, setSelectedCoverId] = useState<string>(
    initialCoverAssetId ?? "",
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadPending, startUploadTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 对话框打开时重置本地状态
  function handleOpenChange(next: boolean) {
    if (next) {
      setExtraAssets([]);
      setSelectedCoverId(initialCoverAssetId ?? "");
      setUploadError(null);
    }
    onOpenChange(next);
  }

  const allImageAssets = useMemo(() => {
    const extra = extraAssets.filter((a) => a.mediaType.startsWith("image/"));
    return [...imageAssets, ...extra];
  }, [imageAssets, extraAssets]);

  const isPublished = article.publishedAt !== null;
  const isPublishedRevisionCurrent =
    isPublished && article.publishedFromRevision === article.revision;
  const summaryErrorId = "publish-summary-error";

  function handleUploadClick() {
    const fileInput = fileInputRef.current;
    if (!fileInput || !fileInput.files?.[0]) {
      return;
    }

    const file = fileInput.files[0];
    setUploadError(null);

    const formData = new FormData();
    formData.append("articleId", article.id);
    formData.append("file", file);

    startUploadTransition(async () => {
      const result = await uploadArticleAssetAction(
        initialArticleAssetUploadFormState,
        formData,
      );

      if (result.uploadedId) {
        const isImage = file.type.startsWith("image/");
        const newAsset: ArticleAsset = {
          id: result.uploadedId,
          articleId: article.id,
          mediaType: file.type as AcceptedAssetType,
          originalFilename: file.name,
          byteSize: file.size,
          objectKey: "",
          sha256: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setExtraAssets((prev) => [...prev, newAsset]);
        if (isImage) {
          setSelectedCoverId(result.uploadedId);
        }
        fileInput.value = "";
      } else {
        setUploadError(result.formError);
      }
    });
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="max-h-[85vh] w-full max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isPublished ? "更新线上版本" : "发布文章"}</DialogTitle>
          <DialogDescription>
            发布后文章将对访客可见。填写分类、标签、封面图与摘要。
          </DialogDescription>
          <p className="text-xs text-muted-foreground" role="status">
            {isPublishedRevisionCurrent
              ? "线上版本已对应当前草稿修订。"
              : isPublished
                ? "当前草稿比线上版本更新。"
                : "这篇文章尚未公开。"}
          </p>
        </DialogHeader>

        <form action={action} className="grid gap-5">
          <input name="articleId" type="hidden" value={article.id} />
          <input
            name="expectedRevision"
            type="hidden"
            value={article.revision}
          />
          <input name="coverAssetId" type="hidden" value={selectedCoverId} />

          <div>
            <label className={labelClassName} htmlFor="publish-summary">
              摘要
              <span className="ml-2 font-normal text-muted-foreground">必填</span>
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
              <p className="mt-2 text-sm text-destructive" id={summaryErrorId}>
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
            <span className={labelClassName}>
              封面图
              <span className="ml-2 font-normal text-muted-foreground">必填</span>
            </span>

            {/* 上传区域（非 form 元素，避免与发布表单嵌套） */}
            <div className="mt-2 flex items-center gap-2">
              <input
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                className="block min-h-(--control-height) flex-1 rounded-md border border-input bg-background px-3 py-2 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:font-medium focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 focus-visible:outline-none"
                disabled={uploadPending}
                id="publish-cover-upload"
                ref={fileInputRef}
                type="file"
              />
              <Button
                disabled={uploadPending}
                onClick={handleUploadClick}
                size="sm"
                type="button"
                variant="outline"
              >
                {uploadPending ? "上传中…" : "上传"}
              </Button>
            </div>
            {uploadError ? (
              <p className="mt-1 text-xs text-destructive" role="alert">
                {uploadError}
              </p>
            ) : null}

            {/* 封面图选择器 */}
            {allImageAssets.length > 0 ? (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {allImageAssets.map((asset) => (
                  <button
                    className={cn(
                      "relative overflow-hidden rounded-md border-2 transition-colors",
                      selectedCoverId === asset.id
                        ? "border-brand-accent"
                        : "border-border hover:border-muted-foreground",
                    )}
                    key={asset.id}
                    onClick={() => setSelectedCoverId(asset.id)}
                    title={asset.originalFilename}
                    type="button"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={asset.originalFilename}
                      className="aspect-[16/9] w-full object-cover"
                      loading="lazy"
                      src={resolveAssetUrl(article.id, asset.id)}
                    />
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                还没有图片资源，请先上传一张图片作为封面。
              </p>
            )}
            {state.fieldErrors.coverAssetId?.length ? (
              <p className="mt-2 text-sm text-destructive">
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

          {state.status === "published" ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
              线上版本已更新。
            </p>
          ) : null}

          <DialogFooter>
            <Button
              disabled={pending || selectedCoverId.length === 0}
              title={selectedCoverId.length === 0 ? "请先选择封面图" : undefined}
              type="submit"
            >
              {pending ? "发布中…" : isPublished ? "更新线上版本" : "发布"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
