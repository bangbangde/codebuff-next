"use client";

import { Edit3, Eye, Columns2 } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";

import type { AcceptedAssetType } from "@/features/article-assets/article-asset-dto";
import { initialArticleAssetUploadFormState } from "@/features/article-assets/article-asset-form-state";
import { formatCanonicalAssetReference } from "@/features/articles/article-asset-reference";
import { MarkdownRenderer } from "@/lib/content/markdown-renderer";
import { cn } from "@/lib/utils";
import {
  MarkdownEditor,
  type MarkdownEditorHandle,
} from "./markdown-editor";
import { uploadArticleAssetAction } from "../[articleId]/actions";

type EditorMode = "edit" | "split" | "preview";

const EDITOR_MODE_STORAGE_KEY = "article-editor-mode";
const DEFAULT_EDITOR_MODE: EditorMode = "split";
const DESKTOP_BREAKPOINT = 768;
const DESKTOP_MEDIA_QUERY = `(min-width: ${DESKTOP_BREAKPOINT}px)`;

// 模块级订阅商店：useSyncExternalStore 在 SSR 与首次客户端 hydration 时使用
// getServerSnapshot（返回默认值），hydration 完成后再切换到 getSnapshot 读取
// localStorage，从而避免 SSR hydration mismatch，也避免在 effect 中调用 setState。
const editorModeListeners = new Set<() => void>();

function subscribeEditorMode(callback: () => void) {
  editorModeListeners.add(callback);
  return () => {
    editorModeListeners.delete(callback);
  };
}

function getEditorModeSnapshot(): EditorMode {
  if (typeof window === "undefined") {
    return DEFAULT_EDITOR_MODE;
  }
  const stored = localStorage.getItem(EDITOR_MODE_STORAGE_KEY);
  return stored === "edit" || stored === "split" || stored === "preview"
    ? stored
    : DEFAULT_EDITOR_MODE;
}

function getEditorModeServerSnapshot(): EditorMode {
  return DEFAULT_EDITOR_MODE;
}

function persistEditorMode(next: EditorMode) {
  if (typeof window !== "undefined") {
    localStorage.setItem(EDITOR_MODE_STORAGE_KEY, next);
  }
  editorModeListeners.forEach((listener) => listener());
}

// 同样的 useSyncExternalStore 模式订阅 media query：
// SSR 与 hydration 首帧返回 true（与 SSR 一致），hydration 完成后切换到实际值。
const desktopListeners = new Set<() => void>();

function subscribeDesktop(callback: () => void) {
  desktopListeners.add(callback);
  const media = window.matchMedia(DESKTOP_MEDIA_QUERY);
  const handler = () => desktopListeners.forEach((l) => l());
  media.addEventListener("change", handler);
  return () => {
    desktopListeners.delete(callback);
    media.removeEventListener("change", handler);
  };
}

