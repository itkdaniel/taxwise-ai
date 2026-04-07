import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { testReportsTable, testCasesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  CreateTestReportBody,
  UpdateTestReportBody,
  GetTestReportParams,
  UpdateTestReportParams,
  ExportTestReportParams,
  ExportTestReportBody,
  RunTestsBody,
  ListTestReportsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/test-reports", async (req, res) => {
  const query = ListTestReportsQueryParams.safeParse(req.query);
  try {
    let reports = await db.select().from(testReportsTable).orderBy(desc(testReportsTable.createdAt));
    if (query.success) {
      if (query.data.status) reports = reports.filter(r => r.status === query.data.status);
      if (query.data.priority) reports = reports.filter(r => r.priority === query.data.priority);
      if (query.data.type) reports = reports.filter(r => r.type === query.data.type);
      if (query.data.search) {
        const s = query.data.search.toLowerCase();
        reports = reports.filter(r => r.name.toLowerCase().includes(s));
      }
    }
    const result = reports.map(r => ({
      ...r,
      tags: (r.tags as string[]) || [],
      errorMessages: undefined,
      reproductionSteps: undefined,
      screenshots: undefined,
    }));
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list test reports");
    res.status(500).json({ error: "Failed to list test reports" });
  }
});

router.get("/test-reports/stats", async (req, res) => {
  try {
    const reports = await db.select().from(testReportsTable);
    const totalReports = reports.length;
    const totalTests = reports.reduce((sum, r) => sum + r.totalTests, 0);
    const totalPassed = reports.reduce((sum, r) => sum + r.passedTests, 0);
    const passRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
    const byType = reports.reduce((acc, r) => { acc[r.type] = (acc[r.type] || 0) + 1; return acc; }, {} as Record<string, number>);
    const byStatus = reports.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {} as Record<string, number>);
    const byPriority = reports.reduce((acc, r) => { acc[r.priority] = (acc[r.priority] || 0) + 1; return acc; }, {} as Record<string, number>);
    res.json({ totalReports, totalTests, passRate, byType, byStatus, byPriority, trend: [] });
  } catch (err) {
    req.log.error({ err }, "Failed to get test stats");
    res.status(500).json({ error: "Failed to get test stats" });
  }
});

router.post("/test-reports/run", async (req, res) => {
  const parsed = RunTestsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const totalTests = Math.floor(Math.random() * 50) + 20;
    const failedTests = Math.floor(Math.random() * 5);
    const passedTests = totalTests - failedTests;
    const [report] = await db.insert(testReportsTable).values({
      name: `${parsed.data.type.toUpperCase()} Test Run - ${new Date().toISOString()}`,
      type: parsed.data.type as any,
      status: "running",
      priority: (parsed.data.priority || "medium") as any,
      totalTests,
      passedTests,
      failedTests,
      skippedTests: 0,
      environment: parsed.data.environment || "development",
      tags: [],
      errorMessages: failedTests > 0 ? ["AssertionError: Expected value to be true", "TimeoutError: Test exceeded 5000ms"] : [],
      reproductionSteps: failedTests > 0 ? ["1. Navigate to /tax-returns", "2. Click 'Calculate'", "3. Observe error in console"] : [],
      screenshots: [],
      metadata: {},
    }).returning();
    setTimeout(async () => {
      await db.update(testReportsTable).set({ status: failedTests > 0 ? "partial" : "passed", duration: String(Math.random() * 10 + 2) }).where(eq(testReportsTable.id, report.id));
    }, 3000);
    res.status(202).json({ ...report, tags: [], errorMessages: [], reproductionSteps: [], screenshots: [] });
  } catch (err) {
    req.log.error({ err }, "Failed to run tests");
    res.status(500).json({ error: "Failed to run tests" });
  }
});

router.post("/test-reports", async (req, res) => {
  const parsed = CreateTestReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [report] = await db.insert(testReportsTable).values({
      name: parsed.data.name,
      type: parsed.data.type as any,
      priority: parsed.data.priority as any,
      status: "pending",
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      environment: parsed.data.environment,
      branch: parsed.data.branch,
      commitHash: parsed.data.commitHash,
      tags: parsed.data.tags || [],
      errorMessages: [],
      reproductionSteps: [],
      screenshots: [],
      metadata: {},
    }).returning();
    res.status(201).json({ ...report, tags: (report.tags as string[]) || [] });
  } catch (err) {
    req.log.error({ err }, "Failed to create test report");
    res.status(500).json({ error: "Failed to create test report" });
  }
});

router.get("/test-reports/:id", async (req, res) => {
  const parsed = GetTestReportParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  try {
    const [report] = await db.select().from(testReportsTable).where(eq(testReportsTable.id, parsed.data.id));
    if (!report) {
      res.status(404).json({ error: "Test report not found" });
      return;
    }
    const testCases = await db.select().from(testCasesTable).where(eq(testCasesTable.reportId, parsed.data.id));
    res.json({
      ...report,
      tags: (report.tags as string[]) || [],
      errorMessages: (report.errorMessages as string[]) || [],
      reproductionSteps: (report.reproductionSteps as string[]) || [],
      screenshots: (report.screenshots as string[]) || [],
      testCases,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get test report");
    res.status(500).json({ error: "Failed to get test report" });
  }
});

router.put("/test-reports/:id", async (req, res) => {
  const params = UpdateTestReportParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateTestReportBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    const updateData: Record<string, any> = {};
    if (body.data.name) updateData.name = body.data.name;
    if (body.data.status) updateData.status = body.data.status;
    if (body.data.priority) updateData.priority = body.data.priority;
    if (body.data.tags) updateData.tags = body.data.tags;
    if (body.data.environment) updateData.environment = body.data.environment;
    const [updated] = await db.update(testReportsTable).set(updateData).where(eq(testReportsTable.id, params.data.id)).returning();
    if (!updated) {
      res.status(404).json({ error: "Test report not found" });
      return;
    }
    res.json({ ...updated, tags: (updated.tags as string[]) || [] });
  } catch (err) {
    req.log.error({ err }, "Failed to update test report");
    res.status(500).json({ error: "Failed to update test report" });
  }
});

router.post("/test-reports/:id/export", async (req, res) => {
  const params = ExportTestReportParams.safeParse({ id: Number(req.params.id) });
  const body = ExportTestReportBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    const [report] = await db.select().from(testReportsTable).where(eq(testReportsTable.id, params.data.id));
    if (!report) {
      res.status(404).json({ error: "Test report not found" });
      return;
    }
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const downloadUrl = `/api/test-reports/${params.data.id}/download?format=${body.data.format}&token=export-${Date.now()}`;
    res.json({ downloadUrl, format: body.data.format, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to export test report");
    res.status(500).json({ error: "Failed to export test report" });
  }
});

export default router;
