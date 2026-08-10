"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  LoaderCircleIcon,
  PinIcon,
  SaveIcon,
  XIcon,
} from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  updateAboutAction,
  updateLatestNotesAction,
  updateNowAction,
} from "../actions";
import type {
  HomeLatestNotesFormState,
  HomeMarkdownFormState,
} from "../form-state";
import type {
  AdminHomeLatestNotesViewModel,
  AdminHomeNoteOption,
} from "../view-model";

const fieldClassName =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-(--motion-duration) ease-(--motion-easing) placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none";

function FormFeedback({
  dirty,
  formError,
  pending,
  status,
}: {
  dirty: boolean;
  formError: string | null;
  pending: boolean;
  status: HomeMarkdownFormState["status"];
}) {
  if (pending) {
    return (
      <p aria-live="polite" className="text-sm text-muted-foreground">
        正在保存…
      </p>
    );
  }

  if (status === "error") {
    return (
      <p className="text-sm text-destructive" role="alert">
        {formError}
      </p>
    );
  }

  if (status === "saved" && !dirty) {
    return (
      <p aria-live="polite" className="text-sm text-brand-ink" role="status">
        已保存。
      </p>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      {dirty ? "有未保存的更改。" : "内容已与服务器同步。"}
    </p>
  );
}

function MarkdownSectionForm({
  description,
  formAction,
  initialMarkdown,
  pending,
  sectionId,
  state,
  submitLabel,
  title,
}: {
  description: string;
  formAction: (formData: FormData) => void;
  initialMarkdown: string;
  pending: boolean;
  sectionId: string;
  state: HomeMarkdownFormState;
  submitLabel: string;
  title: string;
}) {
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const dirty = markdown !== state.savedMarkdown;
  const fieldError = state.fieldErrors.markdown?.[0];
  const descriptionId = `${sectionId}-description`;
  const errorId = `${sectionId}-error`;

  return (
    <section
      aria-labelledby={`${sectionId}-title`}
      className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground"
    >
      <div className="border-b border-border bg-muted/35 px-5 py-5 sm:px-6">
        <h2
          className="text-lg font-semibold tracking-[-0.025em]"
          id={`${sectionId}-title`}
          lang="en"
        >
          {title}
        </h2>
        <p
          className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground"
          id={descriptionId}
        >
          {description}
        </p>
      </div>
      <form action={formAction} className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
        <div>
          <label
            className="text-sm font-medium"
            htmlFor={`${sectionId}-markdown`}
          >
            Markdown 内容
          </label>
          <textarea
            aria-describedby={
              fieldError ? `${descriptionId} ${errorId}` : descriptionId
            }
            aria-invalid={Boolean(fieldError)}
            className={cn(fieldClassName, "mt-2 min-h-48 resize-y font-mono leading-6")}
            disabled={pending}
            id={`${sectionId}-markdown`}
            name="markdown"
            onChange={(event) => setMarkdown(event.target.value)}
            spellCheck={false}
            value={markdown}
          />
          {fieldError ? (
            <p className="mt-2 text-sm text-destructive" id={errorId}>
              {fieldError}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <FormFeedback
            dirty={dirty}
            formError={state.formError}
            pending={pending}
            status={state.status}
          />
          <Button disabled={pending || !dirty} type="submit">
            {pending ? (
              <LoaderCircleIcon aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
            ) : (
              <SaveIcon aria-hidden="true" />
            )}
            {pending ? "保存中…" : submitLabel}
          </Button>
        </div>
      </form>
    </section>
  );
}

export function NowForm({ initialMarkdown }: { initialMarkdown: string }) {
  const initialState: HomeMarkdownFormState = {
    fieldErrors: {},
    formError: null,
    savedMarkdown: initialMarkdown,
    status: "idle",
  };
  const [state, formAction, pending] = useActionState(
    updateNowAction,
    initialState,
  );

  return (
    <MarkdownSectionForm
      description="编辑公开首页当前关注与实践方向。支持 Markdown，保存不会影响其他首页板块。"
      formAction={formAction}
      initialMarkdown={initialMarkdown}
      pending={pending}
      sectionId="home-now"
      state={state}
      submitLabel="保存 Now"
      title="Now"
    />
  );
}

export function AboutForm({ initialMarkdown }: { initialMarkdown: string }) {
  const initialState: HomeMarkdownFormState = {
    fieldErrors: {},
    formError: null,
    savedMarkdown: initialMarkdown,
    status: "idle",
  };
  const [state, formAction, pending] = useActionState(
    updateAboutAction,
    initialState,
  );

  return (
    <MarkdownSectionForm
      description="编辑公开首页的个人介绍正文。支持 Markdown，联系链接仍由公开页面结构维护。"
      formAction={formAction}
      initialMarkdown={initialMarkdown}
      pending={pending}
      sectionId="home-about"
      state={state}
      submitLabel="保存 About"
      title="About"
    />
  );
}

function arraysEqual(left: readonly string[], right: readonly string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function NoteOrderControls({
  index,
  note,
  pending,
  total,
  onMove,
  onUnpin,
}: {
  index: number;
  note: AdminHomeNoteOption | undefined;
  pending: boolean;
  total: number;
  onMove: (from: number, to: number) => void;
  onUnpin: (noteId: string) => void;
}) {
  const title = note?.title ?? "不可用的笔记";
  const noteId = note?.id;

  if (!noteId) {
    return null;
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        aria-label={`上移：${title}`}
        disabled={pending || index === 0}
        onClick={() => onMove(index, index - 1)}
        size="icon-sm"
        type="button"
        variant="outline"
      >
        <ArrowUpIcon aria-hidden="true" />
      </Button>
      <Button
        aria-label={`下移：${title}`}
        disabled={pending || index === total - 1}
        onClick={() => onMove(index, index + 1)}
        size="icon-sm"
        type="button"
        variant="outline"
      >
        <ArrowDownIcon aria-hidden="true" />
      </Button>
      <Button
        aria-label={`取消置顶：${title}`}
        disabled={pending}
        onClick={() => onUnpin(noteId)}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <XIcon aria-hidden="true" />
      </Button>
    </div>
  );
}

export function LatestNotesForm({
  viewModel,
}: {
  viewModel: AdminHomeLatestNotesViewModel;
}) {
  const initialState: HomeLatestNotesFormState = {
    fieldErrors: {},
    formError: null,
    savedDisplayLimit: viewModel.displayLimit,
    savedPinnedNoteIds: viewModel.pinnedNoteIds,
    status: "idle",
  };
  const [state, formAction, pending] = useActionState(
    updateLatestNotesAction,
    initialState,
  );
  const [displayLimit, setDisplayLimit] = useState(
    String(viewModel.displayLimit),
  );
  const [pinnedNoteIds, setPinnedNoteIds] = useState<string[]>([
    ...viewModel.pinnedNoteIds,
  ]);
  const notesById = useMemo(
    () => new Map(viewModel.notes.map((note) => [note.id, note])),
    [viewModel.notes],
  );
  const availableNotes = viewModel.notes.filter(
    (note) => !pinnedNoteIds.includes(note.id),
  );
  const dirty =
    Number(displayLimit) !== state.savedDisplayLimit ||
    !arraysEqual(pinnedNoteIds, state.savedPinnedNoteIds);
  const displayLimitError = state.fieldErrors.displayLimit?.[0];
  const pinnedNotesError = state.fieldErrors.pinnedNoteIds?.[0];

  function movePinnedNote(from: number, to: number) {
    setPinnedNoteIds((current) => {
      if (to < 0 || to >= current.length) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(from, 1);

      if (!moved) {
        return current;
      }

      next.splice(to, 0, moved);
      return next;
    });
  }

  function pinNote(noteId: string) {
    setPinnedNoteIds((current) =>
      current.includes(noteId) ? current : [...current, noteId],
    );
  }

  return (
    <section
      aria-labelledby="home-latest-notes-title"
      className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground"
    >
      <div className="border-b border-border bg-muted/35 px-5 py-5 sm:px-6">
        <h2
          className="text-lg font-semibold tracking-[-0.025em]"
          id="home-latest-notes-title"
          lang="en"
        >
          Latest Notes
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
          设置公开首页展示数量，并从已发布笔记中选择置顶项及其顺序。
        </p>
      </div>
      <form action={formAction} className="space-y-7 px-5 py-5 sm:px-6 sm:py-6">
        <div>
          <label className="text-sm font-medium" htmlFor="home-display-limit">
            展示数量
          </label>
          <p
            className="mt-1 text-sm leading-6 text-muted-foreground"
            id="home-display-limit-description"
          >
            包含置顶与自动补齐的笔记，共 1–20 篇。
          </p>
          <input
            aria-describedby={
              displayLimitError
                ? "home-display-limit-description home-display-limit-error"
                : "home-display-limit-description"
            }
            aria-invalid={Boolean(displayLimitError)}
            className={cn(fieldClassName, "mt-2 h-10 w-28 tabular-nums")}
            disabled={pending}
            id="home-display-limit"
            inputMode="numeric"
            max={20}
            min={1}
            name="displayLimit"
            onChange={(event) => setDisplayLimit(event.target.value)}
            step={1}
            type="number"
            value={displayLimit}
          />
          {displayLimitError ? (
            <p
              className="mt-2 text-sm text-destructive"
              id="home-display-limit-error"
            >
              {displayLimitError}
            </p>
          ) : null}
        </div>

        <fieldset>
          <legend className="text-sm font-medium">置顶顺序</legend>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            置顶笔记优先展示；使用上移和下移按钮调整顺序。
          </p>
          {pinnedNoteIds.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
              暂无置顶笔记，公开首页将按现有发布顺序自动补齐。
            </p>
          ) : (
            <ol className="mt-3 divide-y divide-border rounded-lg border border-border">
              {pinnedNoteIds.map((noteId, index) => {
                const note = notesById.get(noteId);
                const option = note ?? {
                  id: noteId,
                  title: `不可用的笔记（${noteId}）`,
                };

                return (
                  <li
                    className="flex min-w-0 items-center gap-3 px-3 py-3 sm:px-4"
                    key={noteId}
                  >
                    <span className="w-6 shrink-0 text-center font-mono text-xs text-muted-foreground tabular-nums">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 break-words text-sm font-medium">
                      {option.title}
                    </span>
                    <NoteOrderControls
                      index={index}
                      note={option}
                      onMove={movePinnedNote}
                      onUnpin={(id) =>
                        setPinnedNoteIds((current) =>
                          current.filter((candidate) => candidate !== id),
                        )
                      }
                      pending={pending}
                      total={pinnedNoteIds.length}
                    />
                    <input name="pinnedNoteIds" type="hidden" value={noteId} />
                  </li>
                );
              })}
            </ol>
          )}
          {pinnedNotesError ? (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {pinnedNotesError}
            </p>
          ) : null}
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium">可置顶的已发布笔记</legend>
          {availableNotes.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
              {viewModel.notes.length === 0
                ? "还没有可置顶的已发布笔记。"
                : "所有已发布笔记都已置顶。"}
            </p>
          ) : (
            <ul className="mt-3 max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {availableNotes.map((note) => (
                <li
                  className="flex min-w-0 items-center justify-between gap-3 px-3 py-3 sm:px-4"
                  key={note.id}
                >
                  <span className="min-w-0 break-words text-sm">
                    {note.title}
                  </span>
                  <Button
                    aria-label={`置顶：${note.title}`}
                    disabled={pending}
                    onClick={() => pinNote(note.id)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <PinIcon aria-hidden="true" />
                    置顶
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <FormFeedback
            dirty={dirty}
            formError={state.formError}
            pending={pending}
            status={state.status}
          />
          <Button disabled={pending || !dirty} type="submit">
            {pending ? (
              <LoaderCircleIcon aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
            ) : (
              <SaveIcon aria-hidden="true" />
            )}
            {pending ? "保存中…" : "保存 Latest Notes"}
          </Button>
        </div>
      </form>
    </section>
  );
}
