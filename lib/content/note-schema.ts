export const noteLanguages = ["zh-CN", "en"] as const;

export type NoteLanguage = (typeof noteLanguages)[number];

export type NoteMetadata = {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  updatedAt?: string;
  kind: string;
  language: NoteLanguage;
};

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const metadataFields = new Set<keyof NoteMetadata>([
  "slug",
  "title",
  "summary",
  "publishedAt",
  "updatedAt",
  "kind",
  "language",
]);

function assertNonEmptyString(
  value: unknown,
  field: keyof NoteMetadata,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Note metadata field "${field}" must be a non-empty string.`);
  }
}

function assertDate(
  value: unknown,
  field: "publishedAt" | "updatedAt",
): asserts value is string {
  assertNonEmptyString(value, field);

  const date = new Date(`${value}T00:00:00Z`);
  if (
    !datePattern.test(value) ||
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(
      `Note metadata field "${field}" must be a valid YYYY-MM-DD date.`,
    );
  }
}

export function defineNote(input: unknown): Readonly<NoteMetadata> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Note metadata must be an object.");
  }

  const record = input as Record<string, unknown>;
  const unexpectedFields = Object.keys(record).filter(
    (field) => !metadataFields.has(field as keyof NoteMetadata),
  );
  if (unexpectedFields.length > 0) {
    throw new Error(
      `Unknown note metadata field(s): ${unexpectedFields.join(", ")}.`,
    );
  }

  assertNonEmptyString(record.slug, "slug");
  if (!slugPattern.test(record.slug)) {
    throw new Error(
      'Note metadata field "slug" must use lowercase kebab-case characters.',
    );
  }

  assertNonEmptyString(record.title, "title");
  assertNonEmptyString(record.summary, "summary");
  assertNonEmptyString(record.kind, "kind");
  assertDate(record.publishedAt, "publishedAt");

  if (record.updatedAt !== undefined) {
    assertDate(record.updatedAt, "updatedAt");
    if (record.updatedAt < record.publishedAt) {
      throw new Error(
        'Note metadata field "updatedAt" cannot precede "publishedAt".',
      );
    }
  }

  if (
    typeof record.language !== "string" ||
    !noteLanguages.includes(record.language as NoteLanguage)
  ) {
    throw new Error(
      `Note metadata field "language" must be one of: ${noteLanguages.join(", ")}.`,
    );
  }

  return Object.freeze({
    slug: record.slug,
    title: record.title,
    summary: record.summary,
    publishedAt: record.publishedAt,
    ...(record.updatedAt === undefined
      ? {}
      : { updatedAt: record.updatedAt }),
    kind: record.kind,
    language: record.language as NoteLanguage,
  });
}

export function isNoteSlug(value: string) {
  return slugPattern.test(value);
}
