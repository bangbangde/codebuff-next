import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentContainer } from "@/app/(site)/_components/content-container";
import { NoteOutline } from "@/app/(site)/notes/[noteId]/_components/note-outline";
import { articleIdSchema } from "@/features/articles/article-validation";
import { getPublishedArticle } from "@/features/articles/server/article-service";
import { extractMarkdownOutline } from "@/lib/content/markdown-outline";
import { MarkdownRenderer } from "@/lib/content/markdown-renderer";

type NotePageProps = { params: Promise<{ noteId: string }> };

export const dynamic = "force-dynamic";

function formatPublishDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

function removeRepeatedLeadingTitle(content: string, title: string) {
  const lines = content.split(/\r?\n/);

  if (lines[0]?.trim() === `# ${title.trim()}`) {
    return lines.slice(1).join("\n").replace(/^\s+/, "");
  }

  return content;
}

export async function generateMetadata({
  params,
}: NotePageProps): Promise<Metadata> {
  const { noteId } = await params;

  if (!articleIdSchema.safeParse(noteId).success) {
    return { title: "未找到页面" };
  }

  const note = await getPublishedArticle(noteId);

  return note
    ? { title: note.title, description: note.summary }
    : { title: "未找到页面" };
}

export default async function NotePage({ params }: NotePageProps) {
  const { noteId } = await params;

  if (!articleIdSchema.safeParse(noteId).success) {
    notFound();
  }

  const note = await getPublishedArticle(noteId);

  if (!note) {
    notFound();
  }

  const content = removeRepeatedLeadingTitle(note.content, note.title);
  const outline = extractMarkdownOutline(content);
  const hasOutline = outline.length > 0;

  return (
    <main id="main-content">
      <article>
        <ContentContainer>
          <header className="border-b border-border py-[clamp(2.5rem,4.5vw,4rem)]">
            <div className="mx-auto max-w-[68rem]">
              <h1 className="m-0 max-w-[24ch] text-[clamp(1.9rem,3.8vw,3rem)] leading-[1.16] font-[600] tracking-[-0.035em] text-balance">
                {note.title}
              </h1>
              <div
                aria-label="笔记信息"
                className="mt-6 flex flex-wrap items-center gap-x-2.5 gap-y-2 font-mono text-xs leading-5 text-muted-foreground"
              >
                <time dateTime={note.publishedAt}>
                  {formatPublishDate(note.publishedAt)}
                </time>
                {note.categoryName ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{note.categoryName}</span>
                  </>
                ) : null}
                {note.tags.length > 0 ? (
                  <ul aria-label="标签" className="flex flex-wrap gap-1.5">
                    {note.tags.map((tag) => (
                      <li
                        className="rounded-sm bg-brand-accent-soft px-2 py-0.5 text-foreground"
                        key={tag}
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </header>

          <div
            className={`mx-auto py-[clamp(2.75rem,6vw,5.5rem)] ${
              hasOutline
                ? "max-w-[68rem] xl:grid xl:grid-cols-[minmax(0,48rem)_minmax(13rem,1fr)] xl:items-start xl:gap-12"
                : "max-w-[48rem]"
            }`}
          >
            {hasOutline ? <NoteOutline outline={outline} /> : null}

            <div className="min-w-0 xl:col-start-1 xl:row-start-1">
              <div className="prose dark:prose-invert max-w-none font-sans text-[1rem] leading-[1.78] prose-headings:scroll-mt-28 prose-headings:font-semibold prose-headings:tracking-[-0.025em] prose-headings:text-foreground prose-h2:mt-12 prose-h2:mb-4 prose-h2:text-[1.7rem] prose-h2:leading-[1.3] prose-h3:mt-9 prose-h3:mb-3 prose-h3:text-[1.3rem] prose-h3:leading-[1.4] prose-p:my-5 prose-p:leading-[1.78] prose-a:text-brand-ink prose-a:underline-offset-4 hover:prose-a:underline prose-strong:font-semibold prose-li:my-1 prose-li:leading-[1.72] prose-blockquote:my-7 prose-blockquote:border-l-brand-accent prose-blockquote:bg-muted prose-blockquote:px-5 prose-blockquote:py-3 prose-blockquote:not-italic prose-blockquote:text-foreground prose-code:rounded-sm prose-code:bg-brand-accent-soft prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:text-[0.88em] prose-code:font-normal prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none prose-pre:my-7 prose-pre:overflow-x-auto prose-pre:rounded-md prose-pre:border prose-pre:border-border prose-pre:bg-foreground prose-pre:text-[0.875rem] prose-pre:leading-6 prose-pre:text-background prose-table:text-sm prose-th:font-mono prose-th:font-semibold">
                <MarkdownRenderer
                  headingIds={outline.map((item) => item.id)}
                  resolveAssetUrl={(assetId) =>
                    `/api/notes/${note.id}/assets/${assetId}/content`
                  }
                >
                  {content}
                </MarkdownRenderer>
              </div>
            </div>
          </div>
        </ContentContainer>
      </article>
    </main>
  );
}
