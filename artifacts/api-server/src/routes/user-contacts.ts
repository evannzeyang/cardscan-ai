import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { db, userContactsTable, companiesTable, userEventsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

const CreateContactBody = z.object({
  companyId: z.string().uuid().optional(),
  name: z.string().optional(),
  title: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  linkedin: z.string().optional(),
  address: z.string().optional(),
  companySummary: z.string().optional(),
  eventId: z.string().uuid().optional(),
});

const UpdateContactBody = CreateContactBody.extend({
  syncedToSheets: z.boolean().optional(),
});

router.get("/user/contacts", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const contacts = await db
    .select({
      id: userContactsTable.id,
      userId: userContactsTable.userId,
      companyId: userContactsTable.companyId,
      name: userContactsTable.name,
      title: userContactsTable.title,
      email: userContactsTable.email,
      phone: userContactsTable.phone,
      website: userContactsTable.website,
      linkedin: userContactsTable.linkedin,
      address: userContactsTable.address,
      companySummary: userContactsTable.companySummary,
      syncedToSheets: userContactsTable.syncedToSheets,
      eventId: userContactsTable.eventId,
      scannedAt: userContactsTable.scannedAt,
      createdAt: userContactsTable.createdAt,
      updatedAt: userContactsTable.updatedAt,
      company: {
        id: companiesTable.id,
        businessName: companiesTable.businessName,
        businessAddress: companiesTable.businessAddress,
        city: companiesTable.city,
        province: companiesTable.province,
        fullCivicAddress: companiesTable.fullCivicAddress,
        latitude: companiesTable.latitude,
        longitude: companiesTable.longitude,
        website: companiesTable.website,
        phone: companiesTable.phone,
      },
    })
    .from(userContactsTable)
    .leftJoin(companiesTable, eq(userContactsTable.companyId, companiesTable.id))
    .where(eq(userContactsTable.userId, req.user.id));

  res.json({ contacts });
});

router.get("/user/contacts/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [contact] = await db
    .select({
      id: userContactsTable.id,
      userId: userContactsTable.userId,
      companyId: userContactsTable.companyId,
      name: userContactsTable.name,
      title: userContactsTable.title,
      email: userContactsTable.email,
      phone: userContactsTable.phone,
      website: userContactsTable.website,
      linkedin: userContactsTable.linkedin,
      address: userContactsTable.address,
      companySummary: userContactsTable.companySummary,
      syncedToSheets: userContactsTable.syncedToSheets,
      eventId: userContactsTable.eventId,
      scannedAt: userContactsTable.scannedAt,
      createdAt: userContactsTable.createdAt,
      updatedAt: userContactsTable.updatedAt,
      company: {
        id: companiesTable.id,
        businessName: companiesTable.businessName,
        businessAddress: companiesTable.businessAddress,
        city: companiesTable.city,
        province: companiesTable.province,
        fullCivicAddress: companiesTable.fullCivicAddress,
        latitude: companiesTable.latitude,
        longitude: companiesTable.longitude,
        website: companiesTable.website,
        phone: companiesTable.phone,
      },
    })
    .from(userContactsTable)
    .leftJoin(companiesTable, eq(userContactsTable.companyId, companiesTable.id))
    .where(
      and(
        eq(userContactsTable.id, req.params.id),
        eq(userContactsTable.userId, req.user.id),
      ),
    );

  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  res.json({ contact });
});

router.post("/user/contacts", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = CreateContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }

  const [contact] = await db
    .insert(userContactsTable)
    .values({ ...parsed.data, userId: req.user.id })
    .returning();

  res.status(201).json({ contact });
});

router.put("/user/contacts/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = UpdateContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }

  const [contact] = await db
    .update(userContactsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(
      and(
        eq(userContactsTable.id, req.params.id),
        eq(userContactsTable.userId, req.user.id),
      ),
    )
    .returning();

  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  res.json({ contact });
});

router.delete("/user/contacts/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [deleted] = await db
    .delete(userContactsTable)
    .where(
      and(
        eq(userContactsTable.id, req.params.id),
        eq(userContactsTable.userId, req.user.id),
      ),
    )
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  res.json({ success: true });
});

export default router;
