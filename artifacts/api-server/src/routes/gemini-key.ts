import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { encrypt, decrypt } from "../lib/encryption";

const router: IRouter = Router();

router.get("/user/gemini-key/status", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [user] = await db
    .select({ encryptedGeminiKey: usersTable.encryptedGeminiKey })
    .from(usersTable)
    .where(eq(usersTable.id, req.user.id));

  res.json({ hasKey: !!user?.encryptedGeminiKey });
});

router.put("/user/gemini-key", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = z.object({ key: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "key is required" });
    return;
  }

  const encryptedGeminiKey = encrypt(parsed.data.key.trim());

  await db
    .update(usersTable)
    .set({ encryptedGeminiKey, updatedAt: new Date() })
    .where(eq(usersTable.id, req.user.id));

  res.json({ success: true });
});

router.delete("/user/gemini-key", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  await db
    .update(usersTable)
    .set({ encryptedGeminiKey: null, updatedAt: new Date() })
    .where(eq(usersTable.id, req.user.id));

  res.json({ success: true });
});

export async function getUserGeminiKey(userId: string): Promise<string | null> {
  const [user] = await db
    .select({ encryptedGeminiKey: usersTable.encryptedGeminiKey })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user?.encryptedGeminiKey) return null;
  try {
    return decrypt(user.encryptedGeminiKey);
  } catch {
    return null;
  }
}

export default router;
