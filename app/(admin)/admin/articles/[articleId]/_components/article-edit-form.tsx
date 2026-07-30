"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";

import { ArticleFields } from "@/app/(admin)/admin/articles/_components/article-fields";
import { ArticleTaxonomyFields } from "@/app/(admin)/admin/articles/_components/article-taxonomy-fields";
import { Button, buttonVariants } from "@/components/ui/button";
import type { ArticleAsset } from "@/features/article-assets/article-asset-dto";
import type {
  ArticleCreateValues,
  CategoryOption,
  TagOption,
} from "@/features/articles/article-dto";
import type { ArticleEditFormState } from "@/features/articles/article-edit-form-state";
import { cn } from "@/lib/utils";
import { ArticleAssetPanel } from "../../_components/article-asset-panel";
import { updateArticleAction } from "../actions";

export function ArticleEditForm({
  article,
  assets,
  categories,
  tags,
  values,
}: {
  article: {
    id: string;
    revision: number;
  };
  assets: readonly ArticleAsset[];
  categories: readonly CategoryOption[];
  tags: readonly TagOption[];
  values: ArticleCreateValues;
}) {
  const initialState: ArticleEditFormState = {
    conflictRevision: null,
    fieldErrors: {},
    formError: null,
    values,
  };
  const [state, formAction, pending] = useActionState(
    updateArticleAction,
    initialState,
  );
  const bodyMarkdownRef = useRef<HTMLTextAreaElement>(null);

  function handleInsertReference(reference: string) {
    const textarea = bodyMarkdownRef.current;

    if (!textarea) {
      return false;
    }

    const selectionStart = textarea.selectionStart;
    const needsLeadingBreak =
      selectionStart > 0 && textarea.value[selectionStart - 1] !== "\n";
    const insertion = `${needsLeadingBreak ? "\n\n" : ""}${reference}\n\n`;

    textarea.setRangeText(
      insertion,
      selectionStart,
      textarea.selectionEnd,
      "end",
    );
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.focus();

    return true;
  }

  return (
    <div className="mt-8 grid gap-8">
      <form action={formAction} className="grid gap-8" id="article-edit-form">
        <input name="articleId" type="hidden" value={article.id} />
        <input
          name="expectedRevision"
          type="hidden"
          value={article.revision}
        />

        <ArticleFields
          bodyMarkdownRef={bodyMarkdownRef}
          fieldErrors={state.fieldErrors}
          taxonomy={
            <ArticleTaxonomyFields
              categories={categories}
              initialCategoryName={state.values.categoryName}
              initialTagNames={state.values.tagNames}
              tags={tags}
            />
          }
          values={state.values}
        />
      </form>

      <ArticleAssetPanel
        articleId={article.id}
        assets={assets}
        onInsertReference={handleInsertReference}
      />

      <div className="sticky bottom-0 -mx-5 grid gap-3 border-t border-border bg-background/95 px-5 py-4 backdrop-blur-sm supports-backdrop-filter:bg-background/85 sm:-mx-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-8">
        <div>
          <p
            aria-live="polite"
            className={cn(
              "min-h-5 text-sm",
              state.formError ? "text-destructive" : "text-muted-foreground",
            )}
            role={state.formError ? "alert" : "status"}
          >
            {state.formError}
          </p>
          {state.conflictRevision ? (
            <a
              className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-foreground underline underline-offset-4"
              href={`/admin/articles/${article.id}`}
            >
              重新载入数据库版本（修订 {state.conflictRevision}）
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
            disabled={pending}
            form="article-edit-form"
            type="submit"
          >
            {pending ? "保存中…" : "保存更改"}
          </Button>
        </div>
      </div>
    </div>
  );
}
