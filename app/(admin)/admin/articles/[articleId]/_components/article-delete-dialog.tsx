"use client";

import { Trash2Icon } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { initialArticleDeleteFormState } from "@/features/articles/article-edit-form-state";
import { deleteArticleAction } from "../actions";

export function ArticleDeleteDialog({
  articleId,
  revision,
  title,
}: {
  articleId: string;
  revision: number;
  title: string;
}) {
  const [state, formAction, pending] = useActionState(
    deleteArticleAction,
    initialArticleDeleteFormState,
  );

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="destructive" />}>
        <Trash2Icon aria-hidden="true" />
        删除文章
      </DialogTrigger>
      <DialogContent>
        <form action={formAction}>
          <input name="articleId" type="hidden" value={articleId} />
          <input name="expectedRevision" type="hidden" value={revision} />
          <DialogHeader>
            <DialogTitle>永久删除未发布文章？</DialogTitle>
            <DialogDescription>
              你将删除“{title}”。此操作无法撤销，也不会影响公开站点中已有的独立内容。
            </DialogDescription>
          </DialogHeader>

          {state.formError ? (
            <div className="mt-4" role="alert">
              <p className="text-sm leading-6 text-destructive">
                {state.formError}
              </p>
              {state.conflictRevision ? (
                <a
                  className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-foreground underline underline-offset-4"
                  href={`/admin/articles/${articleId}`}
                >
                  重新载入数据库版本（修订 {state.conflictRevision}）
                </a>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="mt-5">
            <DialogClose render={<Button type="button" variant="outline" />}>
              取消
            </DialogClose>
            <Button disabled={pending} type="submit" variant="destructive">
              {pending ? "删除中…" : "永久删除"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
