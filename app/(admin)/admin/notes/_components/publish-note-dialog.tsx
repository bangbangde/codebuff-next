"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { UploadIcon } from "lucide-react";

import { NoteTaxonomyFields } from "./note-taxonomy-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
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
import { extractSummaryFromMarkdown } from "@/features/articles/article-summary";
import { cn } from "@/lib/utils";
import { publishArticleAction } from "../[noteId]/actions";
import type { ArticlePublishFormState } from "@/features/articles/article-edit-form-state";

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
  onFinalSave,
  onOpenChange,
  onPublishSuccess,
  open,
  tags,
}: {
  article: {
    id: string;
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
  onFinalSave: () => Promise<boolean>;
  onOpenChange: (open: boolean) => void;
  onPublishSuccess: () => void;
  open: boolean;
  tags: readonly TagOption[];
}) {
  const imageAssets = useMemo(
    () => assets.filter((a) => a.mediaType.startsWith("image/")),
    [assets],
  );

  const [extraAssets, setExtraAssets] = useState<ArticleAsset[]>([]);
  const [selectedCoverId, setSelectedCoverId] = useState<string>(
    initialCoverAssetId ?? "",
  );
  const [summary, setSummary] = useState<string>(initialSummary);
  const [selectedCategoryName, setSelectedCategoryName] =
    useState<string>(initialCategoryName);
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([
    ...initialTagNames,
  ]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  // 发布全屏 loading：覆盖"最终保存 + 发布"全过程。
  // 发布进行中保持为 true，消息从"正在保存草稿并发布…"切换为"发布成功，正在跳转…"。
  const [publishingOverlay, setPublishingOverlay] = useState<
    | { open: false }
    | { open: true; message: string }
  >({ open: false });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sheet 打开时重置本地状态
  function handleOpenChange(next: boolean) {
    // 发布进行中（全屏 loading）：不允许 Sheet 关闭。
    // 即使 Sheet somehow 关闭，全屏 loading Dialog 仍独立存在，阻止其他操作。
    if (publishingOverlay.open) return;
    if (next) {
      setExtraAssets([]);
      setSelectedCoverId(initialCoverAssetId ?? "");
      setSummary(initialSummary);
      setSelectedCategoryName(initialCategoryName);
      setSelectedTagNames([...initialTagNames]);
      setUploadError(null);
      setUploadProgress(null);
      setPublishError(null);
    }
    onOpenChange(next);
  }

  const allImageAssets = useMemo(() => {
    const extra = extraAssets.filter((a) => a.mediaType.startsWith("image/"));
    return [...imageAssets, ...extra];
  }, [imageAssets, extraAssets]);

  const isPublished = article.publishedAt !== null;
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

  // ─── 发布流程 ────────────────────────────────────────────────
  //
  // 点击发布 → 全屏 loading Dialog（spinner + 提示，阻止其他操作）
  // → 发起最终保存（最高 sequence） → 等待保存成功 →
  // 调用发布接口 → 发布成功：更新 Dialog 消息并跳转
  // → 失败：关闭 Dialog，显示错误消息，留在 Sheet 让用户重试。
  //
  // 保存失败时不得继续发布或跳转。

  async function handlePublish() {
    setPublishError(null);
    setIsPublishing(true);
    // 在用户点击"发布"的瞬间立刻打开全屏 loading，阻断所有其他编辑操作。
    setPublishingOverlay({
      open: true,
      message: "正在保存草稿并发布…",
    });

    // 失败路径关闭 Dialog，回到 Sheet 展示错误让用户重试；
    // 成功路径同样关闭 Dialog（与父级跳转 overlay 衔接，避免双重遮罩。
    let shouldCloseOverlay = true;

    try {
      // 1. 执行最终保存（最高 sequence）
      const saved = await onFinalSave();
      if (!saved) {
        setPublishError("保存草稿失败，请检查网络后重试。");
        return;
      }

      // 2. 构建 FormData 并调用发布接口
      const formData = new FormData();
      formData.append("articleId", article.id);
      formData.append("coverAssetId", selectedCoverId);
      formData.append("summary", summary);
      formData.append("categoryName", selectedCategoryName);
      for (const tagName of selectedTagNames) {
        formData.append("tagNames", tagName);
      }

      const initialState: ArticlePublishFormState = {
        fieldErrors: {},
        formError: null,
        status: "idle",
        values: {
          categoryName: selectedCategoryName,
          coverAssetId: selectedCoverId,
          summary,
          tagNames: selectedTagNames,
        },
      };

      const result = await publishArticleAction(initialState, formData);

      if (result.status === "published") {
        // 3. 发布成功：先关发布 Dialog，父级跳转 overlay 接管跳转反馈。
        // 两个 setState 与 onPublishSuccess 内的 setState 是同一事件循环，
        // React batch 更新后跳转 overlay 与 Dialog 关闭 无缝衔接无空白。
        shouldCloseOverlay = true;
        onPublishSuccess();
        return;
      }

      // 发布失败
      setPublishError(result.formError ?? "发布未完成，请稍后重试。");
    } catch {
      setPublishError("发布请求未完成，请检查网络后重试。");
    } finally {
      if (shouldCloseOverlay) {
        setPublishingOverlay({ open: false });
      }
      setIsPublishing(false);
    }
  }

  return (
    <Fragment>
    <Sheet onOpenChange={handleOpenChange} open={open}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{isPublished ? "更新线上版本" : "发布笔记"}</SheetTitle>
          <SheetDescription>
            发布后笔记将对访客可见。填写分类、标签、封面图与摘要。
          </SheetDescription>
          <p className="text-xs text-muted-foreground" role="status">
            {isPublished
              ? "当前草稿比线上版本更新。"
              : "这篇笔记尚未公开。"}
          </p>
        </SheetHeader>

        <div className="grid flex-1 gap-5 overflow-y-auto">
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
              aria-describedby={summaryErrorId}
              className={textareaClassName}
              id="publish-summary"
              maxLength={articleFieldLimits.summary}
              name="summary"
              onChange={(event) => setSummary(event.target.value)}
              placeholder="一句话概述这篇笔记，用于列表与分享卡片。"
              value={summary}
            />
          </div>

          <NoteTaxonomyFields
            categories={categories}
            fieldErrors={{}}
            initialCategoryName={initialCategoryName}
            initialTagNames={initialTagNames}
            onCategoryChange={setSelectedCategoryName}
            onTagsChange={setSelectedTagNames}
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
          </div>

          {publishError ? (
            <p
              aria-live="polite"
              className="text-sm text-destructive"
              role="alert"
            >
              {publishError}
            </p>
          ) : null}
        </div>

        <SheetFooter>
          <Button
            disabled={
              isPublishing ||
              selectedCoverId.length === 0 ||
              isUploading
            }
            onClick={handlePublish}
            title={selectedCoverId.length === 0 ? "请先选择封面图" : undefined}
            type="button"
          >
            {isPublishing
              ? "发布中…"
              : isPublished
                ? "更新线上版本"
                : "发布"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>

    {/* ─── 发布全屏 loading（使用 shadcn Dialog 承载 overlay）──────── */}
    <Dialog
      onOpenChange={(nextOpen) => {
        // 禁止用户通过 Esc/点击遮罩关闭：发布是不可中断的原子流程。
        // 唯一关闭路径：handlePublish 失败分支，或成功后跳转卸载组件。
        if (!nextOpen && publishingOverlay.open) return;
      }}
      open={publishingOverlay.open}
    >
      <DialogContent
        className="!max-w-xs border-none bg-transparent p-0 shadow-none ring-0"
        showCloseButton={false}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <Spinner aria-hidden="true" className="!size-8 text-foreground" />
          <DialogTitle className="sr-only">
            {publishingOverlay.open ? publishingOverlay.message : "发布中"}
          </DialogTitle>
          <DialogDescription
            aria-live="assertive"
            className="!text-sm !font-medium !text-foreground"
            role="status"
          >
            {publishingOverlay.open ? publishingOverlay.message : ""}
          </DialogDescription>
        </div>
      </DialogContent>
    </Dialog>
    </Fragment>
  );
}
