import type {
  HomeContentSection,
  HomeLatestNotesConfig,
  UpdateHomeContentSectionInput,
  UpdateHomeLatestNotesConfigInput,
} from "./home-content-dto";

export interface HomeContentService {
  getNowSection(): Promise<HomeContentSection | null>;
  getAboutSection(): Promise<HomeContentSection | null>;
  updateSection(
    input: UpdateHomeContentSectionInput,
  ): Promise<HomeContentSection>;
  getLatestNotesConfig(): Promise<HomeLatestNotesConfig | null>;
  updateLatestNotesConfig(
    input: UpdateHomeLatestNotesConfigInput,
  ): Promise<HomeLatestNotesConfig>;
}
