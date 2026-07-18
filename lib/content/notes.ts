import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cache, type ComponentType } from "react";
import {
  defineNote,
  isNoteSlug,
  type NoteLanguage,
  type NoteMetadata,
} from "./note-schema";

const notesDirectory = path.join(process.cwd(), "content", "notes");

type NoteModule = {
  default?: unknown;
  note?: unknown;
};

export type Note = Readonly<
  NoteMetadata & {
    Content: ComponentType;
    readingMinutes: number;
  }
>;

export type NoteSummary = Omit<Note, "Content">;

const getNoteSlugs = cache(async () => {
  const entries = await readdir(notesDirectory, { withFileTypes: true });
  const slugs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  if (slugs.length === 0) {
    throw new Error("At least one note is required in content/notes.");
  }

  const normalizedSlugs = new Set<string>();
  for (const slug of slugs) {
    if (!isNoteSlug(slug)) {
      throw new Error(
        `Note directory "${slug}" must use lowercase kebab-case characters.`,
      );
    }

    const normalizedSlug = slug.toLocaleLowerCase("en-US");
    if (normalizedSlugs.has(normalizedSlug)) {
      throw new Error(`Duplicate note directory slug "${slug}".`);
    }
    normalizedSlugs.add(normalizedSlug);
  }

  return slugs;
});

function estimateReadingMinutes(source: string) {
  const metadataEnd = source.indexOf("\n});");
  const body = metadataEnd === -1 ? source : source.slice(metadataEnd + 4);
  const prose = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/https?:\/\/\S+/g, " ");
  const hanCharacters = prose.match(/\p{Script=Han}/gu)?.length ?? 0;
  const latinWords =
    prose
      .replace(/\p{Script=Han}/gu, " ")
      .match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g)?.length ?? 0;

  return Math.max(1, Math.ceil(hanCharacters / 350 + latinWords / 200));
}

const loadNote = cache(async (slug: string): Promise<Note | null> => {
  if (!isNoteSlug(slug)) {
    return null;
  }

  const slugs = await getNoteSlugs();
  if (!slugs.includes(slug)) {
    return null;
  }

  const noteModule = (await import(
    `@/content/notes/${slug}/index.mdx`
  )) as NoteModule;
  const metadata = defineNote(noteModule.note);

  if (typeof noteModule.default !== "function") {
    throw new Error(`Note "${slug}" must export MDX content as default.`);
  }

  if (metadata.slug !== slug) {
    throw new Error(
      `Note metadata slug "${metadata.slug}" must match directory "${slug}".`,
    );
  }

  const source = await readFile(
    path.join(notesDirectory, slug, "index.mdx"),
    "utf8",
  );

  return Object.freeze({
    ...metadata,
    Content: noteModule.default as ComponentType,
    readingMinutes: estimateReadingMinutes(source),
  });
});

export const getNote = loadNote;

export const getAllNotes = cache(async (): Promise<NoteSummary[]> => {
  const slugs = await getNoteSlugs();
  const notes = await Promise.all(
    slugs.map(async (slug) => {
      const note = await loadNote(slug);
      if (!note) {
        throw new Error(`Unable to load note "${slug}".`);
      }

      return {
        slug: note.slug,
        title: note.title,
        summary: note.summary,
        publishedAt: note.publishedAt,
        ...(note.updatedAt === undefined
          ? {}
          : { updatedAt: note.updatedAt }),
        kind: note.kind,
        language: note.language,
        readingMinutes: note.readingMinutes,
      } satisfies NoteSummary;
    }),
  );

  const metadataSlugs = new Set<string>();
  for (const note of notes) {
    const normalizedSlug = note.slug.toLocaleLowerCase("en-US");
    if (metadataSlugs.has(normalizedSlug)) {
      throw new Error(`Duplicate note metadata slug "${note.slug}".`);
    }
    metadataSlugs.add(normalizedSlug);
  }

  return notes.sort(
    (left, right) =>
      right.publishedAt.localeCompare(left.publishedAt) ||
      left.slug.localeCompare(right.slug),
  );
});

export function formatNoteDate(date: string, language: NoteLanguage) {
  return new Intl.DateTimeFormat(language, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
