"use client";

import { ExternalLinkIcon, SaveIcon, SendIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { MarkdownEditorHandle } from "./markdown-editor";
import { ArticleBodyEditor } from "./article-body-editor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ArticleAsset } from "@/features/article-assets/article-asset-dto";
import type {
  CategoryOption,
  TagOption,
} from "@/features/articles/article-dto";
import type { ArticleCreateValues } from "@/features/articles/article-dto";
import { AssetDialog } from "./asset-dialog";
import { PublishDialog } from "./publish-dialog";
import { updateArticleAction } from "../[articleId]/actions";

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

export function ArticleEditor({
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
  const editorRef = useRef<MarkdownEditorHandle>(null);
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

  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
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

  const handleInsertReference = useCallback((reference: string) => {
    const editor = editorRef.current;
    if (!editor) {
      return false;
    }
    editor.insertText(reference);
    return true;
  }, []);

  function handleManualSave() {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    void performSave(values, expectedRevision);
  }

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
        return formError ?? "文章已不存在";
      default:
        return "文章将自动保存至草稿箱";
    }
  })();

  const isStatusError =
    saveStatus === "error" ||
    saveStatus === "conflict" ||
    saveStatus === "not_found";

  const isPublished = article.publishedAt !== null;

  return (
    <>
      <header className="flex shrink-0 flex-col gap-2 border-b border-border bg-background px-3 py-2 sm:h-14 sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-0">
        <input
          aria-label="文章标题"
          className="h-9 w-full min-w-0 border-0 bg-transparent text-base font-medium text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-0 sm:h-auto sm:flex-1"
          onChange={(event) => handleTitleChange(event.target.value)}
          placeholder="输入文章标题…"
          value={values.title}
        />

        <div className="flex w-full min-w-0 shrink-0 items-center gap-2 sm:w-auto">
          <span
            aria-live="polite"
            className={cn(
              "mr-auto min-w-0 truncate text-xs sm:mr-0 sm:max-w-56",
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
            onClick={() => setAssetDialogOpen(true)}
            size="sm"
            type="button"
            variant="outline"
          >
            资源
          </Button>

          <Button
            disabled={
              saveStatus === "saving" ||
              saveStatus === "conflict" ||
              saveStatus === "not_found" ||
              !isDirty
            }
            onClick={handleManualSave}
            size="sm"
            type="button"
          >
            <SaveIcon aria-hidden="true" />
            保存
          </Button>

          <Button
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

          <Link
            aria-label="返回文章列表"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            href="/admin/articles"
          >
            <ExternalLinkIcon aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </header>

      <ArticleBodyEditor
        articleId={article.id}
        defaultValue={values.bodyMarkdown}
        editorRef={editorRef}
        onInsertReference={handleInsertReference}
        onValueChange={handleBodyChange}
      />

      <AssetDialog
        articleId={article.id}
        assets={assets}
        onInsertReference={handleInsertReference}
        onOpenChange={setAssetDialogOpen}
        open={assetDialogOpen}
      />

      <PublishDialog
        article={{
          id: article.id,
          revision: expectedRevision,
          publishedAt: article.publishedAt,
          publishedFromRevision: article.publishedFromRevision,
        }}
        assets={assets}
        categories={categories}
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
