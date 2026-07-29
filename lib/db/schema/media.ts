import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const mediaAsset = pgTable(
  "media_asset",
  {
    id: uuid("id").primaryKey(),
    objectKey: text("object_key").notNull(),
    originalFilename: text("original_filename").notNull(),
    mediaType: text("media_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    sha256: text("sha256").notNull(),
    status: text("status").default("pending").notNull(),
    failureCode: text("failure_code"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("media_asset_object_key_unique").on(table.objectKey),
    index("media_asset_created_at_idx").on(table.createdAt),
    check(
      "media_asset_type_check",
      sql`${table.mediaType} in ('image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'application/pdf')`,
    ),
    check(
      "media_asset_size_check",
      sql`${table.byteSize} > 0 and ${table.byteSize} <= 10485760`,
    ),
    check(
      "media_asset_sha256_check",
      sql`${table.sha256} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "media_asset_status_check",
      sql`${table.status} in ('pending', 'ready', 'failed')`,
    ),
    check(
      "media_asset_failure_check",
      sql`(${table.status} = 'failed' and ${table.failureCode} is not null) or (${table.status} <> 'failed' and ${table.failureCode} is null)`,
    ),
  ],
);
