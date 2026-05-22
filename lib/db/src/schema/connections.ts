import { pgTable, uuid, varchar, text, timestamp, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const connectionsTable = pgTable(
  "connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    senderId: varchar("sender_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    receiverId: varchar("receiver_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("unique_connection").on(table.senderId, table.receiverId)],
);

export type Connection = typeof connectionsTable.$inferSelect;
export type InsertConnection = typeof connectionsTable.$inferInsert;
