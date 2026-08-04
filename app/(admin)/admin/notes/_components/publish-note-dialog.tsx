"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { UploadIcon } from "lucide-react";

import { NoteTaxonomyFields } from "./note-taxonomy-fields";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ArticleAsset } from "@/features/article-assets/article-asset-dto";
import {
  validateAssetFileClientSide,
} from "@/features/article-assets/upload-task-manager";
import {
  articleFieldLimits,
  type CategoryOption,
  type TagOption,
} from "@/features/articles/article-dto";
import { initialArticlePublishFormState } from "@/features/articles/article-edit-form-state";
import { extractSummaryFromMarkdown } from "@/features/articles/article-summary";
import { cn } from "@/lib/utils";
import { publishArticleAction } from "../[noteId]/actions";

const textareaClassName =
  "mt-2 block min-h-32 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-(--motion-duration) ease-(--motion-easing) placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15 motion-reduce:transition-none";

const labelClassName = "block text-sm font-medium text-foreground";

function resolveAssetUrl(articleId: string, assetId: string) {
  return `/api/admin/notes/${articleId}/assets/${assetId}/content`;
}

export function PublishNoteDialog({
  article,
  assets,
  categories,
  draftBody,
  initialCategoryName,
  initialCoverAssetId,
  initialSummary,
  initialTagNames,
  onConflict,
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
  draftBody: string;
  initialCategoryName: string;
  initialCoverAssetId: string | null;
  initialSummary: string;
  initialTagNames: readonly string[];
  /**
   * 发布时检测到正文版本冲突（草稿 revision 不匹配）时调用。
   * 父组件负责关闭发布对话框并打开正文冲突合并对话框；
   * 发布元数据（封面/分类/标签/摘要）本身不做冲突合并，
   * 用户解决正文冲突后可再次打开发布对话框发布。
   */
  onConflict: (conflictRevision: number | null) => void;
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
  const [summary, setSummary] = useState<string>(initialSummary);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 记录已通知父组件的 conflictRevision，避免 useActionState 的 state
  // 在对话框重新打开时残留 conflict 状态导致重复触发 onConflict。
  const lastNotifiedConflictRef = useRef<number | null | undefined>(undefined);

  // 检测到正文版本冲突时交由父组件处理：父组件会关闭发布对话框并打开
  // 正文冲突合并对话框。发布元数据本身不做冲突合并。
  useEffect(() => {
    if (
      state.status === "conflict" &&
      lastNotifiedConflictRef.current !== state.conflictRevision
    ) {
      lastNotifiedConflictRef.current = state.conflictRevision;
      onConflict(state.conflictRevision);
    }
  }, [state.status, state.conflictRevision, onConflict]);

  // 对话框打开时重置本地状态
  function handleOpenChange(next: boolean) {
    if (next) {
      setExtraAssets([]);
      setSelectedCoverId(initialCoverAssetId ?? "");
      setSummary(initialSummary);
      setUploadError(null);
      setUploadProgress(null);
      // 重置冲突通知标记，允许下次冲突再次触发 onConflict
      lastNotifiedConflictRef.current = undefined;
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
  const isUploading = uploadProgress !== null;

  function handleAutoExtractSummary() {
    const extracted = extractSummaryFromMarkdown(draftBody);
    if (extracted) {
      setSummary(extracted);
    }
  }

  async function uploadCoverFile(file: File) {
    // 复用编辑器上传路径的客户端预检：类型/大小/扩展名/MIME 一致
    const validation = validateAssetFileClientSide(file);
    if (!validation.ok) {
      setUploadError(validation.error);
      return;
    }
    if (!validation.mediaType.startsWith("image/")) {
      setUploadError("封面图必须是图片文件。");
      return;
    }

    setUploadError(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("articleId", article.id);
    formData.append("file", file);

    try {
      const asset = await new Promise<ArticleAsset>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `/api/admin/notes/${article.id}/assets`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              // 上传请求结束、响应阶段进度直接标 100，避免视觉停在 99%
              setUploadProgress(100);
              const data = JSON.parse(xhr.responseText) as
                | { asset: ArticleAsset }
                | { error: string };
              if ("asset" in data) {
                resolve(data.asset);
              } else {
                reject(new Error("error" in data ? data.error : "上传失败，请稍后重试。"));
              }
            } catch {
              reject(new Error("解析上传响应失败。"));
            }
          } else {
            let message = "上传失败，请稍后重试。";
            try {
              const data = JSON.parse(xhr.responseText) as { error?: string };
              if (data.error) {
                message = data.error;
              }
            } catch {
              // 非 JSON 响应使用默认消息
            }
            reject(new Error(message));
          }
        };

        xhr.onerror = () => reject(new Error("网络错误，上传失败。"));
        xhr.send(formData);
      });

      setExtraAssets((prev) => [...prev, asset]);
      setSelectedCoverId(asset.id);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "上传失败，请稍后重试。",
      );
    } finally {
      setUploadProgress(null);
    }
  }

  function handleFileInputChange() {
    const fileInput = fileInputRef.current;
    if (!fileInput || !fileInput.files?.[0]) {
      return;
    }
    void uploadCoverFile(fileInput.files[0]);
    fileInput.value = "";
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setIsDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      void uploadCoverFile(file);
    }
  }

  return (
    <Sheet onOpenChange={handleOpenChange} open={open}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{isPublished ? "更新线上版本" : "发布笔记"}</SheetTitle>
          <SheetDescription>
            发布后笔记将对访客可见。填写分类、标签、封面图与摘要。
          </SheetDescription>
          <p className="text-xs text-muted-foreground" role="status">
            {isPublishedRevisionCurrent
              ? "线上版本已对应当前草稿修订。"
              : isPublished
                ? "当前草稿比线上版本更新。"
                : "这篇笔记尚未公开。"}
          </p>
        </SheetHeader>

        <form action={action} className="grid flex-1 gap-5 overflow-y-auto">
          <input name="articleId" type="hidden" value={article.id} />
          <input
            name="expectedRevision"
            type="hidden"
            value={article.revision}
          />
          <input name="coverAssetId" type="hidden" value={selectedCoverId} />

          <div>
            <div className="flex items-center justify-between">
              <label className={labelClassName} htmlFor="publish-summary">
                摘要
                <span className="ml-2 font-normal text-muted-foreground">必填</span>
              </label>
              <Button
                onClick={handleAutoExtractSummary}
                size="xs"
                type="button"
                variant="ghost"
              >
                自动提取
              </Button>
            </div>
            <textarea
              aria-describedby={
                state.fieldErrors.summary?.length ? summaryErrorId : undefined
              }
              aria-invalid={Boolean(state.fieldErrors.summary?.length)}
              className={textareaClassName}
              id="publish-summary"
              maxLength={articleFieldLimits.summary}
              name="summary"
              onChange={(event) => setSummary(event.target.value)}
              placeholder="一句话概述这篇笔记，用于列表与分享卡片。"
              value={summary}
            />
            {state.fieldErrors.summary?.length ? (
              <p className="mt-2 text-sm text-destructive" id={summaryErrorId}>
                {state.fieldErrors.summary[0]}
              </p>
            ) : null}
          </div>

          <NoteTaxonomyFields
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

            {/* 拖拽上传区域 */}
            <div
              className={cn(
                "mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 transition-colors",
                isDragOver
                  ? "border-brand-accent bg-brand-accent-soft"
                  : "border-border hover:border-muted-foreground",
                isUploading && "pointer-events-none opacity-60",
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              role="button"
              tabIndex={0}
            >
              <UploadIcon aria-hidden="true" className="size-6 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {isUploading
                  ? `上传中… ${uploadProgress}%`
                  : "点击或拖拽图片到此处上传"}
              </p>
              <input
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                className="hidden"
                disabled={isUploading}
                onChange={handleFileInputChange}
                ref={fileInputRef}
                type="file"
              />
            </div>

            {/* 上传进度条 */}
            {isUploading ? (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            ) : null}

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

          <SheetFooter>
            <Button
              disabled={pending || selectedCoverId.length === 0 || isUploading}
              title={selectedCoverId.length === 0 ? "请先选择封面图" : undefined}
              type="submit"
            >
              {pending ? "发布中…" : isPublished ? "更新线上版本" : "发布"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
