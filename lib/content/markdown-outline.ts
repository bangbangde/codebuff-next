export type MarkdownOutlineItem = Readonly<{
  depth: 2 | 3;
  id: string;
  text: string;
}>;

const ATX_HEADING_PATTERN = /^ {0,3}(#{2,3})[\t ]+(.+?)(?:[\t ]+#+[\t ]*)?$/;
const FENCE_PATTERN = /^ {0,3}(`{3,}|~{3,})/;
const SETEXT_LEVEL_TWO_PATTERN = /^ {0,3}-{3,}[\t ]*$/;

export function extractMarkdownOutline(
  markdown: string,
): readonly MarkdownOutlineItem[] {
  const lines = markdown.split(/\r?\n/);
  const outline: MarkdownOutlineItem[] = [];
  let fence: { character: string; length: number } | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fenceMatch = line.match(FENCE_PATTERN);

    if (fence) {
      if (isClosingFence(line, fence)) {
        fence = null;
      }

      continue;
    }

    if (fenceMatch) {
      fence = {
        character: fenceMatch[1][0],
        length: fenceMatch[1].length,
      };
      continue;
    }

    const atxHeading = line.match(ATX_HEADING_PATTERN);

    if (atxHeading) {
      pushOutlineItem(
        outline,
        atxHeading[1].length as 2 | 3,
        atxHeading[2],
      );
      continue;
    }

    if (
      line.trim().length > 0 &&
      SETEXT_LEVEL_TWO_PATTERN.test(lines[index + 1] ?? "")
    ) {
      pushOutlineItem(outline, 2, line);
      index += 1;
    }
  }

  return outline;
}

function isClosingFence(
  line: string,
  fence: { character: string; length: number },
) {
  const trimmed = line.trim();
  let markerLength = 0;

  while (trimmed[markerLength] === fence.character) {
    markerLength += 1;
  }

  return (
    markerLength >= fence.length && trimmed.slice(markerLength).trim().length === 0
  );
}

function pushOutlineItem(
  outline: MarkdownOutlineItem[],
  depth: 2 | 3,
  source: string,
) {
  const text = toPlainHeadingText(source);

  if (!text) {
    return;
  }

  outline.push({
    depth,
    id: `note-section-${outline.length + 1}`,
    text,
  });
}

function toPlainHeadingText(source: string) {
  return source
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/[`*_~]/g, "")
    .replace(/\\([\\`*_[\]{}()#+\-.!>])/g, "$1")
    .trim();
}
