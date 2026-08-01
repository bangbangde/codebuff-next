import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ContentContainer } from "@/app/(site)/_components/content-container";
import { articleIdSchema } from "@/features/articles/article-validation";
import { getPublishedArticle } from "@/features/articles/server/article-service";
import { MarkdownRenderer } from "@/lib/content/markdown-renderer";

type NotePageProps = { params: Promise<{ noteId: string }> };

export const dynamic = "force-dynamic";

function formatPublishDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(new Date(date));
}

function removeRepeatedLeadingTitle(content: string, title: string) {
  const lines = content.split(/\r?\n/);

  if (lines[0]?.trim() === `# ${title.trim()}`) {
    return lines.slice(1).join("\n").replace(/^\s+/, "");
  }

  return content;
}

export async function generateMetadata({ params }: NotePageProps): Promise<Metadata> {
  const { noteId } = await params;
  if (!articleIdSchema.safeParse(noteId).success) return { title: "Not Found" };
  const note = await getPublishedArticle(noteId);
  return note ? { title: note.title, description: note.summary } : { title: "Not Found" };
}

export default async function NotePage({ params }: NotePageProps) {
  const { noteId } = await params;
  if (!articleIdSchema.safeParse(noteId).success) notFound();
  const note = await getPublishedArticle(noteId);
  if (!note) notFound();

  return (
    <main id="main-content">
      <article>
        <ContentContainer>
          <header className="border-b border-border pt-[clamp(2.5rem,5vw,4.5rem)] pb-[clamp(3rem,7vw,5.5rem)]">
            <Link className="font-mono text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" href="/notes">← Notes</Link>
            <p className="mt-8 font-mono text-xs tracking-label text-brand-accent uppercase">
              <time dateTime={note.publishedAt}>{formatPublishDate(note.publishedAt)}</time>
              {note.categoryName ? <> · {note.categoryName}</> : null}
            </p>
            <h1 className="mt-5 max-w-[18ch] text-[clamp(2.35rem,6.2vw,5.25rem)] leading-[1.04] font-[550] tracking-[-0.055em] text-balance">{note.title}</h1>
            {note.summary ? <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground">{note.summary}</p> : null}
            {note.tags.length > 0 ? (
              <ul aria-label="标签" className="mt-7 flex flex-wrap gap-1.5">
                {note.tags.map((tag) => <li className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs" key={tag}>{tag}</li>)}
              </ul>
            ) : null}
          </header>
          <div className="prose prose-lg dark:prose-invert mx-auto max-w-[var(--layout-reading)] py-[clamp(3.5rem,8vw,7rem)]">
            <MarkdownRenderer resolveAssetUrl={(assetId) => `/api/articles/${note.id}/assets/${assetId}/content`}>
              {removeRepeatedLeadingTitle(note.content, note.title)}
            </MarkdownRenderer>
          </div>
          <footer className="border-t border-border py-8">
            <Link className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" href="/notes">浏览全部 Notes</Link>
          </footer>
        </ContentContainer>
      </article>
    </main>
  );
}
