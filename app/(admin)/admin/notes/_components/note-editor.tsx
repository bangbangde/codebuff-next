"use client";

import { ArrowLeftIcon, SendIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { NoteMarkdownEditorHandle } from "./markdown-editor";
import { ConflictMergeDialog } from "./conflict-merge-dialog";
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
import { getLatestDraftBodyAction, updateArticleAction } from "../[noteId]/actions";

type SaveStatus =
  | "idle"
  | "saving"
  | "saved"
  | "error"
  | "conflict"
  | "not_found";

const AUTOSAVE_DEBOUNCE_MS = 2000;

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
    revision: number;
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
  const editorRef = useRef<NoteMarkdownEditorHandle>(null);
  const [values, setValues] = useState<ArticleCreateValues>(initialValues);
  const [expectedRevision, setExpectedRevision] = useState<number>(
    article.revision,
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const [lastSavedValues, setLastSavedValues] =
    useState<ArticleCreateValues>(initialValues);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  // 卸载/可见性处理需要读取最新值，用 ref 避免频繁重绑监听器。
  const latestValuesRef = useRef(values);
  const latestRevisionRef = useRef(expectedRevision);
  const latestLastSavedRef = useRef(lastSavedValues);
  const latestSaveStatusRef = useRef(saveStatus);

  useEffect(() => {
    latestValuesRef.current = values;
    latestRevisionRef.current = expectedRevision;
    latestLastSavedRef.current = lastSavedValues;
    latestSaveStatusRef.current = saveStatus;
  }, [values, expectedRevision, lastSavedValues, saveStatus]);

  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

  // ── 冲突合并对话框状态 ──────────────────────────────────────────
  // 当 expectedRevision 与数据库不一致时，自动拉取服务器最新草稿正文
  // 并打开 ConflictMergeDialog。用户合并完成后用 conflictRevision 作为
  // 新的 expectedRevision 重发保存，避免覆盖另一标签页/设备的修改。
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictRevision, setConflictRevision] = useState<number | null>(null);
  const [serverDraft, setServerDraft] = useState<string>("");
  const [conflictLoadError, setConflictLoadError] = useState<string | null>(
    null,
  );
  // 每次打开冲突对话框时递增，作为 ConflictMergeDialog 的 key 强制重挂载，
  // 确保 CodeMirror 与 unifiedMergeView 扩展以全新状态重建。
  const [conflictSessionId, setConflictSessionId] = useState(0);

  // 拉取服务器最新草稿正文并打开冲突合并对话框。保存与发布两条路径
  // 检测到 expectedRevision 冲突时都复用此函数，避免逻辑重复。
  // fallbackRevision 用于 getLatestDraftBodyAction 失败时仍能展示一个
  // 大致的冲突 revision（来自服务端 action 返回的 conflictRevision）。
  const loadServerDraftAndOpenDialog = useCallback(
    async (articleId: string, fallbackRevision: number | null) => {
      setConflictRevision(fallbackRevision);
      setConflictLoadError(null);

      try {
        const latest = await getLatestDraftBodyAction(articleId);
        if (latest.status === "ok") {
          setServerDraft(latest.bodyMarkdown);
          setConflictRevision(latest.revision);
          setConflictSessionId((id) => id + 1);
          setConflictDialogOpen(true);
        } else {
          setConflictLoadError("笔记已不存在，无法获取服务器版本。");
        }
      } catch {
        setConflictLoadError(
          "无法获取服务器最新版本，请检查网络后刷新页面。",
        );
      }
    },
    [],
  );

  const performSave = useCallback(
    async (currentValues: ArticleCreateValues, currentRevision: number) => {
      if (savingRef.current) {
        return;
      }
      savingRef.current = true;
      setSaveStatus("saving");
      setFormError(null);

      const formData = new FormData();
      formData.append("articleId", article.id);
      formData.append("expectedRevision", String(currentRevision));
      formData.append("title", currentValues.title);
      formData.append("bodyMarkdown", currentValues.bodyMarkdown);

      try {
        const result = await updateArticleAction(
          {
            conflictRevision: null,
            fieldErrors: {},
            formError: null,
            savedRevision: null,
            status: "idle",
            values: currentValues,
          },
          formData,
        );

        setFormError(result.formError);
        setSaveStatus(result.status);

        if (result.status === "saved" && result.savedRevision !== null) {
          setExpectedRevision(result.savedRevision);
          setLastSavedValues(currentValues);
          return;
        }

        if (result.status === "conflict") {
          // 拉取服务器最新草稿正文供合并对话框使用。失败时保留 conflict
          // 状态并提示用户手动刷新——不打开对话框以免展示空服务器版本。
          await loadServerDraftAndOpenDialog(article.id, result.conflictRevision);
        }
      } catch {
        setFormError("保存请求未完成，请检查网络后重试。");
        setSaveStatus("error");
      } finally {
        savingRef.current = false;
      }
    },
    [article.id, loadServerDraftAndOpenDialog],
  );

  // 发布流程检测到正文版本冲突时：关闭发布对话框，把状态切到 conflict，
  // 并复用 loadServerDraftAndOpenDialog 拉取服务器草稿、打开合并对话框。
  // 用户合并正文并重新保存后，可以再次打开发布对话框发布。
  const handlePublishConflict = useCallback(
    (conflictRevision: number | null) => {
      setPublishDialogOpen(false);
      setSaveStatus("conflict");
      setFormError(null);
      void loadServerDraftAndOpenDialog(article.id, conflictRevision);
    },
    [article.id, loadServerDraftAndOpenDialog],
  );

  // 用户在冲突合并对话框中点「保存合并结果」后的回调：
  // 1. 用合并后的正文更新 values（触发 NoteBodyEditor 同步）
  // 2. 把 expectedRevision bump 到服务器最新 revision
  // 3. 关闭对话框
  // 4. 立即用新 revision 重发保存（避免再走 debounce 等待）
  const handleResolveConflict = useCallback(
    (mergedBody: string) => {
      if (conflictRevision === null) {
        return;
      }

      const nextValues: ArticleCreateValues = {
        ...values,
        bodyMarkdown: mergedBody,
      };
      setValues(nextValues);
      setExpectedRevision(conflictRevision);
      setConflictDialogOpen(false);
      setConflictRevision(null);
      setServerDraft("");
      setFormError(null);
      setSaveStatus("saving");

      void performSave(nextValues, conflictRevision);
    },
    [conflictRevision, performSave, values],
  );

  useEffect(() => {
    if (valuesEqual(values, lastSavedValues)) {
      return;
    }
    if (saveStatus === "conflict" || saveStatus === "not_found") {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      void performSave(values, expectedRevision);
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [values, lastSavedValues, expectedRevision, saveStatus, performSave]);

  const handleTitleChange = useCallback((title: string) => {
    setValues((prev) => (prev.title === title ? prev : { ...prev, title }));
  }, []);

  const handleBodyChange = useCallback((bodyMarkdown: string) => {
    setValues((prev) =>
      prev.bodyMarkdown === bodyMarkdown ? prev : { ...prev, bodyMarkdown },
    );
  }, []);

  function handleManualSave() {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    void performSave(values, expectedRevision);
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
      if (
        saveStatus === "saving" ||
        saveStatus === "conflict" ||
        saveStatus === "not_found"
      ) {
        return;
      }
      handleManualSave();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // handleManualSave 依赖 values/expectedRevision；通过 ref 取最新值更稳定，
    // 但此处保持简单：随 values 变化重新绑定以保证保存最新内容。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, expectedRevision, saveStatus, performSave]);

  // 离开页面前尽量提交未保存的草稿：
  // - 页面隐藏（切标签/最小化/移动端切换）：立即 flush 未触发的 debounce。
  // - 页面真正卸载（pagehide）：用 keepalive fetch 兜底保存。
  // - beforeunload：若有未保存修改，提示用户。
  useEffect(() => {
    function isDirty() {
      return !valuesEqual(latestValuesRef.current, latestLastSavedRef.current);
    }

    function flushPendingDebounce() {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
        void performSave(latestValuesRef.current, latestRevisionRef.current);
      }
    }

    function handleVisibilityChange() {
      if (document.hidden && isDirty()) {
        const status = latestSaveStatusRef.current;
        if (status !== "conflict" && status !== "not_found") {
          flushPendingDebounce();
        }
      }
    }

    function handlePageHide() {
      if (!isDirty()) {
        return;
      }
      const status = latestSaveStatusRef.current;
      if (status === "conflict" || status === "not_found") {
        return;
      }
      // savingRef.current 为 true 表示正在进行 server action。
      // pagehide 阶段的 server action 可能被浏览器中止，仍以 keepalive fetch 兜底
      // （即使同时有两个保存请求，服务端通过 expectedRevision 乐观锁去重，
      // 较旧请求返回 conflict，新修订仍以最后成功的为准）。
      const formData = new FormData();
      formData.append("articleId", article.id);
      formData.append(
        "expectedRevision",
        String(latestRevisionRef.current),
      );
      formData.append("title", latestValuesRef.current.title);
      formData.append("bodyMarkdown", latestValuesRef.current.bodyMarkdown);

      void fetch(`/api/admin/notes/${article.id}/save`, {
        body: formData,
        keepalive: true,
        method: "POST",
      }).catch(() => {
        // 卸载阶段失败无法恢复，静默处理。
      });
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
    };
  }, [article.id, performSave]);

  const isDirty = !valuesEqual(values, lastSavedValues);

  const statusLabel = (() => {
    switch (saveStatus) {
      case "saving":
        return "保存中…";
      case "saved":
        return isDirty ? "未保存" : "所有更改已保存";
      case "error":
        return formError ?? "保存失败";
      case "conflict":
        return conflictLoadError ?? formError ?? "检测到冲突，正在加载服务器版本…";
      case "not_found":
        return formError ?? "笔记已不存在";
      default:
        return isDirty ? "未保存" : "笔记将自动保存至草稿箱";
    }
  })();

  const isStatusError =
    saveStatus === "error" ||
    saveStatus === "conflict" ||
    saveStatus === "not_found";

  const isPublished = article.publishedAt !== null;

  return (
    <>
      <header className="shrink-0 border-b border-border bg-card text-card-foreground">
        <div className="flex min-h-14 flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Link
              aria-label="返回笔记列表"
              className={buttonVariants({
                className:
                  "h-9 w-9 shrink-0 text-muted-foreground sm:h-7 sm:w-7",
                size: "icon-sm",
                variant: "ghost",
              })}
              href="/admin/notes"
            >
              <ArrowLeftIcon aria-hidden="true" />
            </Link>
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
              isDirty ||
              saveStatus === "saving" ||
              saveStatus === "conflict" ||
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
          revision: expectedRevision,
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
        onConflict={handlePublishConflict}
        onOpenChange={setPublishDialogOpen}
        open={publishDialogOpen}
        tags={tags}
      />

      <ConflictMergeDialog
        key={conflictSessionId}
        localDraft={values.bodyMarkdown}
        onOpenChange={setConflictDialogOpen}
        onResolve={handleResolveConflict}
        open={conflictDialogOpen}
        serverDraft={serverDraft}
      />
    </>
  );
}
