"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  initialArticleCreateFormState,
  type ArticleCreateFieldErrors,
} from "@/features/articles/article-create-form-state";
import {
  articleFieldLimits,
  articleLanguages,
  type ArticleCreateValues,
} from "@/features/articles/article-dto";
import { cn } from "@/lib/utils";
import { createArticleAction } from "../actions";

const inputClassName =
  "mt-2 block min-h-(--control-height) w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-(--motion-duration) ease-(--motion-easing) placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15 motion-reduce:transition-none";

const labelClassName = "block text-sm font-medium text-foreground";

function FieldError({
  errors,
  field,
}: {
  errors: ArticleCreateFieldErrors[keyof ArticleCreateValues];
  field: keyof ArticleCreateValues;
}) {
  if (!errors?.length) {
    return null;
  }

  return (
    <p className="mt-2 text-sm text-destructive" id={`${field}-error`}>
      {errors[0]}
    </p>
  );
}

function describedBy(
  field: keyof ArticleCreateValues,
  errors: ArticleCreateFieldErrors[keyof ArticleCreateValues],
  helpId?: string,
) {
  const ids = [helpId, errors?.length ? `${field}-error` : null]
    .filter(Boolean)
    .join(" ");

  return ids || undefined;
}

export function ArticleCreateForm() {
  const [state, formAction, pending] = useActionState(
    createArticleAction,
    initialArticleCreateFormState,
  );

  return (
    <form action={formAction} className="mt-8 grid gap-8">
      <div className="grid gap-6 rounded-lg border border-border bg-card p-5 shadow-xs sm:p-7">
        <div>
          <label className={labelClassName} htmlFor="title">
            标题
          </label>
          <input
            aria-describedby={describedBy("title", state.fieldErrors.title)}
            aria-invalid={Boolean(state.fieldErrors.title?.length)}
            autoFocus
            className={inputClassName}
            defaultValue={state.values.title}
            id="title"
            maxLength={articleFieldLimits.title}
            name="title"
            required
            type="text"
          />
          <FieldError errors={state.fieldErrors.title} field="title" />
        </div>

        <div>
          <label className={labelClassName} htmlFor="slug">
            Slug
          </label>
          <input
            aria-describedby={describedBy(
              "slug",
              state.fieldErrors.slug,
              "slug-help",
            )}
            aria-invalid={Boolean(state.fieldErrors.slug?.length)}
            autoCapitalize="none"
            autoComplete="off"
            className={cn(inputClassName, "font-mono")}
            defaultValue={state.values.slug}
            id="slug"
            maxLength={articleFieldLimits.slug}
            name="slug"
            placeholder="my-article-slug"
            required
            spellCheck={false}
            type="text"
          />
          <p
            className="mt-2 text-xs leading-5 text-muted-foreground"
            id="slug-help"
          >
            保存时会移除首尾空格并转为小写；仅支持字母、数字和单个连字符。
          </p>
          <FieldError errors={state.fieldErrors.slug} field="slug" />
        </div>

        <div>
          <label className={labelClassName} htmlFor="summary">
            摘要
            <span className="ml-2 font-normal text-muted-foreground">
              可选
            </span>
          </label>
          <textarea
            aria-describedby={describedBy(
              "summary",
              state.fieldErrors.summary,
            )}
            aria-invalid={Boolean(state.fieldErrors.summary?.length)}
            className={cn(inputClassName, "min-h-24 resize-y")}
            defaultValue={state.values.summary}
            id="summary"
            maxLength={articleFieldLimits.summary}
            name="summary"
            rows={4}
          />
          <FieldError errors={state.fieldErrors.summary} field="summary" />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className={labelClassName} htmlFor="kind">
              类型
            </label>
            <input
              aria-describedby={describedBy("kind", state.fieldErrors.kind)}
              aria-invalid={Boolean(state.fieldErrors.kind?.length)}
              className={inputClassName}
              defaultValue={state.values.kind}
              id="kind"
              maxLength={articleFieldLimits.kind}
              name="kind"
              placeholder="例如：工程札记"
              required
              type="text"
            />
            <FieldError errors={state.fieldErrors.kind} field="kind" />
          </div>

          <div>
            <label className={labelClassName} htmlFor="language">
              语言
            </label>
            <select
              aria-describedby={describedBy(
                "language",
                state.fieldErrors.language,
              )}
              aria-invalid={Boolean(state.fieldErrors.language?.length)}
              className={inputClassName}
              defaultValue={state.values.language}
              id="language"
              name="language"
            >
              {articleLanguages.map((language) => (
                <option key={language} value={language}>
                  {language === "zh-CN" ? "简体中文" : "English"}
                </option>
              ))}
            </select>
            <FieldError errors={state.fieldErrors.language} field="language" />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 shadow-xs sm:p-7">
        <label className={labelClassName} htmlFor="bodyMarkdown">
          Markdown 正文
          <span className="ml-2 font-normal text-muted-foreground">可选</span>
        </label>
        <p
          className="mt-2 text-xs leading-5 text-muted-foreground"
          id="bodyMarkdown-help"
        >
          当前仅保存原始 Markdown，不提供预览或发布。
        </p>
        <textarea
          aria-describedby={describedBy(
            "bodyMarkdown",
            state.fieldErrors.bodyMarkdown,
            "bodyMarkdown-help",
          )}
          aria-invalid={Boolean(state.fieldErrors.bodyMarkdown?.length)}
          className={cn(
            inputClassName,
            "min-h-80 resize-y font-mono leading-6 sm:min-h-96",
          )}
          defaultValue={state.values.bodyMarkdown}
          id="bodyMarkdown"
          maxLength={articleFieldLimits.bodyMarkdown}
          name="bodyMarkdown"
          placeholder="# 从这里开始"
          rows={18}
          spellCheck={false}
        />
        <FieldError
          errors={state.fieldErrors.bodyMarkdown}
          field="bodyMarkdown"
        />
      </div>

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
