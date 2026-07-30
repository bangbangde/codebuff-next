"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { ArticleFields } from "@/app/(admin)/admin/articles/_components/article-fields";
import { initialArticleCreateFormState } from "@/features/articles/article-create-form-state";
import { cn } from "@/lib/utils";
import { createArticleAction } from "../actions";

export function ArticleCreateForm() {
  const [state, formAction, pending] = useActionState(
    createArticleAction,
    initialArticleCreateFormState,
  );

  return (
    <form action={formAction} className="mt-8 grid gap-8">
      <ArticleFields
        autoFocusTitle
        fieldErrors={state.fieldErrors}
        values={state.values}
      />

      <div className="sticky bottom-0 -mx-5 grid gap-3 border-t border-border bg-background/95 px-5 py-4 backdrop-blur-sm supports-backdrop-filter:bg-background/85 sm:-mx-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-8">
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
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Link
            className={buttonVariants({
              className: "w-full sm:w-auto",
              variant: "outline",
            })}
            href="/admin/articles"
          >
            取消
          </Link>
          <Button className="w-full sm:w-auto" disabled={pending} type="submit">
            {pending ? "保存中…" : "保存未发布文章"}
          </Button>
        </div>
      </div>
    </form>
  );
}
