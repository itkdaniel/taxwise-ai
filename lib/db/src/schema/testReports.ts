import { pgTable, text, integer, timestamp, jsonb, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const testTypeEnum = pgEnum("test_type", ["unit", "e2e", "regression", "integration"]);
export const testStatusEnum = pgEnum("test_status", ["pending", "running", "passed", "failed", "partial", "error"]);
export const testPriorityEnum = pgEnum("test_priority", ["critical", "high", "medium", "low"]);

export const testReportsTable = pgTable("test_reports", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  type: testTypeEnum("type").notNull(),
  status: testStatusEnum("status").notNull().default("pending"),
  priority: testPriorityEnum("priority").notNull().default("medium"),
  totalTests: integer("total_tests").notNull().default(0),
  passedTests: integer("passed_tests").notNull().default(0),
  failedTests: integer("failed_tests").notNull().default(0),
  skippedTests: integer("skipped_tests").notNull().default(0),
  duration: numeric("duration", { precision: 10, scale: 3 }),
  environment: text("environment"),
  branch: text("branch"),
  commitHash: text("commit_hash"),
  tags: jsonb("tags").default([]),
  errorMessages: jsonb("error_messages").default([]),
  reproductionSteps: jsonb("reproduction_steps").default([]),
  screenshots: jsonb("screenshots").default([]),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const testCasesTable = pgTable("test_cases", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  reportId: integer("report_id").notNull().references(() => testReportsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: testStatusEnum("status").notNull().default("pending"),
  priority: testPriorityEnum("priority").notNull().default("medium"),
  duration: numeric("duration", { precision: 10, scale: 3 }),
  errorMessage: text("error_message"),
  stackTrace: text("stack_trace"),
  reproductionSteps: jsonb("reproduction_steps").default([]),
  screenshots: jsonb("screenshots").default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTestReportSchema = createInsertSchema(testReportsTable);
export type InsertTestReport = z.infer<typeof insertTestReportSchema>;
export type TestReport = typeof testReportsTable.$inferSelect;

export const insertTestCaseSchema = createInsertSchema(testCasesTable);
export type InsertTestCase = z.infer<typeof insertTestCaseSchema>;
export type TestCase = typeof testCasesTable.$inferSelect;
