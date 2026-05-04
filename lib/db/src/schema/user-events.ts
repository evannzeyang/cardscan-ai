import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const userEventsTable = pgTable("user_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  location: text("location"),
  dateTime: timestamp("date_time", { withTimezone: true }).notNull(),
  reminderFrequency: text("reminder_frequency").default("none"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type UserEvent = typeof userEventsTable.$inferSelect;
export type InsertUserEvent = typeof userEventsTable.$inferInsert;
