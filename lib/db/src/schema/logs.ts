import { pgTable, text, integer, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const logLevelEnum = pgEnum("log_level", ["debug", "info", "warn", "error", "critical"]);

export const logEntriesTable = pgTable("log_entries", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  level: logLevelEnum("level").notNull().default("info"),
  message: text("message").notNull(),
  service: text("service").notNull(),
  metadata: jsonb("metadata").default({}),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLogEntrySchema = createInsertSchema(logEntriesTable);
export type InsertLogEntry = z.infer<typeof insertLogEntrySchema>;
export type LogEntry = typeof logEntriesTable.$inferSelect;
