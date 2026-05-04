import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const companiesTable = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessName: text("business_name").notNull(),
  businessAddress: text("business_address"),
  city: text("city"),
  province: text("province"),
  fullCivicAddress: text("full_civic_address"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  website: text("website"),
  phone: text("phone"),
  createdBy: varchar("created_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type Company = typeof companiesTable.$inferSelect;
export type InsertCompany = typeof companiesTable.$inferInsert;
