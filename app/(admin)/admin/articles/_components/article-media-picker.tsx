"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  formatCanonicalMediaReference,
  type MediaReferenceOption,
} from "@/features/articles/article-media-reference";

export function ArticleMediaPicker({
  mediaOptions,
}: {
  mediaOptions: readonly MediaReferenceOption[];
}) {
  const [selectedId, setSelectedId] = useState(mediaOptions[0]?.id ?? "");
  const selectedMedia = useMemo(
    () => mediaOptions.find((media) => media.id === selectedId) ?? null,
    [mediaOptions, selectedId],
  );
  const [label, setLabel] = useState(
    selectedMedia?.originalFilename ?? "",
  );
  const [status, setStatus] = useState<string | null>(null);

  function selectMedia(id: string) {
    const media = mediaOptions.find((option) => option.id === id);
    setSelectedId(id);
    setLabel(media?.originalFilename ?? "");
    setStatus(null);
  }

  function insertReference() {
    const textarea = document.getElementById("bodyMarkdown");

    if (!(textarea instanceof HTMLTextAreaElement) || !selectedMedia) {
      setStatus("无法插入媒体引用，请重新载入页面后再试。");
      return;
    }

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const selectedText = textarea.value
      .slice(selectionStart, selectionEnd)
      .trim();
    const reference = formatCanonicalMediaReference(
      selectedMedia,
      selectedText || label,
    );
    const needsLeadingBreak =
      selectionStart > 0 && textarea.value[selectionStart - 1] !== "\n";
    const needsTrailingBreak =
      selectionEnd < textarea.value.length &&
      textarea.value[selectionEnd] !== "\n";
    const insertion = `${needsLeadingBreak ? "\n\n" : ""}${reference}${
      needsTrailingBreak ? "\n\n" : ""
    }`;

    if (textarea.value.length + insertion.length >
      textarea.maxLength + (selectionEnd - selectionStart)) {
      setStatus("插入后正文会超过长度限制，请先缩短内容。");
      return;
    }

    textarea.setRangeText(
      insertion,
      selectionStart,
      selectionEnd,
      "end",
    );
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.focus();
    setStatus(`已插入 ${selectedMedia.originalFilename} 的稳定引用。`);
  }

  if (mediaOptions.length === 0) {
    return (
      <div className="mt-4 rounded-md border border-dashed border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
        <p>媒体库中还没有可插入的 ready 资产。</p>
        <Link
          className="mt-2 inline-flex min-h-11 items-center font-medium text-foreground underline underline-offset-4"
          href="/admin/media"
        >
          前往媒体库上传
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-4 rounded-md border border-border bg-muted p-4">
      <div>
        <p className="text-sm font-medium text-foreground">插入私有媒体引用</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          选择 ready 资产后，会在正文当前选区插入稳定的{" "}
          <code className="font-mono">cq-media://</code> 引用；当前阶段不提供预览。
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium" htmlFor="article-media">
            媒体
          </label>
          <select
            className="mt-2 min-h-(--control-height) w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            id="article-media"
            onChange={(event) => selectMedia(event.target.value)}
            value={selectedId}
          >
            {mediaOptions.map((media) => (
              <option key={media.id} value={media.id}>
                {media.originalFilename} · {media.mediaType}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            className="block text-xs font-medium"
            htmlFor="article-media-label"
          >
            Alt / 链接文字
          </label>
          <input
            className="mt-2 min-h-(--control-height) w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            id="article-media-label"
            maxLength={200}
            onChange={(event) => setLabel(event.target.value)}
            type="text"
            value={label}
          />
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          aria-live="polite"
          className="min-h-5 text-xs text-muted-foreground"
          role="status"
        >
          {status}
        </p>
        <Button
          className="w-full sm:w-auto"
          onClick={insertReference}
          type="button"
          variant="outline"
        >
          插入到当前选区
        </Button>
      </div>
    </div>
  );
}
