"use client";

import { AlertTriangleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function MediaError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl items-center px-5 py-12 sm:px-8">
      <div className="w-full rounded-lg border border-destructive/25 bg-destructive/5 p-6 sm:p-8">
        <AlertTriangleIcon
          aria-hidden="true"
          className="size-6 text-destructive"
        />
        <h1 className="mt-5 text-xl font-semibold">媒体库暂时不可用</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          无法读取 PostgreSQL
          中的媒体元数据。没有文件状态被假定为可用，请在数据库恢复后重试。
        </p>
        <Button className="mt-6" onClick={reset} type="button" variant="outline">
          重新载入媒体库
        </Button>
      </div>
    </div>
  );
}
