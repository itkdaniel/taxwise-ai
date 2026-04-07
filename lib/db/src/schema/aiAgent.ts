import { pgTable, text, integer, timestamp, jsonb, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const datasetTypeEnum = pgEnum("dataset_type", ["structured", "unstructured", "mixed", "scraped"]);
export const datasetStatusEnum = pgEnum("dataset_status", ["active", "processing", "archived"]);
export const trainingJobStatusEnum = pgEnum("training_job_status", ["queued", "running", "completed", "failed"]);

export const trainingDatasetsTable = pgTable("training_datasets", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  description: text("description"),
  type: datasetTypeEnum("type").notNull().default("structured"),
  status: datasetStatusEnum("status").notNull().default("active"),
  recordCount: integer("record_count").notNull().default(0),
  objectPath: text("object_path"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const trainingJobsTable = pgTable("training_jobs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  datasetId: integer("dataset_id").notNull().references(() => trainingDatasetsTable.id),
  modelName: text("model_name"),
  status: trainingJobStatusEnum("status").notNull().default("queued"),
  progress: numeric("progress", { precision: 5, scale: 2 }),
  metrics: jsonb("metrics").default({}),
  hyperparameters: jsonb("hyperparameters").default({}),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertTrainingDatasetSchema = createInsertSchema(trainingDatasetsTable);
export type InsertTrainingDataset = z.infer<typeof insertTrainingDatasetSchema>;
export type TrainingDataset = typeof trainingDatasetsTable.$inferSelect;

export const insertTrainingJobSchema = createInsertSchema(trainingJobsTable);
export type InsertTrainingJob = z.infer<typeof insertTrainingJobSchema>;
export type TrainingJob = typeof trainingJobsTable.$inferSelect;
