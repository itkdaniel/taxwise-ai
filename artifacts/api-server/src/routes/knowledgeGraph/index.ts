import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { graphEntitiesTable, graphConnectionsTable } from "@workspace/db";
import { eq, like, or, sql } from "drizzle-orm";
import {
  CreateEntityBody,
  UpdateEntityBody,
  GetEntityParams,
  UpdateEntityParams,
  DeleteEntityParams,
  CreateConnectionBody,
  ListEntitiesQueryParams,
  GetFullGraphQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/knowledge-graph/entities", async (req, res) => {
  const query = ListEntitiesQueryParams.safeParse(req.query);
  try {
    let entities = await db.select().from(graphEntitiesTable);
    if (query.success) {
      if (query.data.search) {
        const s = query.data.search.toLowerCase();
        entities = entities.filter(e => e.name.toLowerCase().includes(s) || e.type.toLowerCase().includes(s));
      }
      if (query.data.type) {
        entities = entities.filter(e => e.type === query.data.type);
      }
    }
    const connections = await db.select().from(graphConnectionsTable);
    const countMap = new Map<number, number>();
    connections.forEach(c => {
      countMap.set(c.sourceId, (countMap.get(c.sourceId) || 0) + 1);
      countMap.set(c.targetId, (countMap.get(c.targetId) || 0) + 1);
    });
    const enriched = entities.map(e => ({ ...e, connectionCount: countMap.get(e.id) || 0 }));
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Failed to list entities");
    res.status(500).json({ error: "Failed to list entities" });
  }
});

router.post("/knowledge-graph/entities", async (req, res) => {
  const parsed = CreateEntityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [entity] = await db
      .insert(graphEntitiesTable)
      .values({
        name: parsed.data.name,
        type: parsed.data.type,
        description: parsed.data.description,
        properties: parsed.data.properties || {},
        color: parsed.data.color,
        size: parsed.data.size != null ? String(parsed.data.size) : undefined,
      })
      .returning();
    res.status(201).json({ ...entity, connectionCount: 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to create entity");
    res.status(500).json({ error: "Failed to create entity" });
  }
});

router.get("/knowledge-graph/entities/:id", async (req, res) => {
  const parsed = GetEntityParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  try {
    const [entity] = await db.select().from(graphEntitiesTable).where(eq(graphEntitiesTable.id, parsed.data.id));
    if (!entity) {
      res.status(404).json({ error: "Entity not found" });
      return;
    }
    const connections = await db
      .select()
      .from(graphConnectionsTable)
      .where(
        or(eq(graphConnectionsTable.sourceId, parsed.data.id), eq(graphConnectionsTable.targetId, parsed.data.id))
      );
    res.json({ ...entity, connectionCount: connections.length, connections });
  } catch (err) {
    req.log.error({ err }, "Failed to get entity");
    res.status(500).json({ error: "Failed to get entity" });
  }
});

router.put("/knowledge-graph/entities/:id", async (req, res) => {
  const params = UpdateEntityParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateEntityBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    const updateData: Record<string, any> = {};
    if (body.data.name) updateData.name = body.data.name;
    if (body.data.type) updateData.type = body.data.type;
    if (body.data.description !== undefined) updateData.description = body.data.description;
    if (body.data.properties !== undefined) updateData.properties = body.data.properties;
    if (body.data.color !== undefined) updateData.color = body.data.color;
    if (body.data.size != null) updateData.size = String(body.data.size);
    const [updated] = await db.update(graphEntitiesTable).set(updateData).where(eq(graphEntitiesTable.id, params.data.id)).returning();
    if (!updated) {
      res.status(404).json({ error: "Entity not found" });
      return;
    }
    res.json({ ...updated, connectionCount: 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to update entity");
    res.status(500).json({ error: "Failed to update entity" });
  }
});

router.delete("/knowledge-graph/entities/:id", async (req, res) => {
  const parsed = DeleteEntityParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  try {
    await db.delete(graphEntitiesTable).where(eq(graphEntitiesTable.id, parsed.data.id));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete entity");
    res.status(500).json({ error: "Failed to delete entity" });
  }
});

router.get("/knowledge-graph/connections", async (req, res) => {
  try {
    const connections = await db.select().from(graphConnectionsTable);
    const entities = await db.select({ id: graphEntitiesTable.id, name: graphEntitiesTable.name }).from(graphEntitiesTable);
    const nameMap = new Map(entities.map(e => [e.id, e.name]));
    const enriched = connections.map(c => ({
      ...c,
      sourceName: nameMap.get(c.sourceId),
      targetName: nameMap.get(c.targetId),
    }));
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Failed to list connections");
    res.status(500).json({ error: "Failed to list connections" });
  }
});

router.post("/knowledge-graph/connections", async (req, res) => {
  const parsed = CreateConnectionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [connection] = await db
      .insert(graphConnectionsTable)
      .values({
        sourceId: parsed.data.sourceId,
        targetId: parsed.data.targetId,
        relationshipType: parsed.data.relationshipType,
        weight: parsed.data.weight != null ? String(parsed.data.weight) : undefined,
        properties: parsed.data.properties || {},
      })
      .returning();
    res.status(201).json(connection);
  } catch (err) {
    req.log.error({ err }, "Failed to create connection");
    res.status(500).json({ error: "Failed to create connection" });
  }
});

router.get("/knowledge-graph/graph", async (req, res) => {
  const query = GetFullGraphQueryParams.safeParse(req.query);
  try {
    let entities = await db.select().from(graphEntitiesTable);
    if (query.success) {
      if (query.data.search) {
        const s = query.data.search.toLowerCase();
        entities = entities.filter(e => e.name.toLowerCase().includes(s) || e.type.toLowerCase().includes(s));
      }
      if (query.data.entityType) {
        entities = entities.filter(e => e.type === query.data.entityType);
      }
    }
    const entityIds = new Set(entities.map(e => e.id));
    const allConnections = await db.select().from(graphConnectionsTable);
    const connections = allConnections.filter(c => entityIds.has(c.sourceId) && entityIds.has(c.targetId));
    const nameMap = new Map(entities.map(e => [e.id, e.name]));
    const enrichedConnections = connections.map(c => ({
      ...c,
      sourceName: nameMap.get(c.sourceId),
      targetName: nameMap.get(c.targetId),
    }));
    const countMap = new Map<number, number>();
    connections.forEach(c => {
      countMap.set(c.sourceId, (countMap.get(c.sourceId) || 0) + 1);
      countMap.set(c.targetId, (countMap.get(c.targetId) || 0) + 1);
    });
    const enrichedEntities = entities.map(e => ({ ...e, connectionCount: countMap.get(e.id) || 0 }));
    const types = [...new Set(entities.map(e => e.type))];
    res.json({
      nodes: enrichedEntities,
      edges: enrichedConnections,
      stats: { totalNodes: entities.length, totalEdges: connections.length, clusters: types.length },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get graph data");
    res.status(500).json({ error: "Failed to get graph data" });
  }
});

export default router;
