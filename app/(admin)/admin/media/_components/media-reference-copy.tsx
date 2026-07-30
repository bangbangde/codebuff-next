"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  formatCanonicalMediaReference,
  type MediaReferenceOption,
} from "@/features/articles/article-media-reference";

export function MediaReferenceCopy({
  media,
}: {
  media: MediaReferenceOption;
}) {
  const reference = formatCanonicalMediaReference(media);
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(reference);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mt-5 rounded-md border border-border bg-muted p-3">
      <label
        className="text-xs font-medium text-muted-foreground"
        htmlFor={`media-reference-${media.id}`}
      >
        Canonical Markdown reference
      </label>
      <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          className="min-h-(--control-height) min-w-0 rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
          id={`media-reference-${media.id}`}
          readOnly
          type="text"
          value={reference}
        />
        <Button
          className="w-full sm:w-auto"
          onClick={copyReference}
          type="button"
          variant="outline"
        >
          {status === "copied" ? (
            <CheckIcon aria-hidden="true" />
          ) : (
            <CopyIcon aria-hidden="true" />
          )}
          {status === "copied" ? "已复制" : "复制引用"}
        </Button>
      </div>
      <p
        aria-live="polite"
        className="mt-2 min-h-4 text-xs text-muted-foreground"
        role={status === "error" ? "alert" : "status"}
      >
        {status === "error"
          ? "自动复制失败，请手动选择上方引用。"
          : status === "copied"
            ? "已复制，可粘贴到文章 Markdown 正文。"
            : null}
      </p>
    </div>
  );
}
