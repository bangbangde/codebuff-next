import { sql } from "drizzle-orm";
import {
  check,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth.generated";
import { article } from "./article";

export const homeContentSection = pgTable(
  "home_content_sections",
  {
    sectionKey: text("section_key").primaryKey(),
    markdown: text("markdown").default("").notNull(),
    updatedBy: text("updated_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "home_content_sections_section_key_check",
      sql`${table.sectionKey} in ('now', 'about')`,
    ),
  ],
);

export const homeLatestNotesConfig = pgTable(
  "home_latest_notes_config",
  {
    id: integer("id").default(1).primaryKey(),
    displayLimit: integer("display_limit").default(1).notNull(),
    updatedBy: text("updated_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check("home_latest_notes_config_singleton_check", sql`${table.id} = 1`),
    check(
      "home_latest_notes_config_display_limit_check",
      sql`${table.displayLimit} between 1 and 20`,
    ),
  ],
);

export const homeLatestNotesPin = pgTable(
  "home_latest_notes_pins",
  {
    configId: integer("config_id")
      .notNull()
      .references(() => homeLatestNotesConfig.id, { onDelete: "cascade" }),
    noteId: uuid("note_id")
      .notNull()
      .references(() => article.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.configId, table.noteId] }),
    unique("home_latest_notes_pins_config_position_unique").on(
      table.configId,
      table.position,
    ),
    check(
      "home_latest_notes_pins_position_check",
      sql`${table.position} >= 0`,
    ),
  ],
);
