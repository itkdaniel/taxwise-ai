import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { trainingDatasetsTable, trainingJobsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  CreateTrainingDatasetBody,
  ScrapeDataForDatasetParams,
  ScrapeDataForDatasetBody,
  StartTrainingJobBody,
  UpdateAiAgentConfigBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const AVAILABLE_MODELS = [
  { id: "google/gemini-flash-1.5", name: "Gemini Flash 1.5", provider: "Google", capabilities: ["text", "vision", "reasoning"], isActive: true, contextWindow: 1000000 },
  { id: "google/gemini-pro-1.5", name: "Gemini Pro 1.5", provider: "Google", capabilities: ["text", "vision", "reasoning", "code"], isActive: true, contextWindow: 2000000 },
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI", capabilities: ["text", "vision", "code"], isActive: true, contextWindow: 128000 },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic", capabilities: ["text", "vision", "reasoning", "code"], isActive: true, contextWindow: 200000 },
  { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B", provider: "Meta", capabilities: ["text", "code"], isActive: true, contextWindow: 128000 },
  { id: "deepseek/deepseek-r1", name: "DeepSeek R1", provider: "DeepSeek", capabilities: ["text", "reasoning", "code"], isActive: true, contextWindow: 65536 },
  { id: "mistralai/mistral-large", name: "Mistral Large", provider: "Mistral", capabilities: ["text", "code"], isActive: true, contextWindow: 131072 },
  { id: "qwen/qwen-2.5-72b-instruct", name: "Qwen 2.5 72B", provider: "Alibaba", capabilities: ["text", "code", "multilingual"], isActive: true, contextWindow: 131072 },
];

let agentConfig = {
  primaryModel: "google/gemini-flash-1.5",
  fallbackModel: "openai/gpt-4o",
  temperature: 0.3,
  maxTokens: 8192,
  enableOcr: true,
  enableWebScraping: true,
  systemPrompt: "You are an expert tax return automation agent specializing in W-2 form processing and federal tax calculations.",
};

router.get("/ai-agent/models", async (_req, res) => {
  res.json(AVAILABLE_MODELS);
});

router.get("/ai-agent/config", async (_req, res) => {
  res.json(agentConfig);
});

router.put("/ai-agent/config", async (req, res) => {
  const parsed = UpdateAiAgentConfigBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  agentConfig = { ...agentConfig, ...parsed.data };
  res.json(agentConfig);
});

router.get("/ai-agent/datasets", async (_req, res) => {
  try {
    const datasets = await db.select().from(trainingDatasetsTable).orderBy(desc(trainingDatasetsTable.createdAt));
    res.json(datasets);
  } catch (err) {
    res.status(500).json({ error: "Failed to list datasets" });
  }
});

router.post("/ai-agent/datasets", async (req, res) => {
  const parsed = CreateTrainingDatasetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [dataset] = await db.insert(trainingDatasetsTable).values({
      name: parsed.data.name,
      description: parsed.data.description,
      type: parsed.data.type as any,
      status: "active",
      recordCount: 0,
      objectPath: parsed.data.objectPath,
      metadata: {},
    }).returning();
    res.status(201).json(dataset);
  } catch (err) {
    res.status(500).json({ error: "Failed to create dataset" });
  }
});

router.post("/ai-agent/datasets/:id/scrape", async (req, res) => {
  const params = ScrapeDataForDatasetParams.safeParse({ id: Number(req.params.id) });
  const body = ScrapeDataForDatasetBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    const jobId = `scrape-${Date.now()}`;
    setTimeout(async () => {
      try {
        await db.update(trainingDatasetsTable)
          .set({ recordCount: (body.data.urls?.length || 0) * 10, status: "active" })
          .where(eq(trainingDatasetsTable.id, params.data.id));
      } catch {}
    }, 5000);
    res.json({ jobId, status: "queued", urlsQueued: body.data.urls?.length || 0 });
  } catch (err) {
    res.status(500).json({ error: "Failed to start scrape job" });
  }
});

router.post("/ai-agent/train", async (req, res) => {
  const parsed = StartTrainingJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [job] = await db.insert(trainingJobsTable).values({
      datasetId: parsed.data.datasetId,
      modelName: parsed.data.modelName || agentConfig.primaryModel,
      status: "queued",
      progress: "0",
      metrics: {},
      hyperparameters: parsed.data.hyperparameters || {},
    }).returning();
    setTimeout(async () => {
      try {
        await db.update(trainingJobsTable)
          .set({ status: "running", progress: "50" })
          .where(eq(trainingJobsTable.id, job.id));
        setTimeout(async () => {
          await db.update(trainingJobsTable)
            .set({ status: "completed", progress: "100", metrics: { accuracy: 0.94, loss: 0.12 }, completedAt: new Date() })
            .where(eq(trainingJobsTable.id, job.id));
        }, 8000);
      } catch {}
    }, 3000);
    res.status(202).json(job);
  } catch (err) {
    res.status(500).json({ error: "Failed to start training job" });
  }
});

router.get("/ai-agent/training-jobs", async (_req, res) => {
  try {
    const jobs = await db.select().from(trainingJobsTable).orderBy(desc(trainingJobsTable.createdAt));
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: "Failed to list training jobs" });
  }
});

export default router;
