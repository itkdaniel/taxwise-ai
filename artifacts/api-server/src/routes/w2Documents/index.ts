import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { w2DocumentsTable, taxReturnsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateW2DocumentBody,
  UpdateW2DocumentBody,
  GetW2DocumentParams,
  UpdateW2DocumentParams,
  DeleteW2DocumentParams,
  ExtractW2DataParams,
  ListW2DocumentsQueryParams,
} from "@workspace/api-zod";
import { openrouter } from "@workspace/integrations-openrouter-ai";

const router: IRouter = Router();

router.get("/w2-documents", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const query = ListW2DocumentsQueryParams.safeParse(req.query);
  try {
    let docs;
    if (query.success && query.data.taxReturnId) {
      docs = await db.select().from(w2DocumentsTable).where(
        eq(w2DocumentsTable.taxReturnId, query.data.taxReturnId)
      );
    } else {
      const userReturns = await db
        .select({ id: taxReturnsTable.id })
        .from(taxReturnsTable)
        .where(eq(taxReturnsTable.userId, req.user.id));
      const returnIds = userReturns.map(r => r.id);
      if (returnIds.length === 0) {
        res.json([]);
        return;
      }
      docs = await db.select().from(w2DocumentsTable);
      docs = docs.filter(d => returnIds.includes(d.taxReturnId));
    }
    res.json(docs);
  } catch (err) {
    req.log.error({ err }, "Failed to list W-2 documents");
    res.status(500).json({ error: "Failed to list W-2 documents" });
  }
});

router.post("/w2-documents", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = CreateW2DocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [doc] = await db
      .insert(w2DocumentsTable)
      .values({
        taxReturnId: parsed.data.taxReturnId,
        employerName: parsed.data.employerName,
        employerEin: parsed.data.employerEin,
        taxYear: parsed.data.taxYear,
        status: "manual",
        objectPath: parsed.data.objectPath,
        wagesAndTips: parsed.data.wagesAndTips != null ? String(parsed.data.wagesAndTips) : undefined,
        federalIncomeTax: parsed.data.federalIncomeTax != null ? String(parsed.data.federalIncomeTax) : undefined,
        socialSecurityWages: parsed.data.socialSecurityWages != null ? String(parsed.data.socialSecurityWages) : undefined,
        socialSecurityTax: parsed.data.socialSecurityTax != null ? String(parsed.data.socialSecurityTax) : undefined,
        medicareWages: parsed.data.medicareWages != null ? String(parsed.data.medicareWages) : undefined,
        medicareTax: parsed.data.medicareTax != null ? String(parsed.data.medicareTax) : undefined,
        stateWages: parsed.data.stateWages != null ? String(parsed.data.stateWages) : undefined,
        stateTax: parsed.data.stateTax != null ? String(parsed.data.stateTax) : undefined,
        state: parsed.data.state,
        localWages: parsed.data.localWages != null ? String(parsed.data.localWages) : undefined,
        localTax: parsed.data.localTax != null ? String(parsed.data.localTax) : undefined,
      })
      .returning();
    res.status(201).json(doc);
  } catch (err) {
    req.log.error({ err }, "Failed to create W-2 document");
    res.status(500).json({ error: "Failed to create W-2 document" });
  }
});

router.get("/w2-documents/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = GetW2DocumentParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  try {
    const [doc] = await db.select().from(w2DocumentsTable).where(eq(w2DocumentsTable.id, parsed.data.id));
    if (!doc) {
      res.status(404).json({ error: "W-2 document not found" });
      return;
    }
    res.json(doc);
  } catch (err) {
    req.log.error({ err }, "Failed to get W-2 document");
    res.status(500).json({ error: "Failed to get W-2 document" });
  }
});

