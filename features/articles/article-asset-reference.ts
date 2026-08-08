import type { AcceptedAssetType } from "@/features/article-assets/article-asset-dto";

// 合法托管资产引用（图片/链接形式），UUID 使用 8-4-4-4-12 RFC4122 格式
const canonicalAssetReferencePattern =
  /!?\[[^\]\r\n]*\]\(cq-asset:\/\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\s*(?:"[^"]*"\s*)?\)/gi;

export type AssetReferenceOption = Readonly<{
  id: string;
  mediaType: AcceptedAssetType;
  originalFilename: string;
}>;

export function parseCanonicalAssetReferenceIds(bodyMarkdown: string) {
  const ids = new Set<string>();

  for (const match of bodyMarkdown.matchAll(canonicalAssetReferencePattern)) {
    ids.add(match[1].toLowerCase());
  }

  return [...ids];
}

export function escapeMarkdownLabel(value: string) {
  return value
    .replace(/[\r\n]+/g, " ")
    .replaceAll("\\", "\\\\")
    .replaceAll("]", "\\]")
    .trim();
}

export function formatCanonicalAssetReference(
  asset: AssetReferenceOption,
  label = asset.originalFilename,
) {
  const safeLabel = escapeMarkdownLabel(label) || "asset";
  const destination = `cq-asset://${asset.id}`;

  return asset.mediaType.startsWith("image/")
    ? `![${safeLabel}](${destination})`
    : `[${safeLabel}](${destination})`;
}

// ─── 上传占位符 ─────────────────────────────────────────────

/** 占位符使用的伪 scheme，与正式的 cq-asset:// 区分 */
export const UPLOADING_SCHEME = "cq-upload";

/**
 * 格式化上传占位符为 HTML 注释。Markdown 渲染器会忽略 HTML 注释，
 * 避免预览渲染加载失败的图片/链接。上传完成后编辑器将整个注释替换为
 * 正式的 cq-asset:// 引用；取消时替换为空字符串。
 */
export function formatUploadPlaceholder(taskId: string): string {
  return `<!-- ${UPLOADING_SCHEME}:${taskId} -->`;
}
