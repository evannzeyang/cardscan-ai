import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { and, eq, ilike, inArray, not, or } from "drizzle-orm";
import { db, usersTable, connectionsTable } from "@workspace/db";

const router: IRouter = Router();

const publicUserCols = {
  id: usersTable.id,
  firstName: usersTable.firstName,
  lastName: usersTable.lastName,
  email: usersTable.email,
  profileImageUrl: usersTable.profileImageUrl,
  jobTitle: usersTable.jobTitle,
  companyName: usersTable.companyName,
} as const;

const fullPublicCols = {
  ...publicUserCols,
  industry: usersTable.industry,
  businessEmail: usersTable.businessEmail,
  businessPhone: usersTable.businessPhone,
  linkedinUrl: usersTable.linkedinUrl,
} as const;

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

router.get("/users/search", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const q = ((req.query.q as string) ?? "").trim();
  if (q.length < 2) {
    res.json({ users: [] });
    return;
  }
  const pattern = `%${q}%`;
  const users = await db
    .select(publicUserCols)
    .from(usersTable)
    .where(
      and(
        not(eq(usersTable.id, req.user.id)),
        or(
          ilike(usersTable.firstName, pattern),
          ilike(usersTable.lastName, pattern),
          ilike(usersTable.email, pattern),
          ilike(usersTable.companyName, pattern),
        ),
      ),
    )
    .limit(15);
  res.json({ users });
});

router.get("/connections", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const userId = req.user.id;

  const rows = await db
    .select()
    .from(connectionsTable)
    .where(
      or(eq(connectionsTable.senderId, userId), eq(connectionsTable.receiverId, userId)),
    );

  const otherIds = [...new Set(rows.map((r) => (r.senderId === userId ? r.receiverId : r.senderId)))];

  const userRecords =
    otherIds.length > 0
      ? await db.select(publicUserCols).from(usersTable).where(inArray(usersTable.id, otherIds))
      : [];
  const usersMap = Object.fromEntries(userRecords.map((u) => [u.id, u]));

  const incoming = rows
    .filter((r) => r.receiverId === userId && r.status === "pending")
    .map((r) => ({ ...r, user: usersMap[r.senderId] ?? null }));

  const outgoing = rows
    .filter((r) => r.senderId === userId && r.status === "pending")
    .map((r) => ({ ...r, user: usersMap[r.receiverId] ?? null }));

  const accepted = rows
    .filter((r) => r.status === "accepted")
    .map((r) => ({
      ...r,
      user: usersMap[r.senderId === userId ? r.receiverId : r.senderId] ?? null,
    }));

  res.json({ incoming, outgoing, accepted });
});

router.post("/connections", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const parsed = z.object({ receiverId: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "receiverId is required" });
    return;
  }
  const { receiverId } = parsed.data;
  const senderId = req.user.id;

  if (senderId === receiverId) {
    res.status(400).json({ error: "Cannot connect with yourself" });
    return;
  }

  const existing = await db
    .select({ id: connectionsTable.id })
    .from(connectionsTable)
    .where(
      or(
        and(eq(connectionsTable.senderId, senderId), eq(connectionsTable.receiverId, receiverId)),
        and(eq(connectionsTable.senderId, receiverId), eq(connectionsTable.receiverId, senderId)),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Connection already exists" });
    return;
  }

  const [conn] = await db
    .insert(connectionsTable)
    .values({ senderId, receiverId, status: "pending" })
    .returning();

  res.status(201).json({ connection: conn });
});

router.put("/connections/:id/accept", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { id } = req.params;
  const userId = req.user.id;

  const [row] = await db
    .select()
    .from(connectionsTable)
    .where(and(eq(connectionsTable.id, id), eq(connectionsTable.receiverId, userId)))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  if (row.status !== "pending") {
    res.status(400).json({ error: "Request is not pending" });
    return;
  }

  const [updated] = await db
    .update(connectionsTable)
    .set({ status: "accepted" })
    .where(eq(connectionsTable.id, id))
    .returning();

  res.json({ connection: updated });
});

router.delete("/connections/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { id } = req.params;
  const userId = req.user.id;

  const [row] = await db
    .select({ senderId: connectionsTable.senderId, receiverId: connectionsTable.receiverId })
    .from(connectionsTable)
    .where(eq(connectionsTable.id, id))
    .limit(1);

  if (!row || (row.senderId !== userId && row.receiverId !== userId)) {
    res.status(404).json({ error: "Connection not found" });
    return;
  }

  await db.delete(connectionsTable).where(eq(connectionsTable.id, id));
  res.status(204).send();
});

router.get("/connections/users/:userId/profile", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { userId } = req.params;
  const myId = req.user.id;

  const [conn] = await db
    .select({ id: connectionsTable.id })
    .from(connectionsTable)
    .where(
      and(
        eq(connectionsTable.status, "accepted"),
        or(
          and(eq(connectionsTable.senderId, myId), eq(connectionsTable.receiverId, userId)),
          and(eq(connectionsTable.senderId, userId), eq(connectionsTable.receiverId, myId)),
        ),
      ),
    )
    .limit(1);

  if (!conn) {
    res.status(403).json({ error: "Not connected to this user" });
    return;
  }

  const [profile] = await db.select(fullPublicCols).from(usersTable).where(eq(usersTable.id, userId));
  if (!profile) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ profile });
});

export default router;
