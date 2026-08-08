/**
 * 从 Markdown 正文提取摘要。
 *
 * 1. 剥离 Markdown 语法（代码块、链接、图片、标题标记、强调等）
 * 2. 将 cq-asset:// 引用的标签文本保留（去掉 URL）
 * 3. 折叠空白，按句子/段落截断到指定长度
 */
export function extractSummaryFromMarkdown(
  markdown: string,
  maxLength = 200,
): string {
  const text = markdown
    // 移除代码块（```...``` 或 ~~~...~~~）
    .replace(/```[\s\S]*?```/g, "")
    .replace(/~~~[\s\S]*?~~~/g, "")
    // 移除图片引用 ![alt](url)，保留 alt 文本
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    // 移除链接 [text](url)，保留 text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    // 移除标题标记 (# ## ### ...)
    .replace(/^#{1,6}\s+/gm, "")
    // 移除强调标记 **text** *text* __text__ _text_
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(?<!\w)\*(.+?)\*(?!\w)/g, "$1")
    .replace(/(?<!\w)_(.+?)_(?!\w)/g, "$1")
    // 移除行内代码 `code`
    .replace(/`([^`]+)`/g, "$1")
    // 移除引用标记 >
    .replace(/^>\s+/gm, "")
    // 移除列表标记 (- * + 1.)
    .replace(/^[\s]*[-*+]\s+/gm, "")
    .replace(/^[\s]*\d+\.\s+/gm, "")
    // 移除水平线 --- ***
    .replace(/^[-*]{3,}$/gm, "")
    // 移除 HTML 标签
    .replace(/<[^>]+>/g, "")
    // 折叠多余空白
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (text.length <= maxLength) {
    return text;
  }

  // 在 maxLength 范围内尝试按句子截断
  const slice = text.slice(0, maxLength);
  const lastSentenceEnd = slice.lastIndexOf("。");
  const lastPeriod = slice.lastIndexOf(". ");

  const cutAt =
    lastSentenceEnd > maxLength * 0.5
      ? lastSentenceEnd + 1
      : lastPeriod > maxLength * 0.5
        ? lastPeriod + 1
        : maxLength;

  return text.slice(0, cutAt).trimEnd() + "…";
}
