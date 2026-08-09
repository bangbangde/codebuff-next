import "server-only";

import { asc, eq } from "drizzle-orm";

import { getDatabase } from "@/lib/db/client";
import {
  homeContentSection,
  homeLatestNotesConfig,
  homeLatestNotesPin,
} from "@/lib/db/schema";
import type {
  HomeContentSection,
  HomeContentSectionKey,
  HomeLatestNotesConfig,
  UpdateHomeContentSectionInput,
  UpdateHomeLatestNotesConfigInput,
} from "../home-content-dto";
import type { HomeContentRepository } from "../home-content-repository";

const LATEST_NOTES_CONFIG_ID = 1;

type HomeContentSectionRow = typeof homeContentSection.$inferSelect;
type HomeLatestNotesConfigRow = typeof homeLatestNotesConfig.$inferSelect;

function toSectionDto(row: HomeContentSectionRow): HomeContentSection {
  return {
    sectionKey: row.sectionKey as HomeContentSectionKey,
    markdown: row.markdown,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toLatestNotesConfigDto(
  row: HomeLatestNotesConfigRow,
  pinnedNoteIds: readonly string[],
): HomeLatestNotesConfig {
  return {
    displayLimit: row.displayLimit,
    pinnedNoteIds,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const drizzleHomeContentRepository: HomeContentRepository = {
  async findSection(
    sectionKey: HomeContentSectionKey,
  ): Promise<HomeContentSection | null> {
    const [row] = await getDatabase()
      .select()
      .from(homeContentSection)
      .where(eq(homeContentSection.sectionKey, sectionKey))
      .limit(1);

    return row ? toSectionDto(row) : null;
  },

  async saveSection(
    input: UpdateHomeContentSectionInput,
  ): Promise<HomeContentSection> {
    const [row] = await getDatabase()
      .insert(homeContentSection)
      .values({
        sectionKey: input.sectionKey,
        markdown: input.markdown,
        updatedBy: input.updatedBy,
      })
      .onConflictDoUpdate({
        target: homeContentSection.sectionKey,
        set: {
          markdown: input.markdown,
          updatedAt: new Date(),
          updatedBy: input.updatedBy,
        },
      })
      .returning();

    if (!row) {
      throw new Error("Home content section save did not return a record.");
    }

    return toSectionDto(row);
  },

  async findLatestNotesConfig(): Promise<HomeLatestNotesConfig | null> {
    return getDatabase().transaction(async (transaction) => {
      const [config] = await transaction
        .select()
        .from(homeLatestNotesConfig)
        .where(eq(homeLatestNotesConfig.id, LATEST_NOTES_CONFIG_ID))
        .for("share")
        .limit(1);

      if (!config) {
        return null;
      }

      const pins = await transaction
        .select({ noteId: homeLatestNotesPin.noteId })
        .from(homeLatestNotesPin)
        .where(eq(homeLatestNotesPin.configId, LATEST_NOTES_CONFIG_ID))
        .orderBy(asc(homeLatestNotesPin.position));

      return toLatestNotesConfigDto(
        config,
        pins.map((pin) => pin.noteId),
      );
    });
  },

  async saveLatestNotesConfig(
    input: UpdateHomeLatestNotesConfigInput,
  ): Promise<HomeLatestNotesConfig> {
    return getDatabase().transaction(async (transaction) => {
      const [config] = await transaction
        .insert(homeLatestNotesConfig)
        .values({
          id: LATEST_NOTES_CONFIG_ID,
          displayLimit: input.displayLimit,
          updatedBy: input.updatedBy,
        })
        .onConflictDoUpdate({
          target: homeLatestNotesConfig.id,
          set: {
            displayLimit: input.displayLimit,
            updatedAt: new Date(),
            updatedBy: input.updatedBy,
          },
        })
        .returning();

      if (!config) {
        throw new Error("Latest Notes config save did not return a record.");
      }

      await transaction
        .delete(homeLatestNotesPin)
        .where(eq(homeLatestNotesPin.configId, LATEST_NOTES_CONFIG_ID));

      if (input.pinnedNoteIds.length > 0) {
        await transaction.insert(homeLatestNotesPin).values(
          input.pinnedNoteIds.map((noteId, position) => ({
            configId: LATEST_NOTES_CONFIG_ID,
            noteId,
            position,
          })),
        );
      }

      return toLatestNotesConfigDto(config, input.pinnedNoteIds);
    });
  },
};
