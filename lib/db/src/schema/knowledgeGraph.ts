import { pgTable, text, integer, timestamp, jsonb, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const graphEntitiesTable = pgTable("graph_entities", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  properties: jsonb("properties").default({}),
  color: text("color"),
  size: numeric("size", { precision: 8, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const graphConnectionsTable = pgTable("graph_connections", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sourceId: integer("source_id").notNull().references(() => graphEntitiesTable.id, { onDelete: "cascade" }),
  targetId: integer("target_id").notNull().references(() => graphEntitiesTable.id, { onDelete: "cascade" }),
  relationshipType: text("relationship_type").notNull(),
  weight: numeric("weight", { precision: 8, scale: 4 }),
  properties: jsonb("properties").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGraphEntitySchema = createInsertSchema(graphEntitiesTable);
export type InsertGraphEntity = z.infer<typeof insertGraphEntitySchema>;
export type GraphEntity = typeof graphEntitiesTable.$inferSelect;

export const insertGraphConnectionSchema = createInsertSchema(graphConnectionsTable);
export type InsertGraphConnection = z.infer<typeof insertGraphConnectionSchema>;
export type GraphConnection = typeof graphConnectionsTable.$inferSelect;
