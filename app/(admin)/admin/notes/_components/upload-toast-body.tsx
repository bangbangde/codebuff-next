"use client";

import { FileIcon, ImageIcon, RotateCcw, Trash2, X } from "lucide-react";

import { useUploadActions, useUploadTask } from "@/features/article-assets/use-upload-tasks";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";

function formatBytes(value: number) {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(2)} MiB`;
  }
  return `${(value / 1024).toFixed(1)} KiB`;
}

function getMediaTypeLabel(mediaType: string): string {
  if (mediaType.startsWith("image/")) {
    return mediaType.replace("image/", "").toUpperCase();
  }
  if (mediaType === "application/pdf") return "PDF";
  return mediaType;
}

/**
 * Toast 内部渲染的附件卡片。订阅单任务实时状态，进度更新由组件内部
 * re-render 完成，不触发 toast 重排。
 */
export function UploadToastBody({ taskId }: { taskId: string }) {
  const task = useUploadTask(taskId);
  const { cancel, retry, discard } = useUploadActions();

  if (!task) return null;

  const isActive =
    task.status === "uploading" ||
    task.status === "pending" ||
    task.status === "retrying";
  const isError = task.status === "error";

  const attachmentState = (() => {
    switch (task.status) {
      case "pending":
        return "idle" as const;
      case "uploading":
      case "retrying":
        return "uploading" as const;
      case "success":
        return "done" as const;
      case "error":
        return "error" as const;
      case "canceled":
        return "idle" as const;
    }
  })();

  const description = (() => {
    switch (task.status) {
      case "pending":
        return `${getMediaTypeLabel(task.mediaType)} · ${formatBytes(task.byteSize)}`;
      case "uploading":
        return `${getMediaTypeLabel(task.mediaType)} · ${formatBytes(task.byteSize)} · 上传中 ${task.progress}%`;
      case "retrying":
        return `等待重试（第 ${task.attempt} 次失败）`;
      case "success":
        return `${getMediaTypeLabel(task.mediaType)} · ${formatBytes(task.byteSize)}`;
      case "error":
        return task.error ?? "上传失败";
      case "canceled":
        return "已取消";
    }
  })();

  const isImage = task.mediaType.startsWith("image/");

  function handleCancel() {
    cancel(taskId);
  }

  function handleRetry() {
    retry(taskId);
  }

  function handleDiscard() {
    // discard 触发任务从 store 移除，bridge 的 onRemove 会关闭 toast；
    // note-body-editor 的 effect 检测到 error 任务消失后清理占位符。
    discard(taskId);
  }

  return (
    <Attachment
      state={attachmentState}
      size="sm"
      className="w-full border-0 bg-transparent p-0"
    >
      <AttachmentMedia>
        {isImage ? <ImageIcon /> : <FileIcon />}
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{task.filename}</AttachmentTitle>
        <AttachmentDescription>{description}</AttachmentDescription>
        {task.status === "uploading" ? (
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand-accent transition-[width] duration-150"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        ) : null}
      </AttachmentContent>
      <AttachmentActions>
        {isActive ? (
          <AttachmentAction aria-label="取消上传" onClick={handleCancel}>
            <X />
          </AttachmentAction>
        ) : null}
        {isError ? (
          <>
            <AttachmentAction aria-label="重试上传" onClick={handleRetry}>
              <RotateCcw />
            </AttachmentAction>
            <AttachmentAction aria-label="丢弃并移除占位符" onClick={handleDiscard}>
              <Trash2 />
            </AttachmentAction>
          </>
        ) : null}
      </AttachmentActions>
    </Attachment>
  );
}
