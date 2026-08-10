export type HomeMarkdownFormState = Readonly<{
  fieldErrors: Readonly<{
    markdown?: readonly string[];
  }>;
  formError: string | null;
  savedMarkdown: string;
  status: "idle" | "saved" | "error";
}>;

export type HomeLatestNotesFormState = Readonly<{
  fieldErrors: Readonly<{
    displayLimit?: readonly string[];
    pinnedNoteIds?: readonly string[];
  }>;
  formError: string | null;
  savedDisplayLimit: number;
  savedPinnedNoteIds: readonly string[];
  status: "idle" | "saved" | "error";
}>;
