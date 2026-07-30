import type { AcceptedAssetType } from "@/features/article-assets/article-asset-dto";

const canonicalAssetReferencePattern =
  /!?\[[^\]\r\n]*\]\(cq-asset:\/\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\)/gi;

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

  // 移除所有合法引用后，若仍残留 cq-asset:// 说明存在语法错误的引用
  const stripped = bodyMarkdown.replaceAll(canonicalAssetReferencePattern, "");

  if (stripped.toLowerCase().includes("cq-asset://")) {
    throw new ArticleAssetReferenceSyntaxError();
  }

  return [...ids];
}

function escapeMarkdownLabel(value: string) {
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
