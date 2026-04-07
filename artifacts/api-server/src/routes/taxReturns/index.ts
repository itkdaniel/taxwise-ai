import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { taxReturnsTable, w2DocumentsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import {
  CreateTaxReturnBody,
  UpdateTaxReturnBody,
  GetTaxReturnParams,
  UpdateTaxReturnParams,
  DeleteTaxReturnParams,
  CalculateTaxReturnParams,
  ValidateTaxReturnParams,
} from "@workspace/api-zod";
import { openrouter } from "@workspace/integrations-openrouter-ai";

const router: IRouter = Router();

router.get("/tax-returns", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const returns = await db
      .select()
      .from(taxReturnsTable)
      .where(eq(taxReturnsTable.userId, req.user.id))
      .orderBy(desc(taxReturnsTable.createdAt));
    res.json(returns);
  } catch (err) {
    req.log.error({ err }, "Failed to list tax returns");
    res.status(500).json({ error: "Failed to list tax returns" });
  }
});

router.post("/tax-returns", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = CreateTaxReturnBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [taxReturn] = await db
      .insert(taxReturnsTable)
      .values({
        userId: req.user.id,
        taxYear: parsed.data.taxYear,
        filingStatus: parsed.data.filingStatus as any,
        notes: parsed.data.notes,
        status: "draft",
      })
      .returning();
    res.status(201).json(taxReturn);
  } catch (err) {
    req.log.error({ err }, "Failed to create tax return");
    res.status(500).json({ error: "Failed to create tax return" });
  }
});

router.get("/tax-returns/summary", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const returns = await db
      .select()
      .from(taxReturnsTable)
      .where(eq(taxReturnsTable.userId, req.user.id))
      .orderBy(desc(taxReturnsTable.createdAt));

    const totalReturns = returns.length;
    const completedReturns = returns.filter(r => r.status === "complete").length;
    const pendingReturns = returns.filter(r => ["draft", "processing"].includes(r.status)).length;
    const totalEstimatedRefunds = returns.reduce((sum, r) => sum + Number(r.estimatedRefund || 0), 0);
    const totalEstimatedOwed = returns.reduce((sum, r) => sum + Number(r.estimatedOwed || 0), 0);
    const byStatus = returns.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      totalReturns,
      completedReturns,
      pendingReturns,
      totalEstimatedRefunds,
      totalEstimatedOwed,
      byStatus,
      recentActivity: returns.slice(0, 5),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get tax return summary");
    res.status(500).json({ error: "Failed to get summary" });
  }
});

router.get("/tax-returns/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = GetTaxReturnParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  try {
    const [taxReturn] = await db
      .select()
      .from(taxReturnsTable)
      .where(and(eq(taxReturnsTable.id, parsed.data.id), eq(taxReturnsTable.userId, req.user.id)));
    if (!taxReturn) {
      res.status(404).json({ error: "Tax return not found" });
      return;
    }
    const w2Docs = await db
      .select()
      .from(w2DocumentsTable)
      .where(eq(w2DocumentsTable.taxReturnId, parsed.data.id));
    res.json({ ...taxReturn, w2Documents: w2Docs, validationErrors: [] });
  } catch (err) {
    req.log.error({ err }, "Failed to get tax return");
    res.status(500).json({ error: "Failed to get tax return" });
  }
});

router.put("/tax-returns/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = UpdateTaxReturnParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateTaxReturnBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    const [updated] = await db
      .update(taxReturnsTable)
      .set({ ...body.data as any })
      .where(and(eq(taxReturnsTable.id, params.data.id), eq(taxReturnsTable.userId, req.user.id)))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Tax return not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update tax return");
    res.status(500).json({ error: "Failed to update tax return" });
  }
});

router.delete("/tax-returns/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = DeleteTaxReturnParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  try {
    await db.delete(taxReturnsTable).where(
      and(eq(taxReturnsTable.id, parsed.data.id), eq(taxReturnsTable.userId, req.user.id))
    );
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete tax return");
    res.status(500).json({ error: "Failed to delete tax return" });
  }
});

