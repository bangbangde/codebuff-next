import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatNoteDate, getAllNotes, getNote } from "@/lib/content/notes";
import { ContentContainer } from "../../_components/content-container";

type NotePageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export async function generateStaticParams() {
  const notes = await getAllNotes();
  return notes.map((note) => ({ slug: note.slug }));
}

export async function generateMetadata({
  params,
}: NotePageProps): Promise<Metadata> {
  const { slug } = await params;
  const note = await getNote(slug);

  if (!note) {
    notFound();
  }

  return {
    title: note.title,
    description: note.summary,
  };
}

export default async function NotePage({ params }: NotePageProps) {
  const { slug } = await params;
  const note = await getNote(slug);

  if (!note) {
    notFound();
  }

  const Content = note.Content;

  return (
    <main id="main-content">
      <article lang={note.language}>
        <ContentContainer>
          <header className="border-b border-border pt-[clamp(2.5rem,6vw,5rem)] pb-[clamp(3.5rem,8vw,6.5rem)]">
            <Link
              className="inline-flex min-h-11 items-center gap-2 font-mono text-xs leading-body tracking-[0.05em] text-muted-foreground transition-colors duration-150 hover:text-accent focus-visible:text-accent motion-reduce:transition-none"
              href="/notes"
              lang="en"
            >
              <span aria-hidden="true">←</span>
              All notes
            </Link>
            <p className="mt-8 mb-0 font-mono text-xs leading-body tracking-label text-accent uppercase">
              {note.kind} ·{" "}
              <time dateTime={note.publishedAt}>
                {formatNoteDate(note.publishedAt, note.language)}
              </time>{" "}
              · <span lang="en">{note.readingMinutes} min read</span>
            </p>
            <h1 className="mt-5 mb-0 max-w-[18ch] text-[clamp(2.35rem,6.2vw,5.25rem)] leading-[1.04] font-[550] tracking-[-0.055em] text-balance">
              {note.title}
            </h1>
            <p className="mt-7 mb-0 max-w-[42rem] text-[clamp(1.08rem,2vw,1.3rem)] leading-[1.75] text-muted-foreground">
              {note.summary}
            </p>
          </header>

          <div className="mx-auto max-w-[var(--layout-reading)] py-[clamp(3.5rem,8vw,7rem)]">
            <Content />
          </div>

          <footer className="border-t border-border py-[clamp(2.5rem,5vw,4rem)]">
            <Link
              className="inline-flex min-h-11 items-center gap-3 border-b border-[color-mix(in_srgb,var(--accent)_42%,transparent)] font-mono text-sm text-accent transition-colors duration-150 hover:border-accent focus-visible:border-accent motion-reduce:transition-none"
              href="/notes"
              lang="en"
            >
              Browse all notes
              <span aria-hidden="true">→</span>
            </Link>
          </footer>
        </ContentContainer>
      </article>
    </main>
  );
}
