import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const maintenanceTask = pgTable("maintenance_task", {
  key: text("key").primaryKey(),

  nextEligibleAt: timestamp("next_eligible_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),

  leaseUntil: timestamp("lease_until", {
    withTimezone: true,
  }),

  lastStartedAt: timestamp("last_started_at", {
    withTimezone: true,
  }),

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});
