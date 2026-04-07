import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { logEntriesTable } from "@workspace/db";
import { eq, desc, gte } from "drizzle-orm";
import { ListLogsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

const LOG_SERVICES = ["api-server", "tax-engine", "ai-agent", "w2-extractor", "knowledge-graph", "test-runner"];

async function seedLogs() {
  try {
    const existing = await db.select().from(logEntriesTable);
    if (existing.length > 0) return;
    const levels: Array<"debug" | "info" | "warn" | "error" | "critical"> = ["debug", "info", "warn", "error", "critical"];
    const messages = [
      { level: "info" as const, message: "W-2 extraction completed successfully", service: "w2-extractor" },
      { level: "info" as const, message: "Tax return calculation finished for user", service: "tax-engine" },
      { level: "warn" as const, message: "AI extraction confidence below threshold (0.65)", service: "ai-agent" },
      { level: "error" as const, message: "Failed to connect to OpenRouter API", service: "ai-agent" },
      { level: "info" as const, message: "Knowledge graph entity created: TaxCode-2024", service: "knowledge-graph" },
      { level: "debug" as const, message: "Processing W-2 document ID 42", service: "w2-extractor" },
      { level: "critical" as const, message: "Database connection pool exhausted", service: "api-server" },
      { level: "info" as const, message: "Test suite completed: 47 passed, 3 failed", service: "test-runner" },
    ];
    for (const msg of messages) {
      await db.insert(logEntriesTable).values({ ...msg, metadata: {}, timestamp: new Date() });
    }
  } catch {}
}

seedLogs();

router.get("/logs", async (req, res) => {
  const query = ListLogsQueryParams.safeParse(req.query);
  try {
    let logs = await db.select().from(logEntriesTable).orderBy(desc(logEntriesTable.timestamp));
    if (query.success) {
      if (query.data.level) logs = logs.filter(l => l.level === query.data.level);
      if (query.data.service) logs = logs.filter(l => l.service === query.data.service);
      if (query.data.since) {
        const since = new Date(query.data.since);
        logs = logs.filter(l => l.timestamp >= since);
      }
      const limit = query.data.limit || 100;
      logs = logs.slice(0, limit);
    }
    res.json(logs);
  } catch (err) {
    req.log.error({ err }, "Failed to list logs");
    res.status(500).json({ error: "Failed to list logs" });
  }
});

export default router;
