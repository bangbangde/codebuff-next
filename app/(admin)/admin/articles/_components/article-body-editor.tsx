"use client";

import { Edit3, Eye, Columns2 } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";

import { MarkdownRenderer } from "@/lib/content/markdown-renderer";
import { cn } from "@/lib/utils";
import {
  MarkdownEditor,
  type MarkdownEditorHandle,
} from "./markdown-editor";

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

function resolveAssetUrlFactory(articleId: string) {
  return (assetId: string) =>
    `/api/admin/articles/${articleId}/assets/${assetId}/content`;
}

export function ArticleBodyEditor({
  articleId,
  defaultValue,
  editorRef,
}: {
  articleId: string;
  defaultValue: string;
  editorRef: React.Ref<MarkdownEditorHandle>;
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
          <div className="overflow-hidden rounded-md border border-border bg-background">
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
