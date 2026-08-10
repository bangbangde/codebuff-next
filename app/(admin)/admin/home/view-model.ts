import type { HomeLatestNotesConfig } from "@/features/home-content/home-content-dto";
import { homeLatestNotesDisplayLimit } from "@/features/home-content/home-content-dto";
import type { PublishedArticleSummary } from "@/features/articles/article-dto";

export type AdminHomeNoteOption = Readonly<{
  id: string;
  title: string;
}>;

export type AdminHomeLatestNotesViewModel = Readonly<{
  displayLimit: number;
  notes: readonly AdminHomeNoteOption[];
  pinnedNoteIds: readonly string[];
}>;

export function createAdminHomeLatestNotesViewModel(
  config: HomeLatestNotesConfig | null,
  publishedArticles: readonly PublishedArticleSummary[],
): AdminHomeLatestNotesViewModel {
  return {
    displayLimit:
      config?.displayLimit ?? homeLatestNotesDisplayLimit.default,
    notes: publishedArticles.map(({ id, title }) => ({ id, title })),
    pinnedNoteIds: config?.pinnedNoteIds ?? [],
  };
}
