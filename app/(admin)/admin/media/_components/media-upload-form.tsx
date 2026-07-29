"use client";

import { UploadIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { maximumMediaBytes } from "@/features/media/media-dto";
import { cn } from "@/lib/utils";

type UploadState = Readonly<{
  message: string | null;
  progress: number;
  status: "idle" | "uploading" | "success" | "error";
}>;

const initialState: UploadState = {
  message: null,
  progress: 0,
  status: "idle",
};

function readErrorMessage(xhr: XMLHttpRequest) {
  try {
    const body = JSON.parse(xhr.responseText) as { error?: unknown };

    if (typeof body.error === "string") {
      return body.error;
    }
  } catch {
    // The bounded fallback below handles non-JSON upstream responses.
  }

  return "上传失败，请重新登录或稍后重试。";
}

export function MediaUploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [state, setState] = useState<UploadState>(initialState);
  const uploading = state.status === "uploading";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const file = inputRef.current?.files?.[0];

    if (!file) {
      setState({
        message: "请选择一个文件。",
        progress: 0,
        status: "error",
      });
      return;
    }

    if (file.size > maximumMediaBytes) {
      setState({
        message: "文件不能超过 10 MiB。",
        progress: 0,
        status: "error",
      });
      return;
    }

    const formData = new FormData();
    formData.set("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/media");
    xhr.responseType = "text";

    xhr.upload.addEventListener("progress", (progressEvent) => {
      if (!progressEvent.lengthComputable) {
        return;
      }

      setState({
        message: `正在上传 ${file.name}`,
        progress: Math.round(
          (progressEvent.loaded / progressEvent.total) * 100,
        ),
        status: "uploading",
      });
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (inputRef.current) {
          inputRef.current.value = "";
        }

        setState({
          message: `${file.name} 已安全写入私有媒体库。`,
          progress: 100,
          status: "success",
        });
        router.refresh();
        return;
      }

      setState({
        message: readErrorMessage(xhr),
        progress: 0,
        status: "error",
      });
    });

    xhr.addEventListener("error", () => {
      setState({
        message: "网络连接中断，无法完成上传。",
        progress: 0,
        status: "error",
      });
    });

    setState({
      message: `正在上传 ${file.name}`,
      progress: 0,
      status: "uploading",
    });
    xhr.send(formData);
  }

  return (
    <form
      className="grid gap-5 rounded-lg border border-border bg-card p-5 shadow-xs sm:p-7"
      onSubmit={handleSubmit}
    >
      <div>
        <label className="block text-sm font-medium" htmlFor="media-file">
          选择媒体文件
        </label>
        <p
          className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground"
          id="media-file-help"
        >
          单文件最大 10 MiB。支持 JPEG、PNG、WebP、GIF、AVIF 与
          PDF；服务器会验证真实文件签名。
        </p>
        <input
          accept=".jpg,.jpeg,.png,.webp,.gif,.avif,.pdf,image/jpeg,image/png,image/webp,image/gif,image/avif,application/pdf"
          aria-describedby="media-file-help"
          className="mt-4 block min-h-(--control-height) w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 focus-visible:outline-none"
          disabled={uploading}
          id="media-file"
          name="file"
          ref={inputRef}
          required
          type="file"
        />
      </div>

      {uploading ? (
        <div>
          <div
            aria-label="上传进度"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={state.progress}
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-brand-accent transition-[width] duration-(--motion-duration) ease-(--motion-easing) motion-reduce:transition-none"
              style={{ width: `${state.progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {state.progress}%
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          aria-live="polite"
          className={cn(
            "min-h-5 text-sm",
            state.status === "error"
              ? "text-destructive"
              : "text-muted-foreground",
          )}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
        <Button className="w-full sm:w-auto" disabled={uploading} type="submit">
          <UploadIcon aria-hidden="true" />
          {uploading ? "上传中…" : "上传到私有媒体库"}
        </Button>
      </div>
    </form>
  );
}
