import {
  index,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { article } from "./article";
import { mediaAsset } from "./media";

export const articleMediaReference = pgTable(
  "article_media_reference",
  {
    articleId: uuid("article_id")
      .notNull()
      .references(() => article.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => mediaAsset.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.articleId, table.mediaId],
      name: "article_media_reference_pk",
    }),
    index("article_media_reference_media_id_idx").on(table.mediaId),
  ],
);
