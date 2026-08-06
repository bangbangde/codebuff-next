"use client";

import { ArrowLeftIcon, SendIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { NoteMarkdownEditorHandle } from "./markdown-editor";
import { NoteBodyEditor } from "./note-body-editor";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ArticleAsset } from "@/features/article-assets/article-asset-dto";
import type {
  CategoryOption,
  TagOption,
} from "@/features/articles/article-dto";
import type { ArticleCreateValues } from "@/features/articles/article-dto";
import { PublishNoteDialog } from "./publish-note-dialog";
import { updateArticleAction } from "../[noteId]/actions";

type SaveStatus = "idle" | "saving" | "saved" | "error" | "not_found";

/** requestSave 的返回结果，供调用方（如 handleBack）做同步决策。 */
type SaveResult = "saved" | "error" | "not_found";

const AUTOSAVE_DEBOUNCE_MS = 2000;

// 资源清理接口：页面退出时通过 sendBeacon 触发，清理无引用超过 24h 的资产。
const ARTICLE_ASSET_CLEANUP_URL = "/api/admin/article-assets/cleanup";

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
  const [lastSavedValues, setLastSavedValues] =
    useState<ArticleCreateValues>(initialValues);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 单飞保存队列：保证同一时间只有一个保存请求在进行，后续调用排队等待。
  // requestSave 返回 Promise<SaveResult>，调用方可据此做同步决策（如 handleBack）。
  const savePromiseRef = useRef<Promise<SaveResult> | null>(null);
  const queuedValuesRef = useRef<ArticleCreateValues | null>(null);
  // 卸载/可见性处理需要读取最新值，用 ref 避免频繁重绑监听器。
  const latestValuesRef = useRef(values);
  const latestLastSavedRef = useRef(lastSavedValues);
  const latestSaveStatusRef = useRef(saveStatus);

  // 编辑会话标识 + 单调序号：防止 pagehide keepalive 与 debounce autosave
  // 乱序导致旧请求反向覆盖正文。每次发起保存请求时递增 sequence。
  // useState 惰性初始化避免在 useRef 初始值中调用不纯函数（react-hooks/purity）。
  const [sessionId] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2),
  );
  const sessionIdRef = useRef(sessionId);
  const sequenceRef = useRef(0);

  useEffect(() => {
    latestValuesRef.current = values;
    latestLastSavedRef.current = lastSavedValues;
    latestSaveStatusRef.current = saveStatus;
  }, [values, lastSavedValues, saveStatus]);

  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [navigatingBack, setNavigatingBack] = useState(false);

  /**
   * 可串行化的单飞保存队列。
   *
   * - 调用时将 valuesToSave 写入 queuedValuesRef；
   * - 若保存循环已在运行，直接返回现有 Promise（最新值已在队列中等待）；
   * - 否则启动循环：不断取出 queuedValuesRef 中的最新值并发起保存请求，
   *   直到队列为空。每次成功后更新 lastSavedValues；
   * - 失败（error/not_found）时立即终止循环并返回结果。
   *
   * autosave、Ctrl+S、visibility flush、handleBack 共用同一队列，
   * 保证最新输入不会因"已有保存进行中"而丢失。
   */
  const requestSave = useCallback(
    (valuesToSave: ArticleCreateValues): Promise<SaveResult> => {
      queuedValuesRef.current = valuesToSave;

      if (savePromiseRef.current) {
        return savePromiseRef.current;
      }

      const promise = (async (): Promise<SaveResult> => {
        // 本地跟踪已保存的值，避免依赖尚未 flush 的 React state
        let lastSaved = latestLastSavedRef.current;

        while (queuedValuesRef.current !== null) {
          const current = queuedValuesRef.current;
          queuedValuesRef.current = null;

          // 跳过与已保存值相同的请求，避免冗余写入
          if (valuesEqual(current, lastSaved)) {
            continue;
          }

          setSaveStatus("saving");
          latestSaveStatusRef.current = "saving";
          setFormError(null);

          sequenceRef.current += 1;
          const sequence = sequenceRef.current;
          const formData = new FormData();
          formData.append("articleId", article.id);
          formData.append("title", current.title);
          formData.append("bodyMarkdown", current.bodyMarkdown);
          formData.append("sessionId", sessionIdRef.current);
          formData.append("sequence", String(sequence));

          try {
            const result = await updateArticleAction(
              {
                fieldErrors: {},
                formError: null,
                status: "idle",
                values: current,
              },
              formData,
            );

            // ignored（同会话旧序号被拒）对用户等同 saved，已被更新的请求覆盖。
            if (result.status === "saved") {
              setFormError(null);
              setSaveStatus("saved");
              latestSaveStatusRef.current = "saved";
              setLastSavedValues(current);
              lastSaved = current;
              latestLastSavedRef.current = current;
            } else {
              setFormError(result.formError);
              setSaveStatus(result.status);
              latestSaveStatusRef.current = result.status;
              savePromiseRef.current = null;
              return result.status as SaveResult;
            }
          } catch {
            setFormError("保存请求未完成，请检查网络后重试。");
            setSaveStatus("error");
            latestSaveStatusRef.current = "error";
            savePromiseRef.current = null;
            return "error";
          }
        }

        savePromiseRef.current = null;
        return "saved";
      })();

      savePromiseRef.current = promise;
      return promise;
    },
    [article.id],
  );

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

  // 返回按钮改成受控导航：先保存最新值，成功后再 router.push。
  // next/link 的客户端导航不触发 pagehide/beforeunload，若直接用 Link，
  // 2s debounce 内点返回会丢失修改且不触发 cleanup。
  // 不再依赖异步 React state 判断保存结果，而是直接使用 requestSave 的返回值。
  async function handleBack() {
    if (navigatingBack) {
      return;
    }

    const dirty = !valuesEqual(latestValuesRef.current, latestLastSavedRef.current);

    if (!dirty || latestSaveStatusRef.current === "not_found") {
      router.push("/admin/notes");
      return;
    }

    setNavigatingBack(true);
    // 取消挂起的 debounce，立即 flush 保存最新值
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // 等待保存队列完成（包括此前进行中的 autosave + 本次最新值）
    const result = await requestSave(latestValuesRef.current);
    setNavigatingBack(false);

    // 仅在明确保存成功后导航；失败或文章不存在时留在当前页
    if (result === "saved") {
      router.push("/admin/notes");
    }
  }

  // Ctrl+S / Cmd+S 立即保存，并拦截浏览器默认保存网页行为。
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
      // not_found 时跳过：文章已不存在，保存无意义。
      // saving 时允许调用：requestSave 会排队最新值，不丢失输入。
      if (latestSaveStatusRef.current === "not_found") {
        return;
      }
      handleManualSave();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleManualSave]);

  // 离开页面前尽量提交未保存的草稿，并触发资源清理：
  // - 页面隐藏（切标签/最小化/移动端切换）：立即 flush 未触发的 debounce。
  // - 页面真正卸载（pagehide）：
  //   1. 用 keepalive fetch 兜底保存脏草稿（带 sessionId/sequence 防乱序）。
  //   2. 用 navigator.sendBeacon 触发全局资源清理（24h 无引用）。
  // - beforeunload：若有未保存修改，提示用户。
  // - 组件卸载（客户端导航，如受控返回）：也触发 cleanup sendBeacon。
  useEffect(() => {
    function isDirty() {
      return !valuesEqual(latestValuesRef.current, latestLastSavedRef.current);
    }

    function flushPendingDebounce() {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
        void requestSave(latestValuesRef.current);
      }
    }

    function triggerCleanup() {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        try {
          navigator.sendBeacon(ARTICLE_ASSET_CLEANUP_URL);
        } catch {
          // 忽略：清理是尽力而为，失败不影响主流程。
        }
      }
    }

    function handleVisibilityChange() {
      if (document.hidden && isDirty()) {
        const status = latestSaveStatusRef.current;
        if (status !== "not_found") {
          flushPendingDebounce();
        }
      }
    }

    function handlePageHide() {
      // 1. 兜底保存未保存的草稿（带 session/sequence 防乱序覆盖）
      if (isDirty()) {
        const status = latestSaveStatusRef.current;
        if (status !== "not_found") {
          sequenceRef.current += 1;
          const formData = new FormData();
          formData.append("articleId", article.id);
          formData.append("title", latestValuesRef.current.title);
          formData.append("bodyMarkdown", latestValuesRef.current.bodyMarkdown);
          formData.append("sessionId", sessionIdRef.current);
          formData.append("sequence", String(sequenceRef.current));

          void fetch(`/api/admin/notes/${article.id}/save`, {
            body: formData,
            keepalive: true,
            method: "POST",
          }).catch(() => {
            // 卸载阶段失败无法恢复，静默处理。
          });
        }
      }

      // 2. 触发资源清理：删除无引用超过 24h 的 Garage 对象。
      triggerCleanup();
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (isDirty()) {
        event.preventDefault();
        event.returnValue = "";
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // 客户端导航（如受控返回）组件卸载时也触发 cleanup。
      triggerCleanup();
    };
  }, [article.id, requestSave]);

  const isDirty = !valuesEqual(values, lastSavedValues);

  const statusLabel = (() => {
    if (navigatingBack) {
      return "保存中…";
    }
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
      <header className="shrink-0 border-b border-border bg-card text-card-foreground">
        <div className="flex min-h-14 flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Button
              aria-label="返回笔记列表"
              className={cn(
                buttonVariants({
                  className:
                    "h-9 w-9 shrink-0 text-muted-foreground sm:h-7 sm:w-7",
                  size: "icon-sm",
                  variant: "ghost",
                }),
                navigatingBack && "pointer-events-none opacity-50",
              )}
              disabled={navigatingBack}
              onClick={handleBack}
              type="button"
            >
              <ArrowLeftIcon aria-hidden="true" />
            </Button>
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
                : saveStatus === "saving" || navigatingBack
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
              isDirty ||
              saveStatus === "saving" ||
              saveStatus === "not_found" ||
              saveStatus === "error"
            }
            onClick={() => setPublishDialogOpen(true)}
            size="sm"
            title={isDirty ? "请先保存草稿，再发布当前修订" : undefined}
            type="button"
          >
            <SendIcon aria-hidden="true" />
            {isPublished ? "更新" : "发布"}
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
        onOpenChange={setPublishDialogOpen}
        open={publishDialogOpen}
        tags={tags}
      />
    </>
  );
}
