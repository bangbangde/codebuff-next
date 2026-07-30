import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  Clock3Icon,
  ImagesIcon,
} from "lucide-react";
import type { Metadata } from "next";

import type { MediaAsset } from "@/features/media/media-dto";
import { listMediaAssets } from "@/features/media/server/media-service";
import { requireAdmin } from "@/lib/auth/session";
import { MediaReferenceCopy } from "./_components/media-reference-copy";
import { MediaUploadForm } from "./_components/media-upload-form";

export const metadata: Metadata = {
  title: "Media",
  description: "Upload and review private Garage-backed media assets.",
};

function formatBytes(value: number) {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(2)} MiB`;
  }

  return `${(value / 1024).toFixed(1)} KiB`;
}

function formatCreatedAt(asset: MediaAsset) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(asset.createdAt));
}

const statusPresentation = {
  failed: {
    Icon: AlertTriangleIcon,
    className: "text-destructive",
    label: "上传失败",
  },
  pending: {
    Icon: Clock3Icon,
    className: "text-muted-foreground",
    label: "等待存储确认",
  },
  ready: {
    Icon: CheckCircle2Icon,
    className: "text-brand-accent",
    label: "私有可用",
  },
} as const;

export default async function MediaPage() {
  await requireAdmin();
  const assets = await listMediaAssets();

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10 lg:py-12">
      <header className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.1em] text-brand-accent uppercase">
          Admin / Media
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          媒体库
        </h1>
        <p className="mt-4 max-w-2xl text-[0.9375rem] leading-7 text-muted-foreground sm:text-base">
          文件字节存储在私有 Garage
          桶中，元数据与生命周期由 PostgreSQL
          管理。当前资产不会公开，也不会自动插入文章。
        </p>
      </header>

      <section aria-labelledby="upload-title" className="mt-10">
        <div className="mb-5">
          <p className="font-mono text-[0.6875rem] tracking-[0.1em] text-muted-foreground uppercase">
            Server-mediated upload
          </p>
          <h2
            className="mt-2 text-xl font-semibold tracking-[-0.025em]"
            id="upload-title"
          >
            上传文件
          </h2>
        </div>
        <MediaUploadForm />
      </section>

      <section
        aria-labelledby="media-list-title"
        className="mt-12 border-t border-border pt-8"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[0.6875rem] tracking-[0.1em] text-muted-foreground uppercase">
              PostgreSQL metadata
            </p>
            <h2
              className="mt-2 text-xl font-semibold tracking-[-0.025em]"
              id="media-list-title"
            >
              私有资产
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {assets.length} {assets.length === 1 ? "asset" : "assets"}
          </p>
        </div>

        {assets.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-border bg-muted px-5 py-10 sm:px-8 sm:py-12">
            <ImagesIcon
              aria-hidden="true"
              className="size-6 text-brand-accent"
            />
            <h3 className="mt-5 text-base font-semibold">媒体库为空</h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              上传第一个文件后，这里会显示经过签名验证的类型、大小、校验和与存储状态。
            </p>
          </div>
        ) : (
          <ol className="mt-6 grid gap-4">
            {assets.map((asset) => {
              const presentation = statusPresentation[asset.status];
              const StatusIcon = presentation.Icon;

              return (
                <li
                  className="grid min-w-0 gap-5 rounded-lg border border-border bg-card p-5 shadow-xs sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:p-6"
                  key={asset.id}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <h3 className="break-all text-base font-semibold">
                        {asset.originalFilename}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium ${presentation.className}`}
                      >
                        <StatusIcon aria-hidden="true" className="size-3.5" />
                        {presentation.label}
                      </span>
                    </div>
                    <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground">验证类型</dt>
                        <dd className="mt-1 font-mono">{asset.mediaType}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">文件大小</dt>
                        <dd className="mt-1 font-mono">
                          {formatBytes(asset.byteSize)}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-muted-foreground">SHA-256</dt>
                        <dd className="mt-1 break-all font-mono leading-5">
                          {asset.sha256}
                        </dd>
                      </div>
                    </dl>
                    {asset.failureCode ? (
                      <p className="mt-4 text-sm text-destructive">
                        存储暂时不可用；失败状态已保留。
                      </p>
                    ) : null}
                    {asset.status === "ready" ? (
                      <MediaReferenceCopy
                        media={{
                          id: asset.id,
                          mediaType: asset.mediaType,
                          originalFilename: asset.originalFilename,
                        }}
                      />
                    ) : (
                      <p className="mt-4 text-xs text-muted-foreground">
                        资产变为 ready 后才能复制或插入引用。
                      </p>
                    )}
                  </div>
                  <time
                    className="text-xs text-muted-foreground"
                    dateTime={asset.createdAt}
                  >
                    {formatCreatedAt(asset)}
                  </time>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
