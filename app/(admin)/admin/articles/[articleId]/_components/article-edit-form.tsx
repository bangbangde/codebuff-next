"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { ArticleFields } from "@/app/(admin)/admin/articles/_components/article-fields";
import type { MarkdownEditorHandle } from "@/app/(admin)/admin/articles/_components/markdown-editor";
import { Button, buttonVariants } from "@/components/ui/button";
import type { ArticleAsset } from "@/features/article-assets/article-asset-dto";
import type { ArticleFieldErrors } from "@/features/articles/article-create-form-state";
import type { ArticleCreateValues } from "@/features/articles/article-dto";
import { cn } from "@/lib/utils";
import { ArticleAssetPanel } from "../../_components/article-asset-panel";
import { updateArticleAction } from "../actions";

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

export function ArticleEditForm({
  article,
  assets,
  values: initialValues,
}: {
  article: {
    id: string;
    revision: number;
  };
  assets: readonly ArticleAsset[];
  values: ArticleCreateValues;
}) {
  const editorRef = useRef<MarkdownEditorHandle>(null);
  const [values, setValues] = useState<ArticleCreateValues>(initialValues);
  const [expectedRevision, setExpectedRevision] = useState<number>(
    article.revision,
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ArticleFieldErrors>({});
  const [conflictRevision, setConflictRevision] = useState<number | null>(null);

  // 上次成功保存（或初始）的值，用于判断 dirty
  const [lastSavedValues, setLastSavedValues] =
    useState<ArticleCreateValues>(initialValues);
  // 防抖计时器
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 防止并发保存
  const savingRef = useRef(false);

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

      savingRef.current = false;

      setFieldErrors(result.fieldErrors);
      setFormError(result.formError);
      setConflictRevision(result.conflictRevision);
      setSaveStatus(result.status);

      if (result.status === "saved" && result.savedRevision !== null) {
        setExpectedRevision(result.savedRevision);
        setLastSavedValues(currentValues);
      }
    },
    [article.id],
  );

  // 防抖自动保存：values 变化且 dirty 时启动
  useEffect(() => {
    if (valuesEqual(values, lastSavedValues)) {
      return;
    }
    // 冲突或文章不存在时停止自动保存，等用户显式处理
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

  function handleInsertReference(reference: string) {
    const editor = editorRef.current;

    if (!editor) {
      return false;
    }

    editor.insertText(reference);

    return true;
  }

  const isDirty = !valuesEqual(values, lastSavedValues);

  const statusLabel = (() => {
    switch (saveStatus) {
      case "saving":
        return "保存中…";
      case "saved":
        return isDirty ? "正在保存…" : "所有更改已保存";
      case "error":
        return formError ?? "保存失败，请稍后重试";
      case "conflict":
        return formError ?? "检测到冲突，请重新载入";
      case "not_found":
        return formError ?? "这篇文章已不存在";
      default:
        return null;
    }
  })();

  const isStatusError =
    saveStatus === "error" ||
    saveStatus === "conflict" ||
    saveStatus === "not_found";

  return (
    <div className="mt-8 grid gap-8">
      <form
        className="grid gap-8"
        id="article-edit-form"
        onSubmit={(event) => {
          event.preventDefault();
          handleManualSave();
        }}
      >
        <input name="articleId" type="hidden" value={article.id} />
        <input
          name="expectedRevision"
          type="hidden"
          value={expectedRevision}
        />

        <ArticleFields
          articleId={article.id}
          editorRef={editorRef}
          fieldErrors={fieldErrors}
          onBodyChange={handleBodyChange}
          onInsertReference={handleInsertReference}
          onTitleChange={handleTitleChange}
          values={values}
        />
      </form>

      <ArticleAssetPanel
        articleId={article.id}
        assets={assets}
        onInsertReference={handleInsertReference}
      />

      <div className="sticky bottom-0 -mx-5 grid gap-3 border-t border-border bg-background/95 px-5 py-4 backdrop-blur-sm supports-backdrop-filter:bg-background/85 sm:-mx-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-8">
        <div>
          {statusLabel ? (
            <p
              aria-live="polite"
              className={cn(
                "min-h-5 text-sm",
                isStatusError ? "text-destructive" : "text-muted-foreground",
              )}
              role={isStatusError ? "alert" : "status"}
            >
              {statusLabel}
            </p>
          ) : null}
          {conflictRevision ? (
            <a
              className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-foreground underline underline-offset-4"
              href={`/admin/articles/${article.id}`}
            >
              重新载入数据库版本（草稿修订 {conflictRevision}）
            </a>
          ) : null}
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Link
            className={buttonVariants({
              className: "w-full sm:w-auto",
              variant: "outline",
            })}
            href="/admin/articles"
          >
            返回列表
          </Link>
          <Button
            className="w-full sm:w-auto"
            disabled={
              saveStatus === "saving" ||
              saveStatus === "conflict" ||
              saveStatus === "not_found" ||
              !isDirty
            }
            form="article-edit-form"
            type="submit"
          >
            {saveStatus === "saving" ? "保存中…" : "保存更改"}
          </Button>
        </div>
      </div>
    </div>
  );
}
