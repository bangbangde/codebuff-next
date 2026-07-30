"use client";

import {
  DownloadIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useRef,
  useState,
} from "react";

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
import type {
  MediaAssetStatus,
} from "@/features/media/media-dto";
import { cn } from "@/lib/utils";

type RequestState = Readonly<{
  message: string | null;
  status: "idle" | "pending" | "success" | "error";
}>;

const initialState: RequestState = {
  message: null,
  status: "idle",
};

async function readErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as { error?: unknown };

    if (typeof body.error === "string") {
      return body.error;
    }
  } catch {
    // The bounded fallback below handles non-JSON upstream responses.
  }

  return "操作失败，请重新登录或稍后重试。";
}

export function MediaItemActions({
  id,
  originalFilename,
  status,
}: {
  id: string;
  originalFilename: string;
  status: MediaAssetStatus;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteState, setDeleteState] =
    useState<RequestState>(initialState);
  const [retryState, setRetryState] =
    useState<RequestState>(initialState);

  async function handleRetry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = inputRef.current?.files?.[0];

    if (!file) {
      setRetryState({
        message: "请选择与失败记录相同的原始文件。",
        status: "error",
      });
      return;
    }

    setRetryState({
      message: `正在重试 ${file.name}…`,
      status: "pending",
    });

    const formData = new FormData();
    formData.set("file", file);

    try {
      const response = await fetch(
        `/api/admin/media/${id}/retry`,
        {
          body: formData,
          method: "POST",
        },
      );

      if (!response.ok) {
        setRetryState({
          message: await readErrorMessage(response),
          status: "error",
        });
        return;
      }

      setRetryState({
        message: "文件已重新写入私有存储。",
        status: "success",
      });
      router.refresh();
    } catch {
      setRetryState({
        message: "网络连接中断，无法完成重试。",
        status: "error",
      });
    }
  }

  async function handleDelete() {
    setDeleteState({
      message: "正在删除…",
      status: "pending",
    });

    try {
      const response = await fetch(`/api/admin/media/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setDeleteState({
          message: await readErrorMessage(response),
          status: "error",
        });
        return;
      }

      setDeleteDialogOpen(false);
      router.refresh();
    } catch {
      setDeleteState({
        message: "网络连接中断，无法完成删除。",
        status: "error",
      });
    }
  }

  if (status === "pending") {
    return null;
  }

  return (
    <div className="mt-5 border-t border-border pt-4">
      {status === "failed" ? (
        <form className="grid gap-3" onSubmit={handleRetry}>
          <div>
            <label
              className="block text-xs font-medium"
              htmlFor={`media-retry-${id}`}
            >
              重新选择原始文件
            </label>
            <input
              accept=".jpg,.jpeg,.png,.webp,.gif,.avif,.pdf,image/jpeg,image/png,image/webp,image/gif,image/avif,application/pdf"
              className="mt-2 block min-h-(--control-height) w-full rounded-md border border-input bg-background px-3 py-2 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:font-medium focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 focus-visible:outline-none"
              disabled={retryState.status === "pending"}
              id={`media-retry-${id}`}
              ref={inputRef}
              type="file"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              disabled={retryState.status === "pending"}
              size="sm"
              type="submit"
              variant="outline"
            >
              <RefreshCwIcon aria-hidden="true" />
              {retryState.status === "pending"
                ? "重试中…"
                : "重试上传"}
            </Button>
            <p
              aria-live="polite"
              className={cn(
                "text-xs",
                retryState.status === "error"
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
              role={
                retryState.status === "error" ? "alert" : "status"
              }
            >
              {retryState.message}
            </p>
          </div>
        </form>
      ) : (
        <Button
          render={
            <a
              href={`/api/admin/media/${id}/content`}
              rel="noreferrer"
              target="_blank"
            />
          }
          size="sm"
          variant="outline"
        >
          <DownloadIcon aria-hidden="true" />
          打开或下载
        </Button>
      )}

      <Dialog
        onOpenChange={setDeleteDialogOpen}
        open={deleteDialogOpen}
      >
        <DialogTrigger
          className={status === "failed" ? "mt-3" : "ml-3"}
          render={<Button size="sm" variant="destructive" />}
        >
          <Trash2Icon aria-hidden="true" />
          删除
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>永久删除媒体？</DialogTitle>
            <DialogDescription>
              你将从私有 Garage 和媒体库中删除“
              {originalFilename}”。被文章引用的媒体会拒绝删除。
            </DialogDescription>
          </DialogHeader>

          {deleteState.message ? (
            <p
              className={cn(
                "text-sm",
                deleteState.status === "error"
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
              role={
                deleteState.status === "error" ? "alert" : "status"
              }
            >
              {deleteState.message}
            </p>
          ) : null}

          <DialogFooter className="mt-2">
            <DialogClose
              render={<Button type="button" variant="outline" />}
            >
              取消
            </DialogClose>
            <Button
              disabled={deleteState.status === "pending"}
              onClick={handleDelete}
              type="button"
              variant="destructive"
            >
              {deleteState.status === "pending"
                ? "删除中…"
                : "永久删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
