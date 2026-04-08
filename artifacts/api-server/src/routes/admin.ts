/**
 * Admin API routes — restricted to admin users.
 * Admin users are identified by the ADMIN_USER_IDS env var (comma-separated user IDs).
 * Falls back to checking if user email matches ADMIN_EMAIL.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, taxReturnsTable, w2DocumentsTable } from "@workspace/db";
import { sql, desc, count, sum } from "drizzle-orm";

const router: IRouter = Router();

function isAdmin(req: Request): boolean {
  if (!req.isAuthenticated()) return false;
  const adminIds = (process.env.ADMIN_USER_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim()).filter(Boolean);
  return (
    adminIds.includes(req.user.id) ||
    (!!req.user.email && adminEmails.includes(req.user.email))
  );
}

router.get("/admin/stats", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdmin(req)) {
    res.status(403).json({ error: "Forbidden — admin access required" });
    return;
  }

  try {
    const [userCount] = await db.select({ count: count() }).from(usersTable);
    const [returnCount] = await db.select({ count: count() }).from(taxReturnsTable);
    const [w2Count] = await db.select({ count: count() }).from(w2DocumentsTable);

    const [refundSum] = await db
      .select({ total: sum(taxReturnsTable.estimatedRefund) })
      .from(taxReturnsTable);

    const [owedSum] = await db
      .select({ total: sum(taxReturnsTable.estimatedOwed) })
      .from(taxReturnsTable);

    const statusBreakdown = await db
      .select({ status: taxReturnsTable.status, count: count() })
      .from(taxReturnsTable)
      .groupBy(taxReturnsTable.status);

    const recentUsers = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt))
      .limit(10);

    const recentReturns = await db
      .select()
      .from(taxReturnsTable)
      .orderBy(desc(taxReturnsTable.createdAt))
      .limit(10);

    res.json({
      totals: {
        users: Number(userCount.count),
        taxReturns: Number(returnCount.count),
        w2Documents: Number(w2Count.count),
        totalRefunds: Number(refundSum.total || 0),
        totalOwed: Number(owedSum.total || 0),
      },
      statusBreakdown: statusBreakdown.map(s => ({
        status: s.status,
        count: Number(s.count),
      })),
      recentUsers,
      recentReturns,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch admin stats");
    res.status(500).json({ error: "Failed to fetch admin stats" });
  }
});

export default router;