function getDesktopSnapshot(): boolean {
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

function getDesktopServerSnapshot(): boolean {
  return true;
}

type UploadStatus = "idle" | "uploading" | "error";

function resolveAssetUrlFactory(articleId: string) {
  return (assetId: string) =>
    `/api/admin/articles/${articleId}/assets/${assetId}/content`;
}

export function ArticleBodyEditor({
  articleId,
  defaultValue,
  editorRef,
  onInsertReference,
}: {
  articleId: string;
  defaultValue: string;
  editorRef: React.Ref<MarkdownEditorHandle>;
  onInsertReference: (reference: string) => boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const mode = useSyncExternalStore(
    subscribeEditorMode,
    getEditorModeSnapshot,
    getEditorModeServerSnapshot,
  );
  const isDesktop = useSyncExternalStore(
    subscribeDesktop,
    getDesktopSnapshot,
    getDesktopServerSnapshot,
  );
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  function changeMode(next: EditorMode) {
    persistEditorMode(next);
  }

  // 窄屏不支持分屏，降级为编辑
  const effectiveMode: EditorMode =
    !isDesktop && mode === "split" ? "edit" : mode;

  const resolveAssetUrl = useMemo(
    () => resolveAssetUrlFactory(articleId),
    [articleId],
  );

  async function handleFilesUpload(files: FileList | File[]) {
    const fileArray = Array.from(files).filter((f) => f instanceof File);
    if (fileArray.length === 0) return;

    setUploadStatus("uploading");
    setUploadError(null);

    for (const file of fileArray) {
      const formData = new FormData();
      formData.append("articleId", articleId);
      formData.append("file", file);

      const result = await uploadArticleAssetAction(
        initialArticleAssetUploadFormState,
        formData,
      );

      if (result.formError) {
        setUploadStatus("error");
        setUploadError(`${file.name}：${result.formError}`);
        return;
      }

      if (result.uploadedId) {
        const reference = formatCanonicalAssetReference({
          id: result.uploadedId,
          mediaType: file.type as AcceptedAssetType,
          originalFilename: file.name,
        });
        onInsertReference(reference);
      }
    }

    setUploadStatus("idle");
    setUploadError(null);
  }

  // 捕获阶段拦截文件粘贴，纯文本粘贴放行给 CodeMirror
  function handlePasteCapture(event: React.ClipboardEvent) {
    const files = event.clipboardData?.files;
    if (files && files.length > 0) {
      event.preventDefault();
      handleFilesUpload(files);
    }
  }

  function handleDragOverCapture(event: React.DragEvent) {
    if (event.dataTransfer?.types.includes("Files")) {
      event.preventDefault();
      setIsDragOver(true);
    }
  }

  function handleDragLeave(event: React.DragEvent) {
    if (event.relatedTarget === null) {
      setIsDragOver(false);
    }
  }

  function handleDropCapture(event: React.DragEvent) {
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      event.preventDefault();
      setIsDragOver(false);
      handleFilesUpload(files);
    }
  }

  const showEditor = effectiveMode === "edit" || effectiveMode === "split";
  const showPreview =
    effectiveMode === "preview" || effectiveMode === "split";

  return (
    <div className="grid gap-3">
      <div
        className="flex items-center gap-1 rounded-md border border-border bg-muted p-1"
        role="tablist"
      >
        <ModeButton
          active={effectiveMode === "edit"}
          label="编辑"
          onClick={() => changeMode("edit")}
        >
          <Edit3 className="size-4" />
        </ModeButton>
        {isDesktop ? (
          <ModeButton
            active={effectiveMode === "split"}
            label="分屏"
            onClick={() => changeMode("split")}
          >
            <Columns2 className="size-4" />
          </ModeButton>
        ) : null}
        <ModeButton
          active={effectiveMode === "preview"}
          label="预览"
          onClick={() => changeMode("preview")}
        >
          <Eye className="size-4" />
        </ModeButton>
      </div>

      {/* hidden input for form submission */}
      <input name="bodyMarkdown" type="hidden" value={value} />

      <div
        className={cn(
          "grid gap-3",
          effectiveMode === "split" && "md:grid-cols-2",
        )}
      >
        {showEditor ? (
          <div
            className={cn(
              "relative overflow-hidden rounded-md border bg-background transition-colors",
              isDragOver
                ? "border-brand-accent ring-2 ring-brand-accent/30"
                : "border-border",
            )}
            onDragLeave={handleDragLeave}
            onDragOverCapture={handleDragOverCapture}
            onDropCapture={handleDropCapture}
            onPasteCapture={handlePasteCapture}
          >
            {isDragOver ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/80">
                <p className="text-sm font-medium text-brand-accent">
                  释放以上传文件
                </p>
              </div>
            ) : null}
            <MarkdownEditor
              defaultValue={defaultValue}
              onChange={setValue}
              ref={editorRef}
            />
          </div>
        ) : null}

        {showPreview ? (
          <div className="prose prose-sm max-w-none overflow-auto rounded-md border border-border bg-background p-4 dark:prose-invert">
            <MarkdownRenderer resolveAssetUrl={resolveAssetUrl}>
              {value}
            </MarkdownRenderer>
          </div>
        ) : null}
      </div>

      {uploadStatus === "uploading" ? (
        <p
          aria-live="polite"
          className="text-xs text-muted-foreground"
          role="status"
        >
          上传中…
        </p>
      ) : null}
      {uploadStatus === "error" && uploadError ? (
        <p
          aria-live="polite"
          className="text-xs text-destructive"
          role="alert"
        >
          {uploadError}
        </p>
      ) : null}
    </div>
  );
}

function ModeButton({
  active,
  children,
  label,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-selected={active}
      className={cn(
        "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
      onClick={onClick}
      role="tab"
      type="button"
    >
      {children}
      <span>{label}</span>
    </button>
  );
}