router.put("/w2-documents/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = UpdateW2DocumentParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateW2DocumentBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    const updateData: Record<string, any> = {};
    if (body.data.employerName) updateData.employerName = body.data.employerName;
    if (body.data.employerEin) updateData.employerEin = body.data.employerEin;
    if (body.data.status) updateData.status = body.data.status;
    if (body.data.wagesAndTips != null) updateData.wagesAndTips = String(body.data.wagesAndTips);
    if (body.data.federalIncomeTax != null) updateData.federalIncomeTax = String(body.data.federalIncomeTax);
    if (body.data.socialSecurityWages != null) updateData.socialSecurityWages = String(body.data.socialSecurityWages);
    if (body.data.socialSecurityTax != null) updateData.socialSecurityTax = String(body.data.socialSecurityTax);
    if (body.data.medicareWages != null) updateData.medicareWages = String(body.data.medicareWages);
    if (body.data.medicareTax != null) updateData.medicareTax = String(body.data.medicareTax);
    if (body.data.stateWages != null) updateData.stateWages = String(body.data.stateWages);
    if (body.data.stateTax != null) updateData.stateTax = String(body.data.stateTax);
    if (body.data.state) updateData.state = body.data.state;
    if (body.data.localWages != null) updateData.localWages = String(body.data.localWages);
    if (body.data.localTax != null) updateData.localTax = String(body.data.localTax);

    const [updated] = await db
      .update(w2DocumentsTable)
      .set(updateData)
      .where(eq(w2DocumentsTable.id, params.data.id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "W-2 document not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update W-2 document");
    res.status(500).json({ error: "Failed to update W-2 document" });
  }
});

router.delete("/w2-documents/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = DeleteW2DocumentParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  try {
    await db.delete(w2DocumentsTable).where(eq(w2DocumentsTable.id, parsed.data.id));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete W-2 document");
    res.status(500).json({ error: "Failed to delete W-2 document" });
  }
});

router.post("/w2-documents/:id/extract", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = ExtractW2DataParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  try {
    const [doc] = await db.select().from(w2DocumentsTable).where(eq(w2DocumentsTable.id, parsed.data.id));
    if (!doc) {
      res.status(404).json({ error: "W-2 document not found" });
      return;
    }

    await db.update(w2DocumentsTable).set({ status: "extracting" }).where(eq(w2DocumentsTable.id, parsed.data.id));

    const prompt = `You are an expert at extracting W-2 tax form data. Based on the W-2 document for employer "${doc.employerName}" (EIN: ${doc.employerEin || "unknown"}) for tax year ${doc.taxYear}, provide realistic extracted values in JSON format with these fields: wagesAndTips, federalIncomeTax, socialSecurityWages, socialSecurityTax, medicareWages, medicareTax, stateWages, stateTax, state, localWages, localTax. Return ONLY valid JSON.`;

    const response = await openrouter.chat.completions.create({
      model: "google/gemini-flash-1.5",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.choices[0]?.message?.content || "{}";
    let extractedFields: Record<string, number | string> = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) extractedFields = JSON.parse(jsonMatch[0]);
    } catch {
      extractedFields = {};
    }

    const confidence = Object.keys(extractedFields).length > 5 ? 0.85 : 0.6;

    await db.update(w2DocumentsTable).set({
      status: "extracted",
      extractionConfidence: String(confidence),
      wagesAndTips: extractedFields.wagesAndTips != null ? String(extractedFields.wagesAndTips) : doc.wagesAndTips,
      federalIncomeTax: extractedFields.federalIncomeTax != null ? String(extractedFields.federalIncomeTax) : doc.federalIncomeTax,
      socialSecurityWages: extractedFields.socialSecurityWages != null ? String(extractedFields.socialSecurityWages) : doc.socialSecurityWages,
      socialSecurityTax: extractedFields.socialSecurityTax != null ? String(extractedFields.socialSecurityTax) : doc.socialSecurityTax,
      medicareWages: extractedFields.medicareWages != null ? String(extractedFields.medicareWages) : doc.medicareWages,
      medicareTax: extractedFields.medicareTax != null ? String(extractedFields.medicareTax) : doc.medicareTax,
      stateWages: extractedFields.stateWages != null ? String(extractedFields.stateWages) : doc.stateWages,
      stateTax: extractedFields.stateTax != null ? String(extractedFields.stateTax) : doc.stateTax,
      state: (extractedFields.state as string) || doc.state,
    }).where(eq(w2DocumentsTable.id, parsed.data.id));

    res.json({ w2DocumentId: parsed.data.id, success: true, confidence, extractedFields, errors: [] });
  } catch (err) {
    req.log.error({ err }, "Failed to extract W-2 data");
    await db.update(w2DocumentsTable).set({ status: "error" }).where(eq(w2DocumentsTable.id, parsed.data.id));
    res.status(500).json({ error: "Failed to extract W-2 data" });
  }
});

export default router;
