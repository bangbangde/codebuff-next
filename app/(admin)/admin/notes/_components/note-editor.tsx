"use client";

import { SendIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { NoteMarkdownEditorHandle } from "./markdown-editor";
import { NoteBodyEditor } from "./note-body-editor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ArticleAsset } from "@/features/article-assets/article-asset-dto";
import { useUploadTasks } from "@/features/article-assets/use-upload-tasks";
import type {
  CategoryOption,
  TagOption,
} from "@/features/articles/article-dto";
import type { ArticleCreateValues } from "@/features/articles/article-dto";

import { PublishNoteDialog } from "./publish-note-dialog";
import { updateArticleAction } from "../[noteId]/actions";

type SaveStatus = "idle" | "saving" | "saved" | "error" | "not_found";

/** requestSave 的返回结果，供调用方（如发布前最终保存）做同步决策。 */
type SaveResult = "saved" | "error" | "not_found";

const AUTOSAVE_DEBOUNCE_MS = 2000;

// 资源清理接口：页面退出时通过 sendBeacon 触发，清理无引用超过 24h 的资产。
const ARTICLE_ASSET_CLEANUP_URL = "/api/admin/article-assets/cleanup";

// 活动上传状态：参与 beforeunload 离开保护
const ACTIVE_UPLOAD_STATUSES = new Set(["pending", "uploading", "retrying"]);

function valuesEqual(a: ArticleCreateValues, b: ArticleCreateValues): boolean {
  return a.title === b.title && a.bodyMarkdown === b.bodyMarkdown;
}

export function NoteEditor({
  article,
  assets,
  categories,
  tags,
  initialValues,
}: {
  article: {
    id: string;
    publishedAt: string | null;
    publishedFromRevision: number | null;
    coverAssetId: string | null;
    summary: string;
    categoryName: string | null;
    tagNames: readonly string[];
  };
  assets: readonly ArticleAsset[];
  categories: readonly CategoryOption[];
  tags: readonly TagOption[];
  initialValues: ArticleCreateValues;
}) {
  const router = useRouter();
  const editorRef = useRef<NoteMarkdownEditorHandle>(null);
  const [values, setValues] = useState<ArticleCreateValues>(initialValues);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [formError, setFormError] = useState<string | null>(null);
  // lastSavedValues 存储的是已持久化的值（已剔除占位符）
  const [lastSavedValues, setLastSavedValues] =
    useState<ArticleCreateValues>(initialValues);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 卸载/可见性处理需要读取最新值，用 ref 避免频繁重绑监听器。
  const latestValuesRef = useRef(values);
  const latestLastSavedRef = useRef(lastSavedValues);
  const latestSaveStatusRef = useRef(saveStatus);

  // 编辑会话标识 + 单调序号：防止同标签页内网络乱序导致旧请求覆盖正文。
  const [sessionId] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2),
  );
  const sessionIdRef = useRef(sessionId);
  const sequenceRef = useRef(0);
  // 追踪最新发出的 sequence，只有最新请求的响应才能更新界面状态。
  const latestSequenceRef = useRef(0);

  // 订阅上传任务状态，用于 beforeunload 离开保护和发布前检查
  const allUploadTasks = useUploadTasks();
  const hasActiveUploads = allUploadTasks.some(
    (t) => t.articleId === article.id && ACTIVE_UPLOAD_STATUSES.has(t.status),
  );
  const hasActiveUploadsRef = useRef(hasActiveUploads);
  const hasBlockingPublishWorkRef = useRef(false);
  const handleBlockingStateChange = (hasBlocking: boolean) =>
    (hasBlockingPublishWorkRef.current = hasBlocking);

  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  // 发布/删除全屏 loading
  const [overlayMessage, setOverlayMessage] = useState<string | null>(null);

  useEffect(() => {
    latestValuesRef.current = values;
    latestLastSavedRef.current = lastSavedValues;
    latestSaveStatusRef.current = saveStatus;
    hasActiveUploadsRef.current = hasActiveUploads;
  }, [values, lastSavedValues, saveStatus, hasActiveUploads]);

  // ─── 保存（并发，不排队）─────────────────────────────────────

  /**
   * 发起一次保存请求。允许多个保存请求并发，不排队。
   *
   * - 每次调用递增 sequence，携带 sessionId + sequence。
   * - 服务端拒绝同 session 的旧 sequence 覆盖。
   * - 只有最新 sequence 的响应才能更新保存状态、错误信息和 lastSavedValues。
   * - 旧请求响应只结束自身生命周期，不回退界面状态。
   *
   * 返回 SaveResult 供调用方（如发布前最终保存）做同步决策。
   */
  const requestSave = useCallback(
    async (valuesToSave: ArticleCreateValues): Promise<SaveResult> => {
      if (valuesEqual(valuesToSave, latestLastSavedRef.current)) {
        return "saved";
      }

      sequenceRef.current += 1;
      const sequence = sequenceRef.current;
      latestSequenceRef.current = sequence;

      setSaveStatus("saving");
      latestSaveStatusRef.current = "saving";
      setFormError(null);

      const formData = new FormData();
      formData.append("articleId", article.id);
      formData.append("title", valuesToSave.title);
      formData.append("bodyMarkdown", valuesToSave.bodyMarkdown);
      formData.append("sessionId", sessionIdRef.current);
      formData.append("sequence", String(sequence));

      try {
        const result = await updateArticleAction(
          {
            fieldErrors: {},
            formError: null,
            status: "idle",
            values: valuesToSave,
          },
          formData,
        );

        // 只有最新请求的响应才能更新界面状态
        if (sequence !== latestSequenceRef.current) {
          // 旧请求响应：不回退界面状态
          return result.status === "saved"
            ? "saved"
            : result.status === "not_found"
              ? "not_found"
              : "error";
        }

        // ignored（同会话旧序号被拒）对用户等同 saved
        if (result.status === "saved") {
          setFormError(null);
          setSaveStatus("saved");
          latestSaveStatusRef.current = "saved";
          setLastSavedValues(valuesToSave);
          latestLastSavedRef.current = valuesToSave;
          return "saved";
        }

        setFormError(result.formError);
        setSaveStatus(result.status);
        latestSaveStatusRef.current = result.status;
        return result.status as SaveResult;
      } catch {
        if (sequence === latestSequenceRef.current) {
          setFormError("保存请求未完成，请检查网络后重试。");
          setSaveStatus("error");
          latestSaveStatusRef.current = "error";
        }
        return "error";
      }
    },
    [article.id],
  );

  // ─── 自动保存（2s debounce）──────────────────────────────────

  const isDirty = !valuesEqual(values, lastSavedValues);

  useEffect(() => {
    if (valuesEqual(values, lastSavedValues)) {
      return;
    }
    if (saveStatus === "not_found") {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      void requestSave(values);
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [values, lastSavedValues, saveStatus, requestSave]);

  // ─── 输入处理 ────────────────────────────────────────────────

  const handleTitleChange = useCallback((title: string) => {
    setValues((prev) => (prev.title === title ? prev : { ...prev, title }));
  }, []);

  const handleBodyChange = useCallback((bodyMarkdown: string) => {
    setValues((prev) =>
      prev.bodyMarkdown === bodyMarkdown ? prev : { ...prev, bodyMarkdown },
    );
  }, []);

  const handleManualSave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    void requestSave(latestValuesRef.current);
  }, [requestSave]);

  // ─── Ctrl+S / Cmd+S ──────────────────────────────────────────

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isSaveShortcut =
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        (event.key === "s" || event.key === "S");
      if (!isSaveShortcut) {
        return;
      }
      event.preventDefault();
      if (latestSaveStatusRef.current === "not_found") {
        return;
      }
      handleManualSave();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleManualSave]);

  // ─── 页面离开保护（仅 beforeunload）──────────────────────────
  useEffect(() => {
    function shouldWarnBeforeUnload() {
      const dirty = !valuesEqual(
        latestValuesRef.current,
        latestLastSavedRef.current,
      );
      const saving = latestSaveStatusRef.current === "saving";
      const activeUploads = hasActiveUploadsRef.current;
      const publishBlocking = hasBlockingPublishWorkRef.current;
      return dirty || saving || activeUploads || publishBlocking;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (shouldWarnBeforeUnload()) {
        event.preventDefault();
      } else {
        navigator.sendBeacon(ARTICLE_ASSET_CLEANUP_URL);
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    navigator.sendBeacon(ARTICLE_ASSET_CLEANUP_URL);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // ─── 发布流程 ────────────────────────────────────────────────
  //
  // 存在 pending / uploading / retrying 上传时禁止发布。
  // 发布前执行最终保存（最高 sequence），保存成功后再调用发布接口。
  // 发布和删除期间使用全屏 loading 阻止其他操作。

  function handlePublishClick() {
    if (hasActiveUploads) {
      return;
    }
    setPublishDialogOpen(true);
  }

  /**
   * 发布前最终保存。由 PublishNoteDialog 在用户确认发布后调用。
   * 返回 true 表示保存成功（或无需保存），可以继续发布。
   */
  async function handleFinalSave(): Promise<boolean> {
    // 取消挂起的 debounce，立即保存最新值
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const result = await requestSave(latestValuesRef.current);
    return result === "saved";
  }

  function handlePublishSuccess() {
    setPublishDialogOpen(false);
    setOverlayMessage("发布成功，正在跳转…");
    router.push(`/notes/${article.id}`);
  }

  // ─── 渲染 ────────────────────────────────────────────────────

  const statusLabel = (() => {
    switch (saveStatus) {
      case "saving":
        return "保存中…";
      case "saved":
        return isDirty ? "未保存" : "所有更改已保存";
      case "error":
        return formError ?? "保存失败";
      case "not_found":
        return formError ?? "笔记已不存在";
      default:
        return isDirty ? "未保存" : "笔记将自动保存至草稿箱";
    }
  })();

  const isStatusError = saveStatus === "error" || saveStatus === "not_found";
  const isPublished = article.publishedAt !== null;

  return (
    <>
      {overlayMessage ? (
        <div
          aria-live="assertive"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          role="status"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
            <p className="text-sm font-medium text-foreground">
              {overlayMessage}
            </p>
          </div>
        </div>
      ) : null}

      <header className="shrink-0 border-b border-border bg-card text-card-foreground">
        <div className="flex min-h-14 flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <input
              aria-label="笔记标题"
              className="h-9 min-w-0 flex-1 rounded-md border-0 bg-transparent px-2 text-lg font-semibold tracking-[-0.025em] text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
              onChange={(event) => handleTitleChange(event.target.value)}
              placeholder="输入笔记标题…"
              value={values.title}
            />
          </div>

          <div className="flex w-full min-w-0 shrink-0 items-center gap-2 sm:w-auto">
            <span
              aria-live="polite"
              className={cn(
                "mr-auto min-w-0 truncate text-xs sm:mr-1 sm:max-w-52",
                isStatusError
                  ? "text-destructive"
                  : saveStatus === "saving"
                    ? "text-foreground"
                    : "text-muted-foreground",
              )}
              role={isStatusError ? "alert" : "status"}
            >
              {statusLabel}
            </span>

            <Button
              className="h-9 sm:h-7"
              disabled={
                hasActiveUploads ||
                saveStatus === "saving" ||
                saveStatus === "not_found" ||
                saveStatus === "error"
              }
              onClick={handlePublishClick}
              size="sm"
              title={hasActiveUploads ? "请等待上传完成后发布" : undefined}
              type="button"
            >
              <SendIcon aria-hidden="true" />
              {isPublished ? "发布更新" : "发布"}
            </Button>
          </div>
        </div>
      </header>

      <NoteBodyEditor
        articleId={article.id}
        defaultValue={values.bodyMarkdown}
        editorRef={editorRef}
        onValueChange={handleBodyChange}
      />

      <PublishNoteDialog
        article={{
          id: article.id,
          publishedAt: article.publishedAt,
          publishedFromRevision: article.publishedFromRevision,
        }}
        assets={assets}
        categories={categories}
        draftBody={values.bodyMarkdown}
        initialCoverAssetId={article.coverAssetId}
        initialCategoryName={article.categoryName ?? ""}
        initialSummary={article.summary}
        initialTagNames={article.tagNames}
        onFinalSave={handleFinalSave}
        onOpenChange={setPublishDialogOpen}
        onPublishSuccess={handlePublishSuccess}
        open={publishDialogOpen}
        tags={tags}
        onBlockingStateChange={handleBlockingStateChange}
      />
    </>
  );
}
