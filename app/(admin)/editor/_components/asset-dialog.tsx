"use client";

import { ArticleAssetPanel } from "./article-asset-panel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ArticleAsset } from "@/features/article-assets/article-asset-dto";

export function AssetDialog({
  articleId,
  assets,
  onInsertReference,
  onOpenChange,
  open,
}: {
  articleId: string;
  assets: readonly ArticleAsset[];
  onInsertReference: (reference: string) => boolean;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[85vh] w-full max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>文章资源</DialogTitle>
          <DialogDescription>
            管理文章关联的图片和附件。点击「插入引用」将资产以{" "}
            <code className="font-mono">cq-asset://</code>{" "}
            格式插入到编辑器光标处。
          </DialogDescription>
        </DialogHeader>

        <ArticleAssetPanel
          articleId={articleId}
          assets={assets}
          onInsertReference={onInsertReference}
        />
      </DialogContent>
    </Dialog>
  );
}
