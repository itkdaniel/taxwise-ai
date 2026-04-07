/**
 * TaxWise AI — End-to-End Test Seed Script
 *
 * Populates every database table with realistic mock data so all
 * application workflows can be exercised without real user auth.
 *
 * Run:  npx tsx scripts/seed.ts
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../lib/db/src/schema/index.js";
import {
  usersTable,
  sessionsTable,
  taxReturnsTable,
  w2DocumentsTable,
  trainingDatasetsTable,
  trainingJobsTable,
  graphEntitiesTable,
  graphConnectionsTable,
  testReportsTable,
  testCasesTable,
  logEntriesTable,
  conversations,
  messages,
} from "../lib/db/src/schema/index.js";
import { eq, sql } from "drizzle-orm";

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toFixed(2);
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ─── users ──────────────────────────────────────────────────────────────────

const TEST_USERS = [
  {
    id: "seed-user-alice-001",
    email: "alice.johnson@taxwisetest.dev",
    firstName: "Alice",
    lastName: "Johnson",
    profileImageUrl: "https://api.dicebear.com/9.x/personas/svg?seed=alice",
  },
  {
    id: "seed-user-bob-002",
    email: "bob.carter@taxwisetest.dev",
    firstName: "Bob",
    lastName: "Carter",
    profileImageUrl: "https://api.dicebear.com/9.x/personas/svg?seed=bob",
  },
  {
    id: "seed-user-carol-003",
    email: "carol.smith@taxwisetest.dev",
    firstName: "Carol",
    lastName: "Smith",
    profileImageUrl: "https://api.dicebear.com/9.x/personas/svg?seed=carol",
  },
];

// ─── seed functions ──────────────────────────────────────────────────────────

async function seedUsers() {
  console.log("  → users");
  for (const u of TEST_USERS) {
    await db
      .insert(usersTable)
      .values(u)
      .onConflictDoUpdate({
        target: usersTable.id,
        set: { email: u.email, firstName: u.firstName, lastName: u.lastName, updatedAt: new Date() },
      });
  }
  return TEST_USERS.map((u) => u.id);
}

async function seedTaxReturns(userIds: string[]) {
  console.log("  → tax_returns");

  // Clear old seed data first
  await db.delete(taxReturnsTable).where(
    sql`user_id = ANY(ARRAY[${sql.raw(userIds.map((id) => `'${id}'`).join(","))}]::text[])`
  );

  const rows = [
    // Alice — 2024 complete with big refund
    {
      userId: userIds[0],
      taxYear: 2024,
      status: "complete" as const,
      filingStatus: "single" as const,
      totalWages: fmt(87400),
      federalTaxWithheld: fmt(14200),
      estimatedRefund: fmt(2340.5),
      estimatedOwed: fmt(0),
      notes: "Primary employment at Acme Corp + freelance consulting income",
    },
    // Alice — 2023 validated, married filing jointly
    {
      userId: userIds[0],
      taxYear: 2023,
      status: "validated" as const,
      filingStatus: "married_filing_jointly" as const,
      totalWages: fmt(142800),
      federalTaxWithheld: fmt(22100),
      estimatedRefund: fmt(0),
      estimatedOwed: fmt(1850.75),
      notes: "Two W-2s — Alice + spouse John",
    },
    // Alice — 2022 draft
    {
      userId: userIds[0],
      taxYear: 2022,
      status: "draft" as const,
      filingStatus: "single" as const,
      totalWages: null,
      federalTaxWithheld: null,
      estimatedRefund: null,
      estimatedOwed: null,
      notes: "W-2 pending from previous employer",
    },

    // Bob — 2024 processing
    {
      userId: userIds[1],
      taxYear: 2024,
      status: "processing" as const,
      filingStatus: "head_of_household" as const,
      totalWages: fmt(63250),
      federalTaxWithheld: fmt(8900),
      estimatedRefund: fmt(1420.0),
      estimatedOwed: fmt(0),
      notes: "Single parent — head of household with child tax credit",
    },
    // Bob — 2023 error
    {
      userId: userIds[1],
      taxYear: 2023,
      status: "error" as const,
      filingStatus: "head_of_household" as const,
      totalWages: fmt(58000),
      federalTaxWithheld: fmt(7200),
      estimatedRefund: null,
      estimatedOwed: null,
      notes: "Extraction failed — employer EIN mismatch",
    },

    // Carol — 2024 validated, married filing jointly, high income
    {
      userId: userIds[2],
      taxYear: 2024,
      status: "validated" as const,
      filingStatus: "married_filing_jointly" as const,
      totalWages: fmt(298500),
      federalTaxWithheld: fmt(68200),
      estimatedRefund: fmt(0),
      estimatedOwed: fmt(4320.0),
      notes: "Senior engineer + spouse, AMT may apply",
    },
    // Carol — 2024 second return (draft)
    {
      userId: userIds[2],
      taxYear: 2023,
      status: "complete" as const,
      filingStatus: "married_filing_jointly" as const,
      totalWages: fmt(261000),
      federalTaxWithheld: fmt(59400),
      estimatedRefund: fmt(3100.0),
      estimatedOwed: fmt(0),
      notes: "Prior year — filed and accepted",
    },
  ];

  const inserted = await db.insert(taxReturnsTable).values(rows).returning({ id: taxReturnsTable.id });
  return inserted.map((r) => r.id);
}

async function seedW2Documents(taxReturnIds: number[]) {
  console.log("  → w2_documents");

  // Clear old seed data
  for (const id of taxReturnIds) {
    await db.delete(w2DocumentsTable).where(eq(w2DocumentsTable.taxReturnId, id));
  }

  const docs = [
    // Return 0: Alice 2024 complete — 2 W-2s
    {
      taxReturnId: taxReturnIds[0],
      employerName: "Acme Corporation",
      employerEin: "12-3456789",
      taxYear: 2024,
      status: "extracted" as const,
      wagesAndTips: fmt(72400),
      federalIncomeTax: fmt(11800),
      socialSecurityWages: fmt(72400),
      socialSecurityTax: fmt(4488.8),
      medicareWages: fmt(72400),
      medicareTax: fmt(1049.8),
      stateWages: fmt(72400),
      stateTax: fmt(3620.0),
      state: "CA",
      localWages: fmt(72400),
      localTax: fmt(724.0),
      extractionConfidence: "0.9720",
    },
    {
      taxReturnId: taxReturnIds[0],
      employerName: "TechConsult LLC",
      employerEin: "98-7654321",
      taxYear: 2024,
      status: "manual" as const,
      wagesAndTips: fmt(15000),
      federalIncomeTax: fmt(2400),
      socialSecurityWages: fmt(15000),
      socialSecurityTax: fmt(930.0),
      medicareWages: fmt(15000),
      medicareTax: fmt(217.5),
      stateWages: fmt(15000),
      stateTax: fmt(750.0),
      state: "CA",
      localWages: null,
      localTax: null,
      extractionConfidence: null,
    },

    // Return 1: Alice 2023 married — 2 W-2s
    {
      taxReturnId: taxReturnIds[1],
      employerName: "Acme Corporation",
      employerEin: "12-3456789",
      taxYear: 2023,
      status: "extracted" as const,
      wagesAndTips: fmt(68000),
      federalIncomeTax: fmt(11200),
      socialSecurityWages: fmt(68000),
      socialSecurityTax: fmt(4216.0),
      medicareWages: fmt(68000),
      medicareTax: fmt(986.0),
      stateWages: fmt(68000),
      stateTax: fmt(3400.0),
      state: "CA",
      localWages: null,
      localTax: null,
      extractionConfidence: "0.9480",
    },
    {
      taxReturnId: taxReturnIds[1],
      employerName: "Global Finance Partners",
      employerEin: "55-1122334",
      taxYear: 2023,
      status: "extracted" as const,
      wagesAndTips: fmt(74800),
      federalIncomeTax: fmt(10900),
      socialSecurityWages: fmt(74800),
      socialSecurityTax: fmt(4637.6),
      medicareWages: fmt(74800),
      medicareTax: fmt(1084.6),
      stateWages: fmt(74800),
      stateTax: fmt(3740.0),
      state: "NY",
      localWages: fmt(74800),
      localTax: fmt(2990.0),
      extractionConfidence: "0.9130",
    },

    // Return 2: Alice 2022 draft — 1 pending W-2
    {
      taxReturnId: taxReturnIds[2],
      employerName: "StartupXYZ Inc.",
      employerEin: "77-9988776",
      taxYear: 2022,
      status: "pending" as const,
      wagesAndTips: null,
      federalIncomeTax: null,
      socialSecurityWages: null,
      socialSecurityTax: null,
      medicareWages: null,
      medicareTax: null,
      stateWages: null,
      stateTax: null,
      state: "TX",
      localWages: null,
      localTax: null,
      extractionConfidence: null,
    },

    // Return 3: Bob 2024 processing
    {
      taxReturnId: taxReturnIds[3],
      employerName: "Metro City Schools",
      employerEin: "44-3311220",
      taxYear: 2024,
      status: "extracted" as const,
      wagesAndTips: fmt(63250),
      federalIncomeTax: fmt(8900),
      socialSecurityWages: fmt(63250),
      socialSecurityTax: fmt(3921.5),
      medicareWages: fmt(63250),
      medicareTax: fmt(917.13),
      stateWages: fmt(63250),
      stateTax: fmt(2530.0),
      state: "OH",
      localWages: fmt(63250),
      localTax: fmt(632.5),
      extractionConfidence: "0.8850",
    },

    // Return 4: Bob 2023 error — partial data
    {
      taxReturnId: taxReturnIds[4],
      employerName: "Metro City Schools",
      employerEin: "44-3311220",
      taxYear: 2023,
      status: "error" as const,
      wagesAndTips: fmt(58000),
      federalIncomeTax: fmt(7200),
      socialSecurityWages: null,
      socialSecurityTax: null,
      medicareWages: null,
      medicareTax: null,
      stateWages: null,
      stateTax: null,
      state: "OH",
      localWages: null,
      localTax: null,
      extractionConfidence: "0.3100",
    },

    // Return 5: Carol 2024 validated — 3 W-2s (dual income, high earners)
    {
      taxReturnId: taxReturnIds[5],
      employerName: "Quantum Systems Inc.",
      employerEin: "22-4455667",
      taxYear: 2024,
      status: "extracted" as const,
      wagesAndTips: fmt(185000),
      federalIncomeTax: fmt(42000),
      socialSecurityWages: fmt(160200),
      socialSecurityTax: fmt(9932.4),
      medicareWages: fmt(185000),
      medicareTax: fmt(2682.5),
      stateWages: fmt(185000),
      stateTax: fmt(16650.0),
      state: "WA",
      localWages: null,
      localTax: null,
      extractionConfidence: "0.9870",
    },
    {
      taxReturnId: taxReturnIds[5],
      employerName: "Northwest Medical Group",
      employerEin: "33-6677889",
      taxYear: 2024,
      status: "extracted" as const,
      wagesAndTips: fmt(113500),
      federalIncomeTax: fmt(26200),
      socialSecurityWages: fmt(113500),
      socialSecurityTax: fmt(7037.0),
      medicareWages: fmt(113500),
      medicareTax: fmt(1645.75),
      stateWages: fmt(113500),
      stateTax: fmt(10215.0),
      state: "WA",
      localWages: null,
      localTax: null,
      extractionConfidence: "0.9650",
    },

    // Return 6: Carol 2023 complete
    {
      taxReturnId: taxReturnIds[6],
      employerName: "Quantum Systems Inc.",
      employerEin: "22-4455667",
      taxYear: 2023,
      status: "extracted" as const,
      wagesAndTips: fmt(162000),
      federalIncomeTax: fmt(35200),
      socialSecurityWages: fmt(160200),
      socialSecurityTax: fmt(9932.4),
      medicareWages: fmt(162000),
      medicareTax: fmt(2349.0),
      stateWages: fmt(162000),
      stateTax: fmt(14580.0),
      state: "WA",
      localWages: null,
      localTax: null,
      extractionConfidence: "0.9540",
    },
    {
      taxReturnId: taxReturnIds[6],
      employerName: "Northwest Medical Group",
      employerEin: "33-6677889",
      taxYear: 2023,
      status: "extracted" as const,
      wagesAndTips: fmt(99000),
      federalIncomeTax: fmt(24200),
      socialSecurityWages: fmt(99000),
      socialSecurityTax: fmt(6138.0),
      medicareWages: fmt(99000),
      medicareTax: fmt(1435.5),
      stateWages: fmt(99000),
      stateTax: fmt(8910.0),
      state: "WA",
      localWages: null,
      localTax: null,
      extractionConfidence: "0.9290",
    },
  ];

  await db.insert(w2DocumentsTable).values(docs);
}

async function seedKnowledgeGraph() {
  console.log("  → knowledge_graph (entities + connections)");

  await db.delete(graphConnectionsTable);
  await db.delete(graphEntitiesTable);

  const entities = await db
    .insert(graphEntitiesTable)
    .values([
      // Tax Code nodes
      { name: "IRC § 1 — Income Tax",         type: "tax_code",   description: "Primary individual income tax rates and brackets",                    color: "#3b82f6", size: "12", properties: { year: 2024, section: "1", title: "Tax Imposed" } },
      { name: "IRC § 32 — Earned Income Credit", type: "tax_code", description: "Refundable credit for low-to-moderate income workers",                color: "#3b82f6", size: "10", properties: { year: 2024, section: "32", maxCredit: 7830 } },
      { name: "IRC § 151 — Personal Exemptions", type: "tax_code", description: "Exemption amounts for taxpayer and dependents",                       color: "#3b82f6", size: "8",  properties: { year: 2024, section: "151" } },
      { name: "IRC § 63 — Taxable Income",      type: "tax_code",   description: "Definition of taxable income and standard deductions",               color: "#3b82f6", size: "10", properties: { year: 2024, section: "63", standardDeductionSingle: 14600, standardDeductionMFJ: 29200 } },
      { name: "IRC § 3101 — FICA Taxes",        type: "tax_code",   description: "Social Security and Medicare tax obligations",                       color: "#3b82f6", size: "9",  properties: { year: 2024, section: "3101", ssRate: 0.062, medicareRate: 0.0145 } },

      // Employer nodes
      { name: "Acme Corporation",          type: "employer", description: "Technology manufacturing company — Alice's primary employer",         color: "#10b981", size: "14", properties: { ein: "12-3456789", state: "CA", naics: "334111", employees: 4200 } },
      { name: "TechConsult LLC",           type: "employer", description: "IT consulting firm — Alice's secondary contract employer",            color: "#10b981", size: "8",  properties: { ein: "98-7654321", state: "CA", naics: "541511", employees: 45 } },
      { name: "Global Finance Partners",   type: "employer", description: "Investment bank — Spouse's employer",                                 color: "#10b981", size: "12", properties: { ein: "55-1122334", state: "NY", naics: "523110", employees: 1800 } },
      { name: "Metro City Schools",        type: "employer", description: "Public school district — Bob's employer",                             color: "#10b981", size: "11", properties: { ein: "44-3311220", state: "OH", naics: "611110", employees: 780 } },
      { name: "Quantum Systems Inc.",      type: "employer", description: "Aerospace engineering firm — Carol's primary employer",               color: "#10b981", size: "15", properties: { ein: "22-4455667", state: "WA", naics: "336414", employees: 6500 } },
      { name: "Northwest Medical Group",   type: "employer", description: "Multi-specialty medical practice — Spouse's employer",               color: "#10b981", size: "13", properties: { ein: "33-6677889", state: "WA", naics: "621111", employees: 320 } },

      // Taxpayer nodes
      { name: "Alice Johnson",  type: "taxpayer", description: "Tech professional — 2022–2024 filer, single and MFJ",    color: "#f59e0b", size: "14", properties: { ssn_last4: "4421", filingYears: [2022, 2023, 2024], state: "CA" } },
      { name: "Bob Carter",     type: "taxpayer", description: "Educator — head of household, 2023–2024 filer",           color: "#f59e0b", size: "10", properties: { ssn_last4: "8837", filingYears: [2023, 2024], state: "OH" } },
      { name: "Carol Smith",    type: "taxpayer", description: "Senior engineer — MFJ, high-income, 2023–2024 filer",     color: "#f59e0b", size: "13", properties: { ssn_last4: "2293", filingYears: [2023, 2024], state: "WA" } },

      // IRS / Agency nodes
      { name: "IRS — Form W-2",           type: "form",   description: "Wage and Tax Statement — employer-issued to employees",           color: "#8b5cf6", size: "12", properties: { dueDate: "January 31", copies: ["A","B","C","D","1","2"] } },
      { name: "IRS — Form 1040",          type: "form",   description: "U.S. Individual Income Tax Return",                              color: "#8b5cf6", size: "13", properties: { dueDate: "April 15", eFileAvailable: true } },
      { name: "IRS — Schedule A",         type: "form",   description: "Itemized Deductions",                                            color: "#8b5cf6", size: "9",  properties: { relatedForm: "1040" } },
      { name: "Social Security Admin.",   type: "agency", description: "Administers SS benefits and Box 3/4 W-2 data",                   color: "#ec4899", size: "11", properties: { wageBase2024: 168600 } },
      { name: "California FTB",           type: "agency", description: "California Franchise Tax Board — state income tax authority",    color: "#ec4899", size: "9",  properties: { state: "CA", topRate: 0.133 } },
      { name: "Ohio Dept. of Taxation",   type: "agency", description: "Ohio state income tax authority",                                color: "#ec4899", size: "8",  properties: { state: "OH", topRate: 0.0399 } },
      { name: "Washington DOR",           type: "agency", description: "WA Dept. of Revenue — no state income tax",                     color: "#ec4899", size: "7",  properties: { state: "WA", hasIncomeTax: false } },
      // AI nodes
      { name: "Gemini Flash 1.5",   type: "ai_model", description: "Primary OCR extraction model — high throughput",    color: "#06b6d4", size: "11", properties: { provider: "Google", contextWindow: 1000000 } },
      { name: "W-2 OCR Pipeline",   type: "ai_model", description: "Custom extraction pipeline layered on Gemini",      color: "#06b6d4", size: "10", properties: { avgConfidence: 0.94, processingMs: 2300 } },
      { name: "Tax Calc Engine",    type: "ai_model", description: "Rule-based tax bracket calculator (2022–2024)",     color: "#06b6d4", size: "9",  properties: { taxYears: [2022, 2023, 2024], accuracy: 0.999 } },
    ])
    .returning({ id: graphEntitiesTable.id });

  const [
    e_irc1, e_irc32, e_irc151, e_irc63, e_irc3101,
    e_acme, e_techconsult, e_gfp, e_metro, e_quantum, e_nwmed,
    e_alice, e_bob, e_carol,
    e_w2form, e_1040, e_schedA, e_ssa, e_caFTB, e_ohTax, e_waDOR,
    e_gemini, e_ocrPipeline, e_taxCalc,
  ] = entities;

  const connections = [
    // Employer → Taxpayer (employs)
    { sourceId: e_acme.id,       targetId: e_alice.id,  relationshipType: "employs",          weight: "1.0", properties: { taxYear: 2024, wages: 72400 } },
    { sourceId: e_techconsult.id,targetId: e_alice.id,  relationshipType: "employs",          weight: "0.6", properties: { taxYear: 2024, wages: 15000 } },
    { sourceId: e_gfp.id,        targetId: e_alice.id,  relationshipType: "employs",          weight: "0.8", properties: { taxYear: 2023, wages: 74800 } },
    { sourceId: e_metro.id,      targetId: e_bob.id,    relationshipType: "employs",          weight: "1.0", properties: { taxYear: 2024, wages: 63250 } },
    { sourceId: e_quantum.id,    targetId: e_carol.id,  relationshipType: "employs",          weight: "1.0", properties: { taxYear: 2024, wages: 185000 } },
    { sourceId: e_nwmed.id,      targetId: e_carol.id,  relationshipType: "employs",          weight: "0.9", properties: { taxYear: 2024, wages: 113500 } },
    // Employer → W-2 Form (issues)
    { sourceId: e_acme.id,       targetId: e_w2form.id, relationshipType: "issues",           weight: "1.0", properties: {} },
    { sourceId: e_techconsult.id,targetId: e_w2form.id, relationshipType: "issues",           weight: "1.0", properties: {} },
    { sourceId: e_metro.id,      targetId: e_w2form.id, relationshipType: "issues",           weight: "1.0", properties: {} },
    { sourceId: e_quantum.id,    targetId: e_w2form.id, relationshipType: "issues",           weight: "1.0", properties: {} },
    // Taxpayer → 1040 (files)
    { sourceId: e_alice.id,      targetId: e_1040.id,   relationshipType: "files",            weight: "1.0", properties: { years: [2022, 2023, 2024] } },
    { sourceId: e_bob.id,        targetId: e_1040.id,   relationshipType: "files",            weight: "1.0", properties: { years: [2023, 2024] } },
    { sourceId: e_carol.id,      targetId: e_1040.id,   relationshipType: "files",            weight: "1.0", properties: { years: [2023, 2024] } },
    // W-2 → 1040 (feeds)
    { sourceId: e_w2form.id,     targetId: e_1040.id,   relationshipType: "feeds_into",       weight: "1.0", properties: {} },
    { sourceId: e_w2form.id,     targetId: e_schedA.id, relationshipType: "feeds_into",       weight: "0.5", properties: {} },
    // 1040 → IRC § 1 (governed by)
    { sourceId: e_1040.id,       targetId: e_irc1.id,   relationshipType: "governed_by",      weight: "1.0", properties: {} },
    { sourceId: e_1040.id,       targetId: e_irc63.id,  relationshipType: "governed_by",      weight: "1.0", properties: {} },
    { sourceId: e_1040.id,       targetId: e_irc151.id, relationshipType: "governed_by",      weight: "0.7", properties: {} },
    { sourceId: e_w2form.id,     targetId: e_irc3101.id,relationshipType: "governed_by",      weight: "1.0", properties: {} },
    // Employer → SSA (reports)
    { sourceId: e_acme.id,       targetId: e_ssa.id,    relationshipType: "reports_to",       weight: "1.0", properties: {} },
    { sourceId: e_quantum.id,    targetId: e_ssa.id,    relationshipType: "reports_to",       weight: "1.0", properties: {} },
    // State filing
    { sourceId: e_alice.id,      targetId: e_caFTB.id,  relationshipType: "files_with",       weight: "1.0", properties: {} },
    { sourceId: e_bob.id,        targetId: e_ohTax.id,  relationshipType: "files_with",       weight: "1.0", properties: {} },
    { sourceId: e_carol.id,      targetId: e_waDOR.id,  relationshipType: "files_with",       weight: "1.0", properties: {} },
    // AI Pipeline
    { sourceId: e_gemini.id,     targetId: e_ocrPipeline.id, relationshipType: "powers",      weight: "1.0", properties: {} },
    { sourceId: e_ocrPipeline.id,targetId: e_w2form.id,      relationshipType: "extracts",    weight: "1.0", properties: { avgMs: 2300 } },
    { sourceId: e_taxCalc.id,    targetId: e_irc1.id,        relationshipType: "implements",  weight: "1.0", properties: {} },
    { sourceId: e_taxCalc.id,    targetId: e_irc63.id,       relationshipType: "implements",  weight: "1.0", properties: {} },
    { sourceId: e_alice.id,      targetId: e_irc32.id,       relationshipType: "qualifies_for", weight: "0.3", properties: {} },
    { sourceId: e_bob.id,        targetId: e_irc32.id,       relationshipType: "qualifies_for", weight: "1.0", properties: {} },
  ];

  await db.insert(graphConnectionsTable).values(connections);
}

async function seedAiAgent() {
  console.log("  → training_datasets + training_jobs");

  await db.delete(trainingJobsTable);
  await db.delete(trainingDatasetsTable);

  const datasets = await db
    .insert(trainingDatasetsTable)
    .values([
      {
        name: "IRS W-2 Form Samples 2024",
        description: "Curated collection of anonymized W-2 scans across income levels and employers",
        type: "structured" as const,
        status: "active" as const,
        recordCount: 4850,
        metadata: { version: "2024.1", avgConfidence: 0.94, formats: ["pdf", "jpg", "png"], sources: ["irs.gov", "internal"] },
      },
      {
        name: "IRS Tax Publications — 2020–2024",
        description: "Scraped and processed IRS Publication 15, 17, 505, and 926 for RAG context",
        type: "scraped" as const,
        status: "active" as const,
        recordCount: 28400,
        metadata: { scrapedUrls: 112, lastScraped: "2025-01-15", tokensTotal: 4200000 },
      },
      {
        name: "Tax Court Decision Corpus",
        description: "Annotated tax court decisions relevant to W-2 income disputes",
        type: "unstructured" as const,
        status: "active" as const,
        recordCount: 1920,
        metadata: { dateRange: "2015–2024", annotators: 3, avgLength: 4200 },
      },
      {
        name: "Mixed Income Scenarios",
        description: "Synthetic multi-W-2 household scenarios for calculation accuracy training",
        type: "mixed" as const,
        status: "active" as const,
        recordCount: 12000,
        metadata: { generated: true, incomeRange: [20000, 500000], scenarios: ["single", "MFJ", "HOH"] },
      },
      {
        name: "State Tax Rules Archive",
        description: "State-by-state tax rules scraped from state DOR sites — all 50 states",
        type: "scraped" as const,
        status: "processing" as const,
        recordCount: 2240,
        metadata: { statesCovered: 47, lastUpdated: "2025-02-01" },
      },
    ])
    .returning({ id: trainingDatasetsTable.id });

  const [d1, d2, d3, d4, d5] = datasets;

  await db.insert(trainingJobsTable).values([
    {
      datasetId: d1.id,
      modelName: "google/gemini-flash-1.5",
      status: "completed" as const,
      progress: "100",
      metrics: { accuracy: 0.9720, loss: 0.0821, f1: 0.9684, precision: 0.9731, recall: 0.9637, epoch: 12 },
      hyperparameters: { learningRate: 0.0001, batchSize: 32, epochs: 12, warmup: 500 },
      completedAt: daysAgo(14),
    },
    {
      datasetId: d2.id,
      modelName: "google/gemini-flash-1.5",
      status: "completed" as const,
      progress: "100",
      metrics: { accuracy: 0.9130, loss: 0.1242, f1: 0.9088, precision: 0.9110, recall: 0.9066, epoch: 8 },
      hyperparameters: { learningRate: 0.00005, batchSize: 16, epochs: 8, warmup: 200 },
      completedAt: daysAgo(7),
    },
    {
      datasetId: d4.id,
      modelName: "google/gemini-pro-1.5",
      status: "running" as const,
      progress: "63",
      metrics: { accuracy: 0.8890, loss: 0.1670, epoch: 5 },
      hyperparameters: { learningRate: 0.00008, batchSize: 24, epochs: 10 },
      completedAt: null,
    },
    {
      datasetId: d3.id,
      modelName: "anthropic/claude-3.5-sonnet",
      status: "queued" as const,
      progress: "0",
      metrics: {},
      hyperparameters: { learningRate: 0.00003, batchSize: 8, epochs: 6 },
      completedAt: null,
    },
    {
      datasetId: d5.id,
      modelName: "google/gemini-flash-1.5",
      status: "failed" as const,
      progress: "22",
      metrics: { epoch: 2 },
      hyperparameters: { learningRate: 0.0001, batchSize: 32, epochs: 5 },
      errorMessage: "CUDA out of memory at epoch 2 — batch size too large for dataset cardinality",
      completedAt: null,
    },
  ]);
}

async function seedTestReports() {
  console.log("  → test_reports + test_cases");

  await db.delete(testCasesTable);
  await db.delete(testReportsTable);

  const reports = await db
    .insert(testReportsTable)
    .values([
      // 1. Full unit test suite — passed
      {
        name: "API Unit Tests — Core Tax Engine",
        type: "unit" as const,
        status: "passed" as const,
        priority: "critical" as const,
        totalTests: 84,
        passedTests: 84,
        failedTests: 0,
        skippedTests: 0,
        duration: "18.432",
        environment: "ci",
        branch: "main",
        commitHash: "445f719f",
        tags: ["tax-engine", "unit", "core"],
        errorMessages: [],
        reproductionSteps: [],
        screenshots: [],
        metadata: { runner: "vitest", node: "24.0.0" },
      },
      // 2. E2E — partial (some failures)
      {
        name: "E2E — W-2 Upload & Extraction Flow",
        type: "e2e" as const,
        status: "partial" as const,
        priority: "high" as const,
        totalTests: 22,
        passedTests: 18,
        failedTests: 3,
        skippedTests: 1,
        duration: "94.771",
        environment: "staging",
        branch: "feature/ocr-improvements",
        commitHash: "a3f9b12c",
        tags: ["e2e", "w2", "ocr", "upload"],
        errorMessages: [
          "TimeoutError: OCR extraction exceeded 30s timeout for 8-page PDF",
          "AssertionError: Expected extraction confidence >= 0.85, received 0.61",
          "NetworkError: Presigned URL expired before upload completion",
        ],
        reproductionSteps: [
          "1. Navigate to /w2-upload",
          "2. Drop a multi-page scanned PDF (>5MB) onto the upload zone",
          "3. Wait for extraction to begin",
          "4. Observe timeout after 30 seconds",
        ],
        screenshots: ["staging/e2e/w2-upload-timeout-001.png"],
        metadata: { browser: "chromium", viewport: "1280x720" },
      },
      // 3. Regression — failed (critical)
      {
        name: "Regression — Tax Bracket Calculation 2024",
        type: "regression" as const,
        status: "failed" as const,
        priority: "critical" as const,
        totalTests: 36,
        passedTests: 31,
        failedTests: 5,
        skippedTests: 0,
        duration: "12.204",
        environment: "ci",
        branch: "fix/amend-brackets-2024",
        commitHash: "d8e34fa1",
        tags: ["regression", "tax-calculation", "2024", "critical"],
        errorMessages: [
          "AssertionError: 22% bracket boundary incorrect — expected $47,150, got $44,725",
          "AssertionError: MFJ 24% bracket — expected $201,050, got $191,950",
          "AssertionError: Head of Household 22% limit incorrect",
          "AssertionError: AMT exemption phase-out threshold mismatch",
          "AssertionError: QBI deduction cap incorrect for joint filers",
        ],
        reproductionSteps: [
          "1. POST /api/tax-returns/:id/calculate with 2024 MFJ return",
          "2. Verify taxableIncome bracket boundaries against IRS Rev. Proc. 2023-34",
          "3. Compare effectiveTaxRate against known-good fixture",
        ],
        screenshots: ["ci/regression/bracket-calc-mismatch-2024.png"],
        metadata: { fixedIn: "pending", affectedYears: [2024] },
      },
      // 4. Integration — passed
      {
        name: "Integration — OpenRouter AI Chat & Extraction",
        type: "integration" as const,
        status: "passed" as const,
        priority: "high" as const,
        totalTests: 18,
        passedTests: 18,
        failedTests: 0,
        skippedTests: 0,
        duration: "41.882",
        environment: "staging",
        branch: "main",
        commitHash: "445f719f",
        tags: ["integration", "openrouter", "ai", "gemini"],
        errorMessages: [],
        reproductionSteps: [],
        screenshots: [],
        metadata: { model: "google/gemini-flash-1.5", avgLatencyMs: 2340 },
      },
      // 5. Unit — running
      {
        name: "Unit Tests — Knowledge Graph API",
        type: "unit" as const,
        status: "running" as const,
        priority: "medium" as const,
        totalTests: 45,
        passedTests: 28,
        failedTests: 0,
        skippedTests: 0,
        duration: null,
        environment: "ci",
        branch: "feature/graph-filters",
        commitHash: "c91e2d7b",
        tags: ["unit", "knowledge-graph", "api"],
        errorMessages: [],
        reproductionSteps: [],
        screenshots: [],
        metadata: { progress: "62%" },
      },
      // 6. E2E — passed
      {
        name: "E2E — Auth Flow & Session Management",
        type: "e2e" as const,
        status: "passed" as const,
        priority: "critical" as const,
        totalTests: 14,
        passedTests: 14,
        failedTests: 0,
        skippedTests: 0,
        duration: "28.110",
        environment: "staging",
        branch: "main",
        commitHash: "445f719f",
        tags: ["e2e", "auth", "session", "oidc"],
        errorMessages: [],
        reproductionSteps: [],
        screenshots: [],
        metadata: { provider: "replit-auth", browser: "chromium" },
      },
      // 7. Integration — error
      {
        name: "Integration — GCS Object Storage Pipeline",
        type: "integration" as const,
        status: "error" as const,
        priority: "high" as const,
        totalTests: 12,
        passedTests: 4,
        failedTests: 0,
        skippedTests: 8,
        duration: "5.322",
        environment: "ci",
        branch: "main",
        commitHash: "445f719f",
        tags: ["integration", "storage", "gcs"],
        errorMessages: [
          "Error: GOOGLE_APPLICATION_CREDENTIALS not set in CI environment",
        ],
        reproductionSteps: [
          "1. Run integration test suite in CI",
          "2. GCS client initialization fails — credentials not mounted",
          "3. 8 tests skipped as prerequisites not met",
        ],
        screenshots: [],
        metadata: { skippedReason: "missing GCS credentials in CI" },
      },
      // 8. Regression — passed (low priority)
      {
        name: "Regression — Logs API Filtering",
        type: "regression" as const,
        status: "passed" as const,
        priority: "low" as const,
        totalTests: 20,
        passedTests: 20,
        failedTests: 0,
        skippedTests: 0,
        duration: "8.921",
        environment: "ci",
        branch: "main",
        commitHash: "445f719f",
        tags: ["regression", "logs", "api"],
        errorMessages: [],
        reproductionSteps: [],
        screenshots: [],
        metadata: {},
      },
    ])
    .returning({ id: testReportsTable.id });

  // Seed test cases for the most interesting reports
  const testCaseData = [
    // Report 0 (unit — passed): sample cases
    ...Array.from({ length: 8 }, (_, i) => ({
      reportId: reports[0].id,
      name: [
        "calculates 10% bracket correctly for income under $11,600",
        "calculates 12% bracket for income $11,600–$47,150",
        "calculates 22% bracket for income $47,150–$100,525",
        "calculates 24% bracket for income $100,525–$191,950",
        "calculates standard deduction for single filers ($14,600)",
        "calculates standard deduction for MFJ filers ($29,200)",
        "calculates FICA SS at 6.2% up to $168,600 wage base",
        "calculates Medicare at 1.45% with Additional Medicare Tax",
      ][i],
      description: "Validates tax bracket boundary conditions against IRS Rev. Proc. 2023-34",
      status: "passed" as const,
      priority: (["critical","critical","critical","critical","high","high","medium","medium"] as const)[i],
      duration: (Math.random() * 0.5 + 0.05).toFixed(3),
      errorMessage: null,
      stackTrace: null,
      reproductionSteps: [],
      screenshots: [],
    })),

    // Report 1 (e2e — partial): mix of pass/fail
    {
      reportId: reports[1].id,
      name: "uploads valid single-page W-2 PDF and extracts all fields",
      status: "passed" as const,
      priority: "high" as const,
      duration: "4.221",
      errorMessage: null,
      stackTrace: null,
      reproductionSteps: [],
      screenshots: [],
    },
    {
      reportId: reports[1].id,
      name: "extracts Box 1 wages with > 90% confidence on clear scan",
      status: "passed" as const,
      priority: "high" as const,
      duration: "6.882",
      errorMessage: null,
      stackTrace: null,
      reproductionSteps: [],
      screenshots: [],
    },
    {
      reportId: reports[1].id,
      name: "handles multi-page PDF W-2 (8 pages) within 30s timeout",
      status: "failed" as const,
      priority: "high" as const,
      duration: "30.001",
      errorMessage: "TimeoutError: OCR extraction exceeded 30s timeout for 8-page PDF. Last processed page: 4/8.",
      stackTrace: "at OcrService.extract (/app/src/services/ocr.ts:142:13)\nat W2ExtractHandler (/app/src/routes/w2Documents/index.ts:91:18)",
      reproductionSteps: ["Upload a scanned 8-page PDF W-2 using the drag-drop zone", "Wait for extraction — it times out at 30s"],
      screenshots: ["staging/e2e/w2-multipage-timeout.png"],
    },
    {
      reportId: reports[1].id,
      name: "extraction confidence >= 0.85 for standard employer W-2",
      status: "failed" as const,
      priority: "medium" as const,
      duration: "8.341",
      errorMessage: "AssertionError: Expected extraction confidence >= 0.85, received 0.61. Low confidence on Box 3, 4, 5.",
      stackTrace: "at expect(confidence).toBeGreaterThanOrEqual(0.85)",
      reproductionSteps: ["Upload a photocopy-quality W-2 scan", "Run extraction", "Check extractionConfidence field"],
      screenshots: [],
    },
    {
      reportId: reports[1].id,
      name: "presigned upload URL remains valid for 10-minute upload window",
      status: "failed" as const,
      priority: "medium" as const,
      duration: "12.009",
      errorMessage: "NetworkError: Presigned URL expired before upload completion. URL TTL: 5m, upload took 7m.",
      stackTrace: "at StorageClient.upload (/app/lib/object-storage-web/src/index.ts:88:9)",
      reproductionSteps: ["Request upload URL", "Wait 6 minutes", "Attempt upload — URL expired"],
      screenshots: [],
    },

    // Report 2 (regression — failed): critical bracket errors
    ...[
      {
        name: "22% bracket upper bound — single filer ($100,525)",
        status: "passed" as const, priority: "critical" as const,
        errorMessage: null, duration: "0.043",
      },
      {
        name: "22% bracket lower bound — single filer ($47,150)",
        status: "failed" as const, priority: "critical" as const,
        errorMessage: "AssertionError: 22% bracket lower bound incorrect — expected $47,150, received $44,725. Off by $2,425.",
        duration: "0.041",
      },
      {
        name: "MFJ 24% bracket lower bound ($201,050)",
        status: "failed" as const, priority: "critical" as const,
        errorMessage: "AssertionError: MFJ 24% bracket lower bound incorrect — expected $201,050, received $191,950.",
        duration: "0.038",
      },
      {
        name: "Head of Household 22% bracket boundary",
        status: "failed" as const, priority: "high" as const,
        errorMessage: "AssertionError: HOH 22% bracket boundary mismatch. Expected $63,100, received $55,900.",
        duration: "0.040",
      },
      {
        name: "AMT exemption phase-out threshold ($609,350 single)",
        status: "failed" as const, priority: "high" as const,
        errorMessage: "AssertionError: AMT phase-out threshold incorrect. Expected $609,350, received $578,150.",
        duration: "0.044",
      },
      {
        name: "QBI 20% deduction cap for joint filers",
        status: "failed" as const, priority: "medium" as const,
        errorMessage: "AssertionError: QBI phase-in range incorrect for MFJ. Expected $383,900–$483,900, received $364,200–$464,200.",
        duration: "0.039",
      },
    ].map(tc => ({
      reportId: reports[2].id,
      ...tc,
      stackTrace: tc.errorMessage ? `at TaxCalculator.calculateBracket (/app/artifacts/api-server/src/routes/taxReturns/index.ts:85:7)\nat TaxCalculator.calculate (/app/artifacts/api-server/src/routes/taxReturns/index.ts:55:10)` : null,
      reproductionSteps: tc.errorMessage ? ["POST /api/tax-returns/:id/calculate with 2024 tax return", "Check response breakdown.taxBrackets array"] : [],
      screenshots: [],
    })),
  ];

  await db.insert(testCasesTable).values(testCaseData);
}

async function seedLogs() {
  console.log("  → log_entries");

  // Keep existing logs, add more varied entries
  const entries = [
    // W-2 extraction workflow logs
    { level: "info" as const,     message: "W-2 extraction job started: doc_id=12, employer=Acme Corporation",              service: "w2-extractor",    timestamp: daysAgo(0) },
    { level: "debug" as const,    message: "Sending page 1/2 to Gemini Flash for OCR extraction",                           service: "w2-extractor",    timestamp: daysAgo(0) },
    { level: "debug" as const,    message: "Gemini response received in 1842ms, confidence=0.9720",                         service: "w2-extractor",    timestamp: daysAgo(0) },
    { level: "info" as const,     message: "W-2 extraction complete: doc_id=12, confidence=0.9720, fields_extracted=14",    service: "w2-extractor",    timestamp: daysAgo(0) },
    { level: "warn" as const,     message: "Low confidence on Box 4 (social security tax): 0.62 < threshold 0.85",         service: "w2-extractor",    timestamp: daysAgo(0) },
    { level: "info" as const,     message: "Tax calculation triggered: return_id=3, user=alice-johnson-001",                service: "tax-engine",      timestamp: daysAgo(0) },
    { level: "info" as const,     message: "Tax brackets applied: 22% effective rate, standard deduction $14,600",         service: "tax-engine",      timestamp: daysAgo(0) },
    { level: "info" as const,     message: "Calculation complete: estimated_refund=$2340.50, wages=$87400",                 service: "tax-engine",      timestamp: daysAgo(0) },
    // AI agent logs
    { level: "info" as const,     message: "Training job #3 started: dataset=IRS W-2 Samples, model=gemini-flash-1.5",     service: "ai-agent",        timestamp: daysAgo(1) },
    { level: "info" as const,     message: "Training epoch 1/12 complete: loss=0.3210, accuracy=0.7840",                   service: "ai-agent",        timestamp: daysAgo(1) },
    { level: "info" as const,     message: "Training epoch 6/12 complete: loss=0.1440, accuracy=0.9120",                   service: "ai-agent",        timestamp: daysAgo(1) },
    { level: "info" as const,     message: "Training epoch 12/12 complete: loss=0.0821, accuracy=0.9720",                  service: "ai-agent",        timestamp: daysAgo(1) },
    { level: "info" as const,     message: "Training job #3 completed successfully: final_accuracy=0.9720",                service: "ai-agent",        timestamp: daysAgo(1) },
    { level: "error" as const,    message: "Training job #5 failed at epoch 2: CUDA out of memory — batch_size=32",        service: "ai-agent",        timestamp: daysAgo(2) },
    { level: "warn" as const,     message: "Web scraper rate-limited by irs.gov — backing off 60s",                        service: "ai-agent",        timestamp: daysAgo(2) },
    // Knowledge graph logs
    { level: "info" as const,     message: "Graph entity created: id=5, name='Acme Corporation', type=employer",           service: "knowledge-graph", timestamp: daysAgo(0) },
    { level: "info" as const,     message: "Graph connection added: Acme → Alice Johnson (employs, weight=1.0)",           service: "knowledge-graph", timestamp: daysAgo(0) },
    { level: "debug" as const,    message: "Full graph query: 24 nodes, 30 edges, 4 clusters, 42ms",                       service: "knowledge-graph", timestamp: daysAgo(0) },
    // Test runner logs
    { level: "info" as const,     message: "Test suite initiated: 'API Unit Tests — Core Tax Engine' (84 tests)",         service: "test-runner",     timestamp: daysAgo(3) },
    { level: "info" as const,     message: "All 84 tests passed in 18.432s — branch: main, commit: 445f719f",             service: "test-runner",     timestamp: daysAgo(3) },
    { level: "error" as const,    message: "Regression test FAILED: 22% bracket boundary incorrect (expected $47,150)",   service: "test-runner",     timestamp: daysAgo(2) },
    { level: "critical" as const, message: "CRITICAL: 5 tax bracket regression failures on branch fix/amend-brackets-2024", service: "test-runner",   timestamp: daysAgo(2) },
    { level: "warn" as const,     message: "E2E test suite: 3 failures in W-2 extraction (timeout, low confidence, URL TTL)", service: "test-runner", timestamp: daysAgo(1) },
    // API server logs
    { level: "info" as const,     message: "POST /api/w2-documents/12/extract — 200 OK — 2341ms",                         service: "api-server",      timestamp: daysAgo(0) },
    { level: "info" as const,     message: "POST /api/tax-returns/3/calculate — 200 OK — 83ms",                           service: "api-server",      timestamp: daysAgo(0) },
    { level: "warn" as const,     message: "Slow query detected: GET /api/knowledge-graph/graph took 1842ms (threshold 1000ms)", service: "api-server", timestamp: daysAgo(0) },
    { level: "error" as const,    message: "OpenRouter API returned 429 Too Many Requests — model: gemini-pro-1.5",        service: "api-server",      timestamp: daysAgo(0) },
    { level: "info" as const,     message: "Session created for user: seed-user-alice-001 via Replit OIDC",               service: "api-server",      timestamp: daysAgo(1) },
    { level: "debug" as const,    message: "Auth middleware: session valid, token expires in 3487s",                       service: "api-server",      timestamp: daysAgo(0) },
  ];

  await db.insert(logEntriesTable).values(entries.map(e => ({ ...e, metadata: {} })));
}

async function seedConversations() {
  console.log("  → conversations + messages");

  await db.delete(messages);
  await db.delete(conversations);

  const convos = await db
    .insert(conversations)
    .values([
      { title: "Understanding My W-2 Box 12 Codes" },
      { title: "2024 Tax Brackets — Am I in the Right Bracket?" },
      { title: "Head of Household Filing Status — Eligibility" },
      { title: "Additional Medicare Tax on High Income" },
    ])
    .returning({ id: conversations.id });

  const msgRows = [
    // Convo 1
    { conversationId: convos[0].id, role: "user",      content: "What do the codes in Box 12 of my W-2 mean? I see 'D' and 'DD' on mine." },
    { conversationId: convos[0].id, role: "assistant", content: "Great question! Box 12 contains coded amounts for various compensation and benefit items.\n\n**Code D** — This represents **elective deferrals** to a 401(k) plan. The amount shown is the money you contributed pre-tax to your employer's 401(k) retirement plan. For 2024, the contribution limit is **$23,000** (or $30,500 if you're 50+). This amount reduces your taxable income.\n\n**Code DD** — This represents the **cost of employer-sponsored health coverage** (both the employer's and employee's share of premiums). This is purely informational — it does **not** reduce your taxable income and you don't enter it on your 1040.\n\nWould you like me to explain any other Box 12 codes, or help you understand how your 401(k) deferrals affect your total tax calculation?" },
    { conversationId: convos[0].id, role: "user",      content: "Yes, I also see Code W. What does that mean?" },
    { conversationId: convos[0].id, role: "assistant", content: "**Code W** represents **employer contributions to your Health Savings Account (HSA)**, including any amounts you contributed through payroll deductions.\n\nThis is important to know:\n- HSA contributions (employer + employee via payroll) are **excluded from your taxable wages**\n- The combined 2024 contribution limit is **$4,150** for self-only coverage or **$8,300** for family coverage\n- The amount in Box 12W is **not taxable income** for federal purposes\n- You'll report this amount on **Form 8889** when you file your 1040\n\nIf the total employer + employee contributions in Box 12W **exceed** the annual limit, the excess is taxable and subject to a 6% excise tax.\n\nWould you like help calculating whether your HSA contributions are within the allowable limits?" },

    // Convo 2
    { conversationId: convos[1].id, role: "user",      content: "I earned $87,400 in wages as a single filer in 2024. What federal tax bracket am I in?" },
    { conversationId: convos[1].id, role: "assistant", content: "Based on your 2024 wages of **$87,400** as a single filer, here's your tax bracket picture:\n\n**Step 1 — Subtract the Standard Deduction:**\n$87,400 - $14,600 = **$72,800 taxable income**\n\n**Step 2 — Apply the 2024 Tax Brackets:**\n| Bracket | Range | Tax |  \n|---|---|---|\n| 10% | $0 – $11,600 | $1,160.00 |\n| 12% | $11,600 – $47,150 | $4,266.00 |\n| 22% | $47,150 – $72,800 | $5,642.00 |\n\n**Total Federal Income Tax: $11,068.00**\n\n**Your marginal (top) bracket: 22%**\n**Your effective (actual) tax rate: ~12.7%**\n\nThe key distinction: your **marginal** rate is 22%, but your **effective** rate is much lower because only the income above $47,150 is taxed at 22%.\n\nWith $14,200 withheld per your W-2, you should receive a refund of approximately **$3,132**. Would you like me to verify this calculation against your actual W-2 withholding?" },
    { conversationId: convos[1].id, role: "user",      content: "That's helpful. Why is my estimated refund in TaxWise only $2,340?" },
    { conversationId: convos[1].id, role: "assistant", content: "The difference likely comes from other taxes I didn't include in my quick estimate. Let me account for the full picture:\n\nThe $2,340 refund in TaxWise AI is probably **more accurate** because it may account for:\n\n1. **Additional Medicare Tax** — If any other income pushed you above $200,000 (unlikely at $87,400, but worth checking)\n2. **Self-employment income** — If the $15,000 from TechConsult LLC was reported on a 1099 rather than W-2, you'd owe self-employment tax\n3. **State tax adjustments** — Some states have quirks in how they compute\n4. **Other income or deductions** — Interest income, student loan interest deduction, etc.\n\nThe most common reason: your **TechConsult LLC** income of $15,000 may have had **no withholding** (or underpaid withholding), which reduces your refund.\n\nYou can click **Calculate** on your tax return in TaxWise to see the full breakdown including each W-2 contribution." },

    // Convo 3
    { conversationId: convos[2].id, role: "user",      content: "Can I file as Head of Household? I'm unmarried and have a teenage daughter living with me." },
    { conversationId: convos[2].id, role: "assistant", content: "Based on what you've described, you **likely qualify** for Head of Household (HOH) filing status. Here are the IRS requirements you need to meet:\n\n**✓ You must be unmarried** (or considered unmarried) on December 31 — you said you're unmarried, so this is met.\n\n**✓ You paid more than half the cost of keeping up a home** — this means rent/mortgage, utilities, groceries, and other home expenses. As long as you're the primary provider, this is typically met.\n\n**✓ A qualifying person lived with you for more than half the year** — A dependent child generally qualifies. For your teenage daughter:\n- She must be under 19 (or under 24 if a full-time student)\n- She must have lived with you for more than 183 days in 2024\n- She must not have provided more than half of her own support\n\n**HOH Benefits vs. Single:**\n| | Single | Head of Household |\n|---|---|---|\n| Standard Deduction | $14,600 | **$21,900** |\n| 10% Bracket ends at | $11,600 | $16,550 |\n| 12% Bracket ends at | $47,150 | **$63,100** |\n\nHOH gives you a **$7,300 larger standard deduction** and better bracket boundaries — saving you likely **$1,000–$2,500+** in taxes depending on your income.\n\nWould you like me to estimate your tax savings for filing HOH vs. Single?" },
  ];

  await db.insert(messages).values(msgRows);
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\nTaxWise AI — seeding database with test data\n");

  try {
    const userIds = await seedUsers();
    const taxReturnIds = await seedTaxReturns(userIds);
    await seedW2Documents(taxReturnIds);
    await seedKnowledgeGraph();
    await seedAiAgent();
    await seedTestReports();
    await seedLogs();
    await seedConversations();

    console.log("\n✓ Seed complete. Summary:");
    console.log(`  users:              ${TEST_USERS.length}`);
    console.log(`  tax_returns:        ${taxReturnIds.length}`);
    console.log(`  w2_documents:       10`);
    console.log(`  graph_entities:     24`);
    console.log(`  graph_connections:  30`);
    console.log(`  training_datasets:  5`);
    console.log(`  training_jobs:      5`);
    console.log(`  test_reports:       8`);
    console.log(`  test_cases:         ~21`);
    console.log(`  log_entries:        ~37 new`);
    console.log(`  conversations:      4`);
    console.log(`  messages:           9`);
    console.log("");
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
