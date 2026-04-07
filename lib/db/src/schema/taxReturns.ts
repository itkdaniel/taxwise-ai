import { pgTable, text, integer, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

export const taxReturnStatusEnum = pgEnum("tax_return_status", ["draft", "processing", "validated", "complete", "error"]);
export const filingStatusEnum = pgEnum("filing_status", ["single", "married_filing_jointly", "married_filing_separately", "head_of_household", "qualifying_widow"]);

export const taxReturnsTable = pgTable("tax_returns", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id").notNull().references(() => usersTable.id),
  taxYear: integer("tax_year").notNull(),
  status: taxReturnStatusEnum("status").notNull().default("draft"),
  filingStatus: filingStatusEnum("filing_status").notNull().default("single"),
  totalWages: numeric("total_wages", { precision: 12, scale: 2 }),
  federalTaxWithheld: numeric("federal_tax_withheld", { precision: 12, scale: 2 }),
  estimatedRefund: numeric("estimated_refund", { precision: 12, scale: 2 }),
  estimatedOwed: numeric("estimated_owed", { precision: 12, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTaxReturnSchema = createInsertSchema(taxReturnsTable);
export type InsertTaxReturn = z.infer<typeof insertTaxReturnSchema>;
export type TaxReturn = typeof taxReturnsTable.$inferSelect;
