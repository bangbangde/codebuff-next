import {
  articleFieldLimits,
  type ArticleCreateValues,
} from "@/features/articles/article-dto";
import type { ArticleFieldErrors } from "@/features/articles/article-create-form-state";

import { ArticleBodyEditor } from "./article-body-editor";
import type { MarkdownEditorHandle } from "./markdown-editor";

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
  articleId,
  autoFocusTitle = false,
  editorRef,
  fieldErrors,
  onBodyChange,
  onInsertReference,
  onTitleChange,
  values,
}: {
  articleId: string;
  autoFocusTitle?: boolean;
  editorRef: React.RefObject<MarkdownEditorHandle | null>;
  fieldErrors: ArticleFieldErrors;
  onBodyChange?: (value: string) => void;
  onInsertReference: (reference: string) => boolean;
  onTitleChange?: (value: string) => void;
  values: ArticleCreateValues;
}) {
  return (
    <>
      <div className="grid gap-6 rounded-lg border border-border bg-card p-5 shadow-xs sm:p-7">
        <div>
          <label className={labelClassName} htmlFor="title">
            标题
            <span className="ml-2 font-normal text-muted-foreground">可选</span>
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
            onChange={(event) => onTitleChange?.(event.target.value)}
            type="text"
          />
          <FieldError errors={fieldErrors.title} field="title" />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 shadow-xs sm:p-7">
        <div className="flex items-center justify-between">
          <label className={labelClassName} htmlFor="bodyMarkdown">
            Markdown 正文
            <span className="ml-2 font-normal text-muted-foreground">可选</span>
          </label>
        </div>
        <p
          className="mt-2 text-xs leading-5 text-muted-foreground"
          id="bodyMarkdown-help"
        >
          支持 Markdown 语法，可在编辑、分屏、预览模式间切换。文章资产使用稳定的{" "}
          <code className="font-mono">cq-asset://</code> 引用。
        </p>
        <div className="mt-3">
          <ArticleBodyEditor
            articleId={articleId}
            defaultValue={values.bodyMarkdown}
            editorRef={editorRef}
            onInsertReference={onInsertReference}
            onValueChange={onBodyChange}
          />
        </div>
        <FieldError errors={fieldErrors.bodyMarkdown} field="bodyMarkdown" />
      </div>
    </>
  );
}
