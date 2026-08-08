"use client";

import { Edit3, Columns2, Upload } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { uploadTaskManager } from "@/features/article-assets/upload-task-manager";
import {
  useUploadTasks,
  useUploadActions,
} from "@/features/article-assets/use-upload-tasks";
import {
  formatCanonicalAssetReference,
  formatUploadPlaceholder,
} from "@/features/articles/article-asset-reference";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/lib/content/markdown-renderer";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadToastBridge } from "./upload-toast-bridge";
import {
  NoteMarkdownEditor,
  type NoteMarkdownEditorHandle,
} from "./markdown-editor";

type EditorMode = "edit" | "split";

const EDITOR_MODE_STORAGE_KEY = "article-editor-mode";
const SPLIT_RATIO_STORAGE_KEY = "article-editor-split-ratio";
const DEFAULT_EDITOR_MODE: EditorMode = "split";
const DEFAULT_SPLIT_RATIO = 0.5;
const MIN_SPLIT_RATIO = 0.2;
const MAX_SPLIT_RATIO = 0.8;
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
  return stored === "edit" || stored === "split" ? stored : DEFAULT_EDITOR_MODE;
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

// 分屏比例同样使用 useSyncExternalStore 订阅，避免 SSR hydration mismatch。
// 拖拽过程中通过 live state 更新视觉，松手时调用 persistSplitRatio 写入 localStorage。
const splitRatioListeners = new Set<() => void>();

function subscribeSplitRatio(callback: () => void) {
  splitRatioListeners.add(callback);
  return () => {
    splitRatioListeners.delete(callback);
  };
}

function readSplitRatio(): number {
  const stored = localStorage.getItem(SPLIT_RATIO_STORAGE_KEY);
  const parsed = stored ? Number.parseFloat(stored) : Number.NaN;
  if (!Number.isFinite(parsed)) {
    return DEFAULT_SPLIT_RATIO;
  }
  return Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, parsed));
}

function getSplitRatioSnapshot(): number {
  if (typeof window === "undefined") {
    return DEFAULT_SPLIT_RATIO;
  }
  return readSplitRatio();
}

function getSplitRatioServerSnapshot(): number {
  return DEFAULT_SPLIT_RATIO;
}

