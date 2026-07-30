import type { AcceptedMediaType } from "@/features/media/media-dto";

const canonicalMediaReferencePattern =
  /!?\[[^\]\r\n]*\]\(cq-media:\/\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\)/gi;

export class ArticleMediaReferenceSyntaxError extends Error {
  constructor() {
    super("Article Markdown contains an invalid managed media reference.");
    this.name = "ArticleMediaReferenceSyntaxError";
  }
}

export type MediaReferenceOption = Readonly<{
  id: string;
  mediaType: AcceptedMediaType;
  originalFilename: string;
}>;

export function parseCanonicalMediaReferenceIds(bodyMarkdown: string) {
  const ids = new Set<string>();
  let match: RegExpExecArray | null;
  let remaining = bodyMarkdown;

  canonicalMediaReferencePattern.lastIndex = 0;

  while ((match = canonicalMediaReferencePattern.exec(bodyMarkdown))) {
    ids.add(match[1].toLowerCase());
    remaining = remaining.replace(match[0], "");
  }

  if (remaining.toLowerCase().includes("cq-media://")) {
    throw new ArticleMediaReferenceSyntaxError();
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

export function formatCanonicalMediaReference(
  media: MediaReferenceOption,
  label = media.originalFilename,
) {
  const safeLabel = escapeMarkdownLabel(label) || "media";
  const destination = `cq-media://${media.id}`;

  return media.mediaType.startsWith("image/")
    ? `![${safeLabel}](${destination})`
    : `[${safeLabel}](${destination})`;
}
