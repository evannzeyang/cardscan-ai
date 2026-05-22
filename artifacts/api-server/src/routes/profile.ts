import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

const router: IRouter = Router();

const profileCols = {
  id: usersTable.id,
  email: usersTable.email,
  firstName: usersTable.firstName,
  lastName: usersTable.lastName,
  profileImageUrl: usersTable.profileImageUrl,
  jobTitle: usersTable.jobTitle,
  companyName: usersTable.companyName,
  industry: usersTable.industry,
  businessEmail: usersTable.businessEmail,
  businessPhone: usersTable.businessPhone,
  linkedinUrl: usersTable.linkedinUrl,
} as const;

const UpdateProfileBody = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  profileImageUrl: z.string().url().nullable().optional(),
  jobTitle: z.string().optional(),
  companyName: z.string().optional(),
  industry: z.string().optional(),
  businessEmail: z.string().email().nullable().optional(),
  businessPhone: z.string().optional(),
  linkedinUrl: z.string().url().nullable().optional(),
});

router.get("/user/profile", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [profile] = await db
    .select(profileCols)
    .from(usersTable)
    .where(eq(usersTable.id, req.user.id));

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  res.json({ profile });
});

router.put("/user/profile", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }

  const [profile] = await db
    .update(usersTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(usersTable.id, req.user.id))
    .returning(profileCols);

  res.json({ profile });
});

export default router;
