"use client";

import Link from "next/link";
import { useActionState } from "react";

import { ArticleFields } from "@/app/(admin)/admin/articles/_components/article-fields";
import { Button, buttonVariants } from "@/components/ui/button";
import type {
  ArticleCreateValues,
  ArticleDetail,
} from "@/features/articles/article-dto";
import type { ArticleEditFormState } from "@/features/articles/article-edit-form-state";
import { cn } from "@/lib/utils";
import { updateArticleAction } from "../actions";

export function ArticleEditForm({
  article,
  values,
}: {
  article: ArticleDetail;
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

  return (
    <form action={formAction} className="mt-8 grid gap-8">
      <input name="articleId" type="hidden" value={article.id} />
      <input
        name="expectedRevision"
        type="hidden"
        value={article.revision}
      />

      <ArticleFields fieldErrors={state.fieldErrors} values={state.values} />

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
          <Button className="w-full sm:w-auto" disabled={pending} type="submit">
            {pending ? "保存中…" : "保存更改"}
          </Button>
        </div>
      </div>
    </form>
  );
}
