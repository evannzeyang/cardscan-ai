import { boolean, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { companiesTable } from "./companies";

export const userContactsTable = pgTable("user_contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").references(() => companiesTable.id),
  name: text("name"),
  title: text("title"),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  linkedin: text("linkedin"),
  address: text("address"),
  companySummary: text("company_summary"),
  syncedToSheets: boolean("synced_to_sheets").default(false),
  eventId: uuid("event_id"),
  scannedAt: timestamp("scanned_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type UserContact = typeof userContactsTable.$inferSelect;
export type InsertUserContact = typeof userContactsTable.$inferInsert;
