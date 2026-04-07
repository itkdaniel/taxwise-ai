import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateUserSettingsBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/users/me", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user.id));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({
      id: 1,
      replitId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      role: "analyst",
      twoFactorEnabled: false,
      settings: {},
      createdAt: user.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get current user");
    res.status(500).json({ error: "Failed to get current user" });
  }
});

router.put("/users/me/settings", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = UpdateUserSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user.id));
    res.json({
      id: 1,
      replitId: user?.id || req.user.id,
      email: user?.email,
      firstName: user?.firstName,
      lastName: user?.lastName,
      profileImageUrl: user?.profileImageUrl,
      role: parsed.data.role || "analyst",
      twoFactorEnabled: parsed.data.twoFactorEnabled || false,
      settings: parsed.data.settings || {},
      createdAt: user?.createdAt || new Date(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update user settings");
    res.status(500).json({ error: "Failed to update user settings" });
  }
});

export default router;
