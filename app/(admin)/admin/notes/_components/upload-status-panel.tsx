"use client";

import {
  Ban,
  CheckCircle2,
  ChevronDown,
  Loader2,
  RotateCcw,
  X,
  XCircle,
} from "lucide-react";
import { useState } from "react";

import type { UploadTask, UploadTaskStatus } from "@/features/article-assets/upload-task-manager";
import { useUploadTasks, useUploadActions } from "@/features/article-assets/use-upload-tasks";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatBytes(value: number) {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(2)} MiB`;
  }
  return `${(value / 1024).toFixed(1)} KiB`;
}

const statusIcon: Record<
  UploadTaskStatus,
  { icon: typeof Loader2; className: string; spin: boolean }
> = {
  pending: { icon: Loader2, className: "text-muted-foreground", spin: false },
  uploading: { icon: Loader2, className: "text-foreground", spin: true },
  retrying: { icon: RotateCcw, className: "text-muted-foreground", spin: false },
  success: { icon: CheckCircle2, className: "text-brand-accent", spin: false },
  error: { icon: XCircle, className: "text-destructive", spin: false },
  canceled: { icon: Ban, className: "text-muted-foreground", spin: false },
};

function statusLabel(task: UploadTask): string {
  switch (task.status) {
    case "pending":
      return "等待上传";
    case "uploading":
      return `上传中 ${task.progress}%`;
    case "retrying":
      return `等待重试（第 ${task.attempt} 次失败）`;
    case "success":
      return "已上传";
    case "error":
      return task.error ?? "上传失败";
    case "canceled":
      return "已取消";
  }
}

function TaskRow({
  task,
  onRetry,
  onCancel,
  onRemove,
}: {
  task: UploadTask;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const config = statusIcon[task.status];
  const Icon = config.icon;
  const isActive =
    task.status === "uploading" ||
    task.status === "pending" ||
    task.status === "retrying";
  const isTerminal =
    task.status === "success" ||
    task.status === "error" ||
    task.status === "canceled";

  return (
    <div className="border-b border-border px-3 py-2 last:border-b-0">
      <div className="flex items-start gap-2">
        <Icon
          aria-hidden="true"
          className={cn(
            "mt-0.5 size-4 shrink-0",
            config.className,
            config.spin && "animate-spin",
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground">
            {task.filename}
          </p>
          <p className="text-[0.6875rem] text-muted-foreground">
            {formatBytes(task.byteSize)} · {statusLabel(task)}
          </p>
          {task.status === "uploading" ? (
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand-accent transition-[width] duration-150"
                style={{ width: `${task.progress}%` }}
              />
            </div>
          ) : null}
          {task.status === "error" && task.error ? (
            <p className="mt-0.5 text-[0.6875rem] text-destructive">
              {task.error}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {isActive ? (
            <Button
              aria-label="取消上传"
              onClick={() => onCancel(task.id)}
              size="icon-xs"
              variant="ghost"
            >
              <X aria-hidden="true" />
            </Button>
          ) : null}
          {task.status === "error" || task.status === "canceled" ? (
            <Button
              aria-label="重试上传"
              onClick={() => onRetry(task.id)}
              size="icon-xs"
              variant="ghost"
            >
              <RotateCcw aria-hidden="true" />
            </Button>
          ) : null}
          {isTerminal ? (
            <Button
              aria-label="移除"
              onClick={() => onRemove(task.id)}
              size="icon-xs"
              variant="ghost"
            >
              <X aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function UploadStatusPanel({
  articleId,
}: {
  articleId: string;
}) {
  const allTasks = useUploadTasks();
  const { retry, cancel, remove, clearCompleted } = useUploadActions();
  const [isExpanded, setIsExpanded] = useState(true);

  const tasks = allTasks.filter((t) => t.articleId === articleId);

  if (tasks.length === 0) {
    return null;
  }

  const activeCount = tasks.filter(
    (t) =>
      t.status === "uploading" ||
      t.status === "pending" ||
      t.status === "retrying",
  ).length;
  const failedCount = tasks.filter((t) => t.status === "error").length;
  const hasTerminal = tasks.some(
    (t) =>
      t.status === "success" ||
      t.status === "error" ||
      t.status === "canceled",
  );

  const summary = (() => {
    if (activeCount > 0) {
      return `上传中 ${activeCount} 个文件`;
    }
    if (failedCount > 0) {
      return `${failedCount} 个文件上传失败`;
    }
    return `${tasks.length} 个文件已上传`;
  })();

  return (
    <div
      aria-live="polite"
      className="pointer-events-auto absolute bottom-3 right-3 z-20 w-80 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          {activeCount > 0 ? (
            <Loader2
              aria-hidden="true"
              className="size-4 animate-spin text-muted-foreground"
            />
          ) : failedCount > 0 ? (
            <XCircle aria-hidden="true" className="size-4 text-destructive" />
          ) : (
            <CheckCircle2
              aria-hidden="true"
              className="size-4 text-brand-accent"
            />
          )}
          <span className="text-sm font-medium text-foreground">
            {summary}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {hasTerminal ? (
            <Button
              onClick={clearCompleted}
              size="xs"
              variant="ghost"
            >
              清除
            </Button>
          ) : null}
          <Button
            aria-label={isExpanded ? "收起" : "展开"}
            onClick={() => setIsExpanded((prev) => !prev)}
            size="icon-xs"
            variant="ghost"
          >
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "transition-transform",
                isExpanded ? "" : "rotate-180",
              )}
            />
          </Button>
        </div>
      </div>
      {isExpanded ? (
        <div className="max-h-64 overflow-y-auto">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              onCancel={cancel}
              onRemove={remove}
              onRetry={retry}
              task={task}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
