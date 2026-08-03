"use client";

import { Edit3, Eye, Columns2 } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import type { AcceptedAssetType } from "@/features/article-assets/article-asset-dto";
import { initialArticleAssetUploadFormState } from "@/features/article-assets/article-asset-form-state";
import { formatCanonicalAssetReference } from "@/features/articles/article-asset-reference";
import { MarkdownRenderer } from "@/lib/content/markdown-renderer";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  NoteMarkdownEditor,
  type NoteMarkdownEditorHandle,
} from "./markdown-editor";
import { uploadArticleAssetAction } from "../[noteId]/actions";

type EditorMode = "edit" | "split" | "preview";
type UploadStatus =
  | { kind: "idle" }
  | { kind: "uploading"; filename: string }
  | { kind: "success"; filename: string }
  | { kind: "error"; message: string };

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

function resolveAssetUrlFactory(articleId: string) {
  return (assetId: string) =>
    `/api/admin/notes/${articleId}/assets/${assetId}/content`;
}

export function NoteBodyEditor({
  articleId,
  defaultValue,
  editorRef,
  onInsertReference,
  onValueChange,
}: {
  articleId: string;
  defaultValue: string;
  editorRef: React.RefObject<NoteMarkdownEditorHandle | null>;
  onInsertReference: (reference: string) => boolean;
  onValueChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);

  function handleChange(next: string) {
    setValue(next);
    onValueChange?.(next);
  }
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

  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ kind: "idle" });
  const previewRef = useRef<HTMLDivElement>(null);

  function changeMode(next: EditorMode) {
    persistEditorMode(next);
  }

  // 窄屏不支持分屏，降级为编辑
  const effectiveMode: EditorMode =
    !isDesktop && mode === "split" ? "edit" : mode;

  // 分屏模式下编辑器与预览按比例同步滚动
  useEffect(() => {
    if (effectiveMode !== "split") {
      return;
    }

    const preview = previewRef.current;
    const editorScroller = editorRef.current?.getScroller();
    if (!preview || !editorScroller) {
      return;
    }

    let syncing = false;

    function syncToPreview() {
      if (syncing) return;
      syncing = true;
      const maxEditor =
        editorScroller!.scrollHeight - editorScroller!.clientHeight;
      const maxPreview = preview!.scrollHeight - preview!.clientHeight;
      if (maxEditor > 0 && maxPreview > 0) {
        preview!.scrollTop =
          (editorScroller!.scrollTop / maxEditor) * maxPreview;
      }
      syncing = false;
    }

    function syncToEditor() {
      if (syncing) return;
      syncing = true;
      const maxEditor =
        editorScroller!.scrollHeight - editorScroller!.clientHeight;
      const maxPreview = preview!.scrollHeight - preview!.clientHeight;
      if (maxEditor > 0 && maxPreview > 0) {
        editorScroller!.scrollTop =
          (preview!.scrollTop / maxPreview) * maxEditor;
      }
      syncing = false;
    }

    editorScroller.addEventListener("scroll", syncToPreview, { passive: true });
    preview.addEventListener("scroll", syncToEditor, { passive: true });

    return () => {
      editorScroller.removeEventListener("scroll", syncToPreview);
      preview.removeEventListener("scroll", syncToEditor);
    };
  }, [effectiveMode, editorRef]);

  const resolveAssetUrl = useMemo(
    () => resolveAssetUrlFactory(articleId),
    [articleId],
  );

  async function handleFilesUpload(files: FileList | File[]) {
    const fileArray = Array.from(files).filter((f) => f instanceof File);
    if (fileArray.length === 0) return;

    for (const file of fileArray) {
      setUploadStatus({ kind: "uploading", filename: file.name });
      const formData = new FormData();
      formData.append("articleId", articleId);
      formData.append("file", file);

      const result = await uploadArticleAssetAction(
        initialArticleAssetUploadFormState,
        formData,
      );

      if (result.formError) {
        setUploadStatus({ kind: "error", message: `${file.name}：${result.formError}` });
        return;
      }

      if (result.uploadedId) {
        const reference = formatCanonicalAssetReference({
          id: result.uploadedId,
          mediaType: file.type as AcceptedAssetType,
          originalFilename: file.name,
        });
        if (!onInsertReference(reference)) {
          setUploadStatus({ kind: "error", message: `${file.name} 已上传，但当前编辑器无法插入引用。` });
          return;
        }
        setUploadStatus({ kind: "success", filename: file.name });
      }
    }
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
  const showPreview = effectiveMode === "preview" || effectiveMode === "split";

  return (
    <div className="flex h-0 flex-1 flex-col bg-card">
      <Tabs
        className="shrink-0 gap-0 border-b border-border bg-card px-2 py-1"
        onValueChange={(value) => {
          if (value === "edit" || value === "split" || value === "preview") {
            changeMode(value);
          }
        }}
        value={effectiveMode}
      >
        <TabsList aria-label="编辑器视图" className="h-8" variant="default">
          <TabsTrigger className="min-w-20" value="edit">
            <Edit3 aria-hidden="true" />
            编辑
          </TabsTrigger>
          {isDesktop ? (
            <TabsTrigger className="min-w-20" value="split">
              <Columns2 aria-hidden="true" />
              分屏
            </TabsTrigger>
          ) : null}
          <TabsTrigger className="min-w-20" value="preview">
            <Eye aria-hidden="true" />
            预览
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* hidden input for form submission */}
      <input name="bodyMarkdown" type="hidden" value={value} />

      <div className="flex h-0 flex-1 gap-px bg-border">
        {showEditor ? (
          <div
            className={cn(
              "relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background transition-shadow",
              isDragOver
                ? "ring-2 ring-inset ring-brand-accent/50"
                : null,
            )}
            onDragLeave={handleDragLeave}
            onDragOverCapture={handleDragOverCapture}
            onDropCapture={handleDropCapture}
            onPasteCapture={handlePasteCapture}
          >
            {isDragOver ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/80">
                <p className="text-sm font-medium text-brand-ink">
                  释放以上传文件
                </p>
              </div>
            ) : null}
            <NoteMarkdownEditor
              onChange={handleChange}
              ref={editorRef}
              value={value}
            />
          </div>
        ) : null}

        {showPreview ? (
          <div className="min-w-0 flex-1 bg-background dark:prose-invert">
            <div
              className="prose prose-sm h-full max-w-none overflow-auto p-5 sm:p-7"
              ref={previewRef}
            >
              <MarkdownRenderer resolveAssetUrl={resolveAssetUrl}>
                {value}
              </MarkdownRenderer>
            </div>
          </div>
        ) : null}
      </div>
      {uploadStatus.kind !== "idle" ? (
        <p
          className={cn(
            "shrink-0 border-t border-border bg-muted px-3 py-1.5 text-xs",
            uploadStatus.kind === "error" ? "text-destructive" : "text-muted-foreground",
          )}
          role={uploadStatus.kind === "error" ? "alert" : "status"}
        >
          {uploadStatus.kind === "uploading"
            ? `正在上传 ${uploadStatus.filename}…`
            : uploadStatus.kind === "success"
              ? `${uploadStatus.filename} 已上传并插入正文。`
              : uploadStatus.message}
        </p>
      ) : null}
    </div>
  );
}