function persistSplitRatio(next: number) {
  if (typeof window !== "undefined") {
    const clamped = Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, next));
    localStorage.setItem(SPLIT_RATIO_STORAGE_KEY, String(clamped));
    splitRatioListeners.forEach((listener) => listener());
  }
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
  onValueChange,
}: {
  articleId: string;
  defaultValue: string;
  editorRef: React.RefObject<NoteMarkdownEditorHandle | null>;
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
  const dragDepthRef = useRef(0);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tasks = useUploadTasks();
  const { enqueue } = useUploadActions();
  // 已处理过占位符替换的任务 ID，避免重复替换
  const handledUploadsRef = useRef<Set<string>>(new Set());

  // 分屏比例：持久化值 + 拖拽期间的实时覆盖值
  const persistedRatio = useSyncExternalStore(
    subscribeSplitRatio,
    getSplitRatioSnapshot,
    getSplitRatioServerSnapshot,
  );
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const splitRatio = dragRatio ?? persistedRatio;

  // 拖拽分割线：使用 pointer events 统一鼠标与触屏，拖拽期间禁用文本选择
  function handleDividerPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (effectiveMode !== "split") return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const container = splitContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    function onPointerMove(ev: PointerEvent) {
      if (!container) return;
      const next = (ev.clientX - rect.left) / rect.width;
      setDragRatio(Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, next)));
    }

    function onPointerUp(ev: PointerEvent) {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      const next = (ev.clientX - rect.left) / rect.width;
      const clamped = Math.min(
        MAX_SPLIT_RATIO,
        Math.max(MIN_SPLIT_RATIO, next),
      );
      persistSplitRatio(clamped);
      setDragRatio(null);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  }

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

  // 上传完成时将占位符注释 <!-- cq-upload:taskId --> 替换为稳定的
  // cq-asset://{assetId} markdown 引用。使用 ref 记录已处理的任务，
  // 避免重复替换；若用户已删除占位符则替换静默失败。
  useEffect(() => {
    for (const task of tasks) {
      if (
        task.status === "success" &&
        task.asset &&
        !handledUploadsRef.current.has(task.id)
      ) {
        handledUploadsRef.current.add(task.id);
        editorRef.current?.replaceText(
          formatUploadPlaceholder(task.id),
          formatCanonicalAssetReference(task.asset),
        );
      }
    }
  }, [tasks, editorRef]);

  // 上传取消时删除整个占位符注释，与 success 替换逻辑对称。
  // 使用独立 ref 记录已处理的取消，避免重复删除。
  const handledCancellationsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const task of tasks) {
      if (
        task.status === "canceled" &&
        !handledCancellationsRef.current.has(task.id)
      ) {
        handledCancellationsRef.current.add(task.id);
        editorRef.current?.replaceText(formatUploadPlaceholder(task.id), "");
      }
    }
  }, [tasks, editorRef]);

  // 失败上传被用户 discard 后清理占位符。
  // 跟踪所有进入 error 状态的任务 ID；当任务从 store 消失（被 discard 移除）
  // 时，移除其占位符注释。retry 不触发此逻辑（retry 不删除任务，只改状态）。
  const errorTaskIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const currentIds = new Set(tasks.map((t) => t.id));

    for (const task of tasks) {
      if (task.status === "error") {
        errorTaskIdsRef.current.add(task.id);
      }
    }

    for (const taskId of errorTaskIdsRef.current) {
      if (!currentIds.has(taskId)) {
        editorRef.current?.replaceText(formatUploadPlaceholder(taskId), "");
        errorTaskIdsRef.current.delete(taskId);
      }
    }
  }, [tasks, editorRef]);

  const resolveAssetUrl = useMemo(
    () => resolveAssetUrlFactory(articleId),
    [articleId],
  );

  function handleFilesUpload(files: FileList | File[]) {
    const fileArray = Array.from(files).filter((f) => f instanceof File);
    if (fileArray.length === 0) return;

    for (const file of fileArray) {
      const taskId = enqueue(articleId, file);
      // 客户端校验未通过的任务以 "error" 状态创建，不插入占位符
      const task = uploadTaskManager.getTask(taskId);
      if (task && task.status !== "error") {
        editorRef.current?.insertText(formatUploadPlaceholder(taskId));
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

  // dragenter 计数器：每次进入元素（含子元素）时 +1，dragleave 时 -1。
  // 不能用 dragover 计数：dragover 持续触发会导致 counter 无限增长。
  function handleDragEnterCapture(event: React.DragEvent) {
    if (event.dataTransfer?.types.includes("Files")) {
      event.preventDefault();
      dragDepthRef.current += 1;
      if (dragDepthRef.current === 1) {
        setIsDragOver(true);
      }
    }
  }

  // dragover 仅用于 preventDefault 允许 drop，不修改计数器。
  function handleDragOverCapture(event: React.DragEvent) {
    if (event.dataTransfer?.types.includes("Files")) {
      event.preventDefault();
    }
  }

  function handleDragLeave(event: React.DragEvent) {
    // 纯计数器方案：每次 dragleave 递减，不用 contains() 过滤。
    // dragenter 和 dragleave 在父子元素间成对触发，计数器自然平衡。
    // drop 时强制归零兜底。
    if (event.dataTransfer?.types.includes("Files")) {
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) {
        setIsDragOver(false);
      }
    }
  }

  function handleDropCapture(event: React.DragEvent) {
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      event.preventDefault();
      dragDepthRef.current = 0;
      setIsDragOver(false);
      handleFilesUpload(files);
    }
  }

  const showEditor = effectiveMode === "edit" || effectiveMode === "split";
  const showPreview = effectiveMode === "split";
  const isSplit = effectiveMode === "split";
  const isDragging = dragRatio !== null;
  const editorBasis = `${splitRatio * 100}%`;

  return (
    <div className="relative flex h-0 flex-1 flex-col bg-card">
      <div className="flex shrink-0 items-center gap-1 border-b border-border bg-card px-2 py-1">
        <Tabs
          className="gap-0"
          onValueChange={(value) => {
            if (value === "edit" || value === "split") {
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
          </TabsList>
        </Tabs>
        <Button
          aria-label="上传文件"
          className="ml-auto"
          onClick={() => fileInputRef.current?.click()}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <Upload aria-hidden="true" />
        </Button>
        <input
          accept=".jpg,.jpeg,.png,.webp,.gif,.avif,.pdf,image/jpeg,image/png,image/webp,image/gif,image/avif,application/pdf"
          className="hidden"
          multiple
          onChange={(event) => {
            const files = event.target.files;
            if (files && files.length > 0) {
              handleFilesUpload(files);
            }
            // 重置 value 以便重复选择同一文件时仍触发 onChange
            event.target.value = "";
          }}
          ref={fileInputRef}
          type="file"
        />
      </div>

      {/* hidden input for form submission */}
      <input name="bodyMarkdown" type="hidden" value={value} />

      <div
        className={cn(
          "flex h-0 flex-1 bg-border",
          // 拖拽期间禁用文本选择，统一指针样式
          isDragging && "select-none cursor-col-resize",
        )}
        ref={splitContainerRef}
      >
        {showEditor ? (
          <div
            className={cn(
              "relative flex min-w-0 flex-col overflow-hidden bg-background transition-shadow",
              !isSplit && "flex-1",
              isDragOver ? "ring-2 ring-inset ring-brand-accent/50" : null,
            )}
            onDragEnterCapture={handleDragEnterCapture}
            onDragLeave={handleDragLeave}
            onDragOverCapture={handleDragOverCapture}
            onDropCapture={handleDropCapture}
            onPasteCapture={handlePasteCapture}
            style={
              isSplit
                ? { flexBasis: editorBasis, flexGrow: 0, flexShrink: 0 }
                : undefined
            }
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

        {isSplit ? (
          <div
            aria-hidden="true"
            className={cn(
              "group relative w-px shrink-0 cursor-col-resize bg-border",
              isDragging && "bg-brand-accent",
            )}
            data-dragging={isDragging ? "true" : undefined}
            onPointerDown={handleDividerPointerDown}
          >
            {/* 加宽命中区域，方便鼠标与触屏抓取 */}
            <div className="absolute inset-y-0 -left-1.5 -right-1.5 z-10" />
            <div
              className={cn(
                "pointer-events-none absolute top-1/2 left-1/2 flex h-10 w-1 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-border transition-colors group-hover:bg-muted-foreground/60",
                isDragging && "bg-brand-accent",
              )}
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
      <UploadToastBridge articleId={articleId} />
    </div>
  );
}
