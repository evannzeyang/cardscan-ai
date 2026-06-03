import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { GetCurrentAuthUserResponse } from "@workspace/api-zod";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  clearSession,
  createSession,
  getSessionId,
  setSessionCookie,
  toAuthUser,
} from "../lib/auth";
import { hashPassword, verifyPassword } from "../lib/password";

const router: IRouter = Router();

const registerBody = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
});

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

router.get("/auth/user", (req: Request, res: Response) => {
  res.json(
    GetCurrentAuthUserResponse.parse({
      user: req.isAuthenticated() ? req.user : null,
    }),
  );
});

router.post("/auth/register", async (req: Request, res: Response) => {
  const parsed = registerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.issues[0]?.message ?? "Invalid registration data",
    });
    return;
  }

  const email = normalizeEmail(parsed.data.email);
  const passwordHash = await hashPassword(parsed.data.password);

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      email,
      passwordHash,
      firstName: parsed.data.firstName || null,
      lastName: parsed.data.lastName || null,
    })
    .returning();

  const sid = await createSession(toAuthUser(user));
  setSessionCookie(res, sid);

  res.status(201).json({ user: toAuthUser(user) });
});

router.post("/auth/login", async (req: Request, res: Response) => {
  const parsed = loginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid email or password" });
    return;
  }

  const email = normalizeEmail(parsed.data.email);

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!user?.passwordHash) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const sid = await createSession(toAuthUser(user));
  setSessionCookie(res, sid);

  res.json({ user: toAuthUser(user) });
});

router.post("/auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  res.json({ success: true });
});

export default router;
