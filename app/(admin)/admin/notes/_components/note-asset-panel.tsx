"use client";

import { useActionState, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ArticleAsset } from "@/features/article-assets/article-asset-dto";
import {
  initialArticleAssetDeleteFormState,
  initialArticleAssetUploadFormState,
} from "@/features/article-assets/article-asset-form-state";
import { formatCanonicalAssetReference } from "@/features/articles/article-asset-reference";
import { cn } from "@/lib/utils";
import {
  deleteArticleAssetAction,
  uploadArticleAssetAction,
} from "../[noteId]/actions";

function formatBytes(value: number) {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(2)} MiB`;
  }

  return `${(value / 1024).toFixed(1)} KiB`;
}

export function NoteAssetPanel({
  articleId,
  assets,
  onInsertReference,
}: {
  articleId: string;
  assets: readonly ArticleAsset[];
  onInsertReference: (reference: string) => boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [insertStatus, setInsertStatus] = useState<string | null>(null);
  const [uploadState, uploadAction, uploadPending] = useActionState(
    uploadArticleAssetAction,
    initialArticleAssetUploadFormState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteArticleAssetAction,
    initialArticleAssetDeleteFormState,
  );

  function insertReference(asset: ArticleAsset) {
    const reference = formatCanonicalAssetReference(asset);
    const success = onInsertReference(reference);

    setInsertStatus(
      success
        ? `已插入 ${asset.originalFilename} 的稳定引用。`
        : "无法插入资产引用，请重新载入页面后再试。",
    );
  }

  function handleActionSubmit() {
    setInsertStatus(null);
  }

  return (
    <div className="mt-2 grid gap-5">
      <div>
        <p className="text-sm font-medium text-foreground">笔记资产</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          上传到本文的图片或附件会插入稳定的{" "}
          <code className="font-mono">cq-asset://</code>{" "}
          引用；资产随笔记删除而回收。当前阶段不提供预览。
        </p>
      </div>

      <form
        action={uploadAction}
        className="grid gap-3 rounded-lg border border-border bg-muted/45 p-4"
        onSubmit={handleActionSubmit}
      >
        <input name="articleId" type="hidden" value={articleId} />
        <div>
          <label
            className="block text-xs font-medium"
            htmlFor="article-asset-file"
          >
            上传资产
          </label>
          <input
            accept=".jpg,.jpeg,.png,.webp,.gif,.avif,.pdf,image/jpeg,image/png,image/webp,image/gif,image/avif,application/pdf"
            className="mt-2 block min-h-(--control-height) w-full rounded-md border border-input bg-background px-3 py-2 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:font-medium focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 focus-visible:outline-none"
            disabled={uploadPending}
            id="article-asset-file"
            name="file"
            ref={fileInputRef}
            required
            type="file"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            disabled={uploadPending}
            size="sm"
            type="submit"
            variant="outline"
          >
            {uploadPending ? "上传中…" : "上传到本文"}
          </Button>
          <p
            aria-live="polite"
            className={cn(
              "text-xs",
              uploadState.formError
                ? "text-destructive"
                : "text-muted-foreground",
            )}
            role={uploadState.formError ? "alert" : "status"}
          >
            {uploadState.formError ??
              (uploadState.uploadedId ? "资产已上传到本文。" : null)}
          </p>
        </div>
      </form>

      {assets.length > 0 ? (
        <ul className="grid gap-2 border-t border-border pt-4">
          {assets.map((asset) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2"
              key={asset.id}
            >
              <div className="min-w-0">
                <p className="break-all text-xs font-medium">
                  {asset.originalFilename}
                </p>
                <p className="mt-0.5 font-mono text-[0.6875rem] text-muted-foreground">
                  {asset.mediaType} · {formatBytes(asset.byteSize)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => insertReference(asset)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  插入引用
                </Button>
                <form action={deleteAction} onSubmit={handleActionSubmit}>
                  <input name="articleId" type="hidden" value={articleId} />
                  <input name="assetId" type="hidden" value={asset.id} />
                  <Button
                    disabled={deletePending}
                    size="sm"
                    type="submit"
                    variant="destructive"
                  >
                    删除
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-xs text-muted-foreground">
          本文还没有资产。上传后即可插入引用。
        </p>
      )}

      <p
        aria-live="polite"
        className={cn(
          "min-h-4 text-xs",
          deleteState.formError ? "text-destructive" : "text-muted-foreground",
        )}
        role={deleteState.formError ? "alert" : "status"}
      >
        {deleteState.formError ?? insertStatus}
      </p>
    </div>
  );
}
