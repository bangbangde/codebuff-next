import type {
  HomeContentSection,
  HomeContentSectionKey,
  HomeLatestNotesConfig,
  UpdateHomeContentSectionInput,
  UpdateHomeLatestNotesConfigInput,
} from "./home-content-dto";

export interface HomeContentRepository {
  findSection(
    sectionKey: HomeContentSectionKey,
  ): Promise<HomeContentSection | null>;
  saveSection(
    input: UpdateHomeContentSectionInput,
  ): Promise<HomeContentSection>;
  findLatestNotesConfig(): Promise<HomeLatestNotesConfig | null>;
  saveLatestNotesConfig(
    input: UpdateHomeLatestNotesConfigInput,
  ): Promise<HomeLatestNotesConfig>;
}
