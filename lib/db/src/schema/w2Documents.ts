import { pgTable, text, integer, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { taxReturnsTable } from "./taxReturns";

export const w2StatusEnum = pgEnum("w2_status", ["pending", "extracting", "extracted", "manual", "error"]);

export const w2DocumentsTable = pgTable("w2_documents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  taxReturnId: integer("tax_return_id").notNull().references(() => taxReturnsTable.id, { onDelete: "cascade" }),
  employerName: text("employer_name").notNull(),
  employerEin: text("employer_ein"),
  taxYear: integer("tax_year").notNull(),
  status: w2StatusEnum("status").notNull().default("pending"),
  objectPath: text("object_path"),
  wagesAndTips: numeric("wages_and_tips", { precision: 12, scale: 2 }),
  federalIncomeTax: numeric("federal_income_tax", { precision: 12, scale: 2 }),
  socialSecurityWages: numeric("social_security_wages", { precision: 12, scale: 2 }),
  socialSecurityTax: numeric("social_security_tax", { precision: 12, scale: 2 }),
  medicareWages: numeric("medicare_wages", { precision: 12, scale: 2 }),
  medicareTax: numeric("medicare_tax", { precision: 12, scale: 2 }),
  stateWages: numeric("state_wages", { precision: 12, scale: 2 }),
  stateTax: numeric("state_tax", { precision: 12, scale: 2 }),
  state: text("state"),
  localWages: numeric("local_wages", { precision: 12, scale: 2 }),
  localTax: numeric("local_tax", { precision: 12, scale: 2 }),
  extractionConfidence: numeric("extraction_confidence", { precision: 5, scale: 4 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertW2DocumentSchema = createInsertSchema(w2DocumentsTable);
export type InsertW2Document = z.infer<typeof insertW2DocumentSchema>;
export type W2Document = typeof w2DocumentsTable.$inferSelect;
