"use client";

import { ArrowLeftIcon, SendIcon } from "lucide-react";
import Link from "next/link";
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
        }
      } catch {
        setFormError("保存请求未完成，请检查网络后重试。");
        setSaveStatus("error");
      } finally {
        savingRef.current = false;
      }
    },
    [article.id],
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
      if (status === "conflict" || status === "not_found" || savingRef.current) {
        return;
      }
      const formData = new FormData();
      formData.append("articleId", article.id);
      formData.append(
        "expectedRevision",
        String(latestRevisionRef.current),
      );
      formData.append("title", latestValuesRef.current.title);
      formData.append("bodyMarkdown", latestValuesRef.current.bodyMarkdown);

      // keepalive 让请求在页面卸载后仍有机会完成。
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
        return isDirty ? "正在保存…" : "所有更改已保存";
      case "error":
        return formError ?? "保存失败";
      case "conflict":
        return formError ?? "检测到冲突";
      case "not_found":
        return formError ?? "笔记已不存在";
      default:
        return "笔记将自动保存至草稿箱";
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
        onOpenChange={setPublishDialogOpen}
        open={publishDialogOpen}
        tags={tags}
      />
    </>
  );
}
