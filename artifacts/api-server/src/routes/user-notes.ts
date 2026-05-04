import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { db, userNotesTable, userContactsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

const CreateNoteBody = z.object({
  type: z.enum(["written", "voice"]),
  text: z.string().min(1),
});

const UpdateNoteBody = z.object({
  text: z.string().optional(),
  aiSummary: z.string().optional(),
  todoItems: z.array(z.string()).optional(),
});

router.get(
  "/user/contacts/:contactId/notes",
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const [contact] = await db
      .select({ id: userContactsTable.id })
      .from(userContactsTable)
      .where(
        and(
          eq(userContactsTable.id, req.params.contactId),
          eq(userContactsTable.userId, req.user.id),
        ),
      );

    if (!contact) {
      res.status(404).json({ error: "Contact not found" });
      return;
    }

    const notes = await db
      .select()
      .from(userNotesTable)
      .where(eq(userNotesTable.contactId, req.params.contactId));

    res.json({ notes });
  },
);

router.post(
  "/user/contacts/:contactId/notes",
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const [contact] = await db
      .select({ id: userContactsTable.id })
      .from(userContactsTable)
      .where(
        and(
          eq(userContactsTable.id, req.params.contactId),
          eq(userContactsTable.userId, req.user.id),
        ),
      );

    if (!contact) {
      res.status(404).json({ error: "Contact not found" });
      return;
    }

    const parsed = CreateNoteBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const [note] = await db
      .insert(userNotesTable)
      .values({
        ...parsed.data,
        userId: req.user.id,
        contactId: req.params.contactId,
      })
      .returning();

    res.status(201).json({ note });
  },
);

router.put(
  "/user/contacts/:contactId/notes/:noteId",
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const parsed = UpdateNoteBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const [note] = await db
      .update(userNotesTable)
      .set(parsed.data)
      .where(
        and(
          eq(userNotesTable.id, req.params.noteId),
          eq(userNotesTable.contactId, req.params.contactId),
          eq(userNotesTable.userId, req.user.id),
        ),
      )
      .returning();

    if (!note) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    res.json({ note });
  },
);

router.delete(
  "/user/contacts/:contactId/notes/:noteId",
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const [deleted] = await db
      .delete(userNotesTable)
      .where(
        and(
          eq(userNotesTable.id, req.params.noteId),
          eq(userNotesTable.contactId, req.params.contactId),
          eq(userNotesTable.userId, req.user.id),
        ),
      )
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    res.json({ success: true });
  },
);

export default router;