router.post("/tax-returns/:id/calculate", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = CalculateTaxReturnParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  try {
    const [taxReturn] = await db
      .select()
      .from(taxReturnsTable)
      .where(and(eq(taxReturnsTable.id, parsed.data.id), eq(taxReturnsTable.userId, req.user.id)));
    if (!taxReturn) {
      res.status(404).json({ error: "Tax return not found" });
      return;
    }
    const w2Docs = await db.select().from(w2DocumentsTable).where(eq(w2DocumentsTable.taxReturnId, parsed.data.id));
    const totalWages = w2Docs.reduce((sum, d) => sum + Number(d.wagesAndTips || 0), 0);
    const federalTaxWithheld = w2Docs.reduce((sum, d) => sum + Number(d.federalIncomeTax || 0), 0);

    const filingYear = taxReturn.taxYear;
    const standardDeduction = taxReturn.filingStatus === "married_filing_jointly" ? 29200 : 14600;
    const taxableIncome = Math.max(0, totalWages - standardDeduction);

    let taxLiability = 0;
    if (taxableIncome <= 11600) taxLiability = taxableIncome * 0.10;
    else if (taxableIncome <= 47150) taxLiability = 1160 + (taxableIncome - 11600) * 0.12;
    else if (taxableIncome <= 100525) taxLiability = 5426 + (taxableIncome - 47150) * 0.22;
    else if (taxableIncome <= 191950) taxLiability = 17168.5 + (taxableIncome - 100525) * 0.24;
    else taxLiability = 39110.5 + (taxableIncome - 191950) * 0.32;

    const effectiveTaxRate = totalWages > 0 ? (taxLiability / totalWages) * 100 : 0;
    const estimatedRefund = federalTaxWithheld > taxLiability ? federalTaxWithheld - taxLiability : 0;
    const estimatedOwed = taxLiability > federalTaxWithheld ? taxLiability - federalTaxWithheld : 0;

    await db.update(taxReturnsTable)
      .set({
        totalWages: String(totalWages),
        federalTaxWithheld: String(federalTaxWithheld),
        estimatedRefund: String(estimatedRefund),
        estimatedOwed: String(estimatedOwed),
        status: "validated",
      })
      .where(eq(taxReturnsTable.id, parsed.data.id));

    res.json({
      taxReturnId: parsed.data.id,
      totalWages,
      federalTaxWithheld,
      taxableIncome,
      taxLiability,
      effectiveTaxRate,
      standardDeduction,
      estimatedRefund,
      estimatedOwed,
      breakdown: {
        filingYear,
        filingStatus: taxReturn.filingStatus,
        w2Count: w2Docs.length,
        socialSecurityTax: w2Docs.reduce((sum, d) => sum + Number(d.socialSecurityTax || 0), 0),
        medicareTax: w2Docs.reduce((sum, d) => sum + Number(d.medicareTax || 0), 0),
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to calculate tax return");
    res.status(500).json({ error: "Failed to calculate tax return" });
  }
});

router.post("/tax-returns/:id/validate", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = ValidateTaxReturnParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  try {
    const [taxReturn] = await db
      .select()
      .from(taxReturnsTable)
      .where(and(eq(taxReturnsTable.id, parsed.data.id), eq(taxReturnsTable.userId, req.user.id)));
    if (!taxReturn) {
      res.status(404).json({ error: "Tax return not found" });
      return;
    }
    const w2Docs = await db.select().from(w2DocumentsTable).where(eq(w2DocumentsTable.taxReturnId, parsed.data.id));
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingFields: string[] = [];

    if (w2Docs.length === 0) errors.push("No W-2 documents attached to this tax return");
    w2Docs.forEach((doc, i) => {
      if (!doc.wagesAndTips) missingFields.push(`W-2 #${i + 1}: Wages and Tips (Box 1)`);
      if (!doc.federalIncomeTax) warnings.push(`W-2 #${i + 1}: Federal Income Tax Withheld (Box 2) is empty`);
      if (!doc.socialSecurityWages) warnings.push(`W-2 #${i + 1}: Social Security Wages (Box 3) is empty`);
    });

    const isValid = errors.length === 0;
    if (isValid) {
      await db.update(taxReturnsTable).set({ status: "validated" }).where(eq(taxReturnsTable.id, parsed.data.id));
    }

    res.json({ taxReturnId: parsed.data.id, isValid, errors, warnings, missingFields });
  } catch (err) {
    req.log.error({ err }, "Failed to validate tax return");
    res.status(500).json({ error: "Failed to validate tax return" });
  }
});

export default router;
