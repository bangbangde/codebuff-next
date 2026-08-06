import type { AcceptedAssetType } from "@/features/article-assets/article-asset-dto";

// 合法托管资产引用（图片/链接形式），UUID 使用 8-4-4-4-12 RFC4122 格式
const canonicalAssetReferencePattern =
  /!?\[[^\]\r\n]*\]\(cq-asset:\/\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\s*(?:"[^"]*"\s*)?\)/gi;

// 匹配所有形如 [text](cq-asset://...) 的 Markdown 链接（可能 UUID 不合法），
// 用于语法检查：只要存在 "cq-asset://" URL 但未被合法正则捕获，即视为语法错误。
// 注意：不使用全局标志 g，避免 .test() 在多次调用间残留 lastIndex 导致漏检。
const anyAssetLikeReferencePattern =
  /!?\[[^\]\r\n]*\]\(cq-asset:\/\/[^)\s]+\s*(?:"[^"]*"\s*)?\)/i;

export class ArticleAssetReferenceSyntaxError extends Error {
  constructor() {
    super("Article Markdown contains an invalid managed asset reference.");
    this.name = "ArticleAssetReferenceSyntaxError";
  }
}

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

  // 检查语法错误：先将所有合法引用替换掉，若仍残留 cq-asset:// 形式的 Markdown 链接，
  // 说明存在 UUID 不合法的引用。字面文本（例如行内代码 `cq-asset://xxx`、
  // 说明性文字中的 "cq-asset:// 协议"）不会匹配 anyAssetLikeReferencePattern，
  // 因此不会被误报。
  const replaced = bodyMarkdown.replaceAll(canonicalAssetReferencePattern, "");
  if (anyAssetLikeReferencePattern.test(replaced)) {
    throw new ArticleAssetReferenceSyntaxError();
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

// 匹配上传占位符注释，用于清理残留（上传失败后未 discard、或页面刷新后的 stale 占位符）
const staleUploadPlaceholderPattern =
  new RegExp(`<!-- ${UPLOADING_SCHEME}:[0-9a-fA-F-]+ -->\\n?`, "g");

/**
 * 清理正文中残留的上传占位符注释。
 * 用于编辑器初次加载时移除上次会话遗留的 stale 占位符（页面刷新后
 * 上传任务已丢失，占位符注释无对应任务，无法完成替换）。
 */
export function stripStaleUploadPlaceholders(bodyMarkdown: string): string {
  return bodyMarkdown.replace(staleUploadPlaceholderPattern, "");
}
