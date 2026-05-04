import { jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { userContactsTable } from "./user-contacts";

export const userNotesTable = pgTable("user_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id")
    .notNull()
    .references(() => userContactsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  text: text("text").notNull(),
  aiSummary: text("ai_summary"),
  todoItems: jsonb("todo_items").$type<string[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type UserNote = typeof userNotesTable.$inferSelect;
export type InsertUserNote = typeof userNotesTable.$inferInsert;
