export const homeContentSectionKeys = ["now", "about"] as const;

export const homeLatestNotesDisplayLimit = {
  default: 1,
  maximum: 20,
  minimum: 1,
} as const;

export type HomeContentSectionKey =
  (typeof homeContentSectionKeys)[number];

export type HomeContentSection = Readonly<{
  sectionKey: HomeContentSectionKey;
  markdown: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type HomeLatestNotesConfig = Readonly<{
  displayLimit: number;
  pinnedNoteIds: readonly string[];
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type UpdateHomeContentSectionInput = Readonly<{
  sectionKey: HomeContentSectionKey;
  markdown: string;
  updatedBy: string;
}>;

export type UpdateHomeLatestNotesConfigInput = Readonly<{
  displayLimit: number;
  pinnedNoteIds: readonly string[];
  updatedBy: string;
}>;
