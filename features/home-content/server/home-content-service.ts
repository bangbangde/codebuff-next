import "server-only";

import type { HomeContentRepository } from "../home-content-repository";
import type { HomeContentService } from "../home-content-service";
import {
  updateHomeContentSectionSchema,
  updateHomeLatestNotesConfigSchema,
} from "../home-content-validation";
import { drizzleHomeContentRepository } from "./drizzle-home-content-repository";

export function createHomeContentService(
  repository: HomeContentRepository,
): HomeContentService {
  return {
    getNowSection() {
      return repository.findSection("now");
    },

    getAboutSection() {
      return repository.findSection("about");
    },

    updateSection(input) {
      return repository.saveSection(updateHomeContentSectionSchema.parse(input));
    },

    getLatestNotesConfig() {
      return repository.findLatestNotesConfig();
    },

    updateLatestNotesConfig(input) {
      return repository.saveLatestNotesConfig(
        updateHomeLatestNotesConfigSchema.parse(input),
      );
    },
  };
}

export const homeContentService = createHomeContentService(
  drizzleHomeContentRepository,
);
