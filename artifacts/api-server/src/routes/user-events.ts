import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { db, userEventsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

const CreateEventBody = z.object({
  title: z.string().min(1),
  location: z.string().optional(),
  dateTime: z.string().datetime(),
  reminderFrequency: z.string().default("none"),
});

const UpdateEventBody = CreateEventBody.partial();

router.get("/user/events", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const events = await db
    .select()
    .from(userEventsTable)
    .where(eq(userEventsTable.userId, req.user.id));

  res.json({ events });
});

router.post("/user/events", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }

  const [event] = await db
    .insert(userEventsTable)
    .values({
      ...parsed.data,
      dateTime: new Date(parsed.data.dateTime),
      userId: req.user.id,
    })
    .returning();

  res.status(201).json({ event });
});

router.put("/user/events/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = UpdateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.dateTime) {
    updateData.dateTime = new Date(parsed.data.dateTime);
  }

  const [event] = await db
    .update(userEventsTable)
    .set(updateData)
    .where(
      and(
        eq(userEventsTable.id, req.params.id),
        eq(userEventsTable.userId, req.user.id),
      ),
    )
    .returning();

  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json({ event });
});

router.delete("/user/events/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [deleted] = await db
    .delete(userEventsTable)
    .where(
      and(
        eq(userEventsTable.id, req.params.id),
        eq(userEventsTable.userId, req.user.id),
      ),
    )
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json({ success: true });
});

export default router;
