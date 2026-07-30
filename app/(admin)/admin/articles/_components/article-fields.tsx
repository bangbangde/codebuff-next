import {
  articleFieldLimits,
  articleLanguages,
  type ArticleCreateValues,
} from "@/features/articles/article-dto";
import type { ArticleFieldErrors } from "@/features/articles/article-create-form-state";
import type { MediaReferenceOption } from "@/features/articles/article-media-reference";
import { cn } from "@/lib/utils";
import { ArticleMediaPicker } from "./article-media-picker";

const inputClassName =
  "mt-2 block min-h-(--control-height) w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-(--motion-duration) ease-(--motion-easing) placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15 motion-reduce:transition-none";

const labelClassName = "block text-sm font-medium text-foreground";

function FieldError({
  errors,
  field,
}: {
  errors: ArticleFieldErrors[keyof ArticleCreateValues];
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
  errors: ArticleFieldErrors[keyof ArticleCreateValues],
  helpId?: string,
) {
  const ids = [helpId, errors?.length ? `${field}-error` : null]
    .filter(Boolean)
    .join(" ");

  return ids || undefined;
}

export function ArticleFields({
  autoFocusTitle = false,
  fieldErrors,
  mediaOptions,
  values,
}: {
  autoFocusTitle?: boolean;
  fieldErrors: ArticleFieldErrors;
  mediaOptions: readonly MediaReferenceOption[];
  values: ArticleCreateValues;
}) {
  return (
    <>
      <div className="grid gap-6 rounded-lg border border-border bg-card p-5 shadow-xs sm:p-7">
        <div>
          <label className={labelClassName} htmlFor="title">
            标题
          </label>
          <input
            aria-describedby={describedBy("title", fieldErrors.title)}
            aria-invalid={Boolean(fieldErrors.title?.length)}
            autoFocus={autoFocusTitle}
            className={inputClassName}
            defaultValue={values.title}
            id="title"
            maxLength={articleFieldLimits.title}
            name="title"
            required
            type="text"
          />
          <FieldError errors={fieldErrors.title} field="title" />
        </div>

        <div>
          <label className={labelClassName} htmlFor="slug">
            Slug
          </label>
          <input
            aria-describedby={describedBy(
              "slug",
              fieldErrors.slug,
              "slug-help",
            )}
            aria-invalid={Boolean(fieldErrors.slug?.length)}
            autoCapitalize="none"
            autoComplete="off"
            className={cn(inputClassName, "font-mono")}
            defaultValue={values.slug}
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
          <FieldError errors={fieldErrors.slug} field="slug" />
        </div>

        <div>
          <label className={labelClassName} htmlFor="summary">
            摘要
            <span className="ml-2 font-normal text-muted-foreground">
              可选
            </span>
          </label>
          <textarea
            aria-describedby={describedBy("summary", fieldErrors.summary)}
            aria-invalid={Boolean(fieldErrors.summary?.length)}
            className={cn(inputClassName, "min-h-24 resize-y")}
            defaultValue={values.summary}
            id="summary"
            maxLength={articleFieldLimits.summary}
            name="summary"
            rows={4}
          />
          <FieldError errors={fieldErrors.summary} field="summary" />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className={labelClassName} htmlFor="kind">
              类型
            </label>
            <input
              aria-describedby={describedBy("kind", fieldErrors.kind)}
              aria-invalid={Boolean(fieldErrors.kind?.length)}
              className={inputClassName}
              defaultValue={values.kind}
              id="kind"
              maxLength={articleFieldLimits.kind}
              name="kind"
              placeholder="例如：工程札记"
              required
              type="text"
            />
            <FieldError errors={fieldErrors.kind} field="kind" />
          </div>

          <div>
            <label className={labelClassName} htmlFor="language">
              语言
            </label>
            <select
              aria-describedby={describedBy(
                "language",
                fieldErrors.language,
              )}
              aria-invalid={Boolean(fieldErrors.language?.length)}
              className={inputClassName}
              defaultValue={values.language}
              id="language"
              name="language"
            >
              {articleLanguages.map((language) => (
                <option key={language} value={language}>
                  {language === "zh-CN" ? "简体中文" : "English"}
                </option>
              ))}
            </select>
            <FieldError errors={fieldErrors.language} field="language" />
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
          当前仅保存原始 Markdown，不提供预览或发布。托管媒体使用稳定的{" "}
          <code className="font-mono">cq-media://</code> 引用。
        </p>
        <ArticleMediaPicker mediaOptions={mediaOptions} />
        <textarea
          aria-describedby={describedBy(
            "bodyMarkdown",
            fieldErrors.bodyMarkdown,
            "bodyMarkdown-help",
          )}
          aria-invalid={Boolean(fieldErrors.bodyMarkdown?.length)}
          className={cn(
            inputClassName,
            "min-h-80 resize-y font-mono leading-6 sm:min-h-96",
          )}
          defaultValue={values.bodyMarkdown}
          id="bodyMarkdown"
          maxLength={articleFieldLimits.bodyMarkdown}
          name="bodyMarkdown"
          placeholder="# 从这里开始"
          rows={18}
          spellCheck={false}
        />
        <FieldError errors={fieldErrors.bodyMarkdown} field="bodyMarkdown" />
      </div>
    </>
  );
}
