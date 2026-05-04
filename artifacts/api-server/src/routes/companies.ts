import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { db, companiesTable } from "@workspace/db";
import { ilike, or, eq } from "drizzle-orm";

const router: IRouter = Router();

const CreateCompanyBody = z.object({
  businessName: z.string().min(1),
  businessAddress: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  fullCivicAddress: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  website: z.string().optional(),
  phone: z.string().optional(),
});

const UpdateCompanyBody = CreateCompanyBody.partial();

router.get("/companies/search", async (req: Request, res: Response) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) {
    res.json({ companies: [] });
    return;
  }

  const companies = await db
    .select()
    .from(companiesTable)
    .where(
      or(
        ilike(companiesTable.businessName, `%${q}%`),
        ilike(companiesTable.website, `%${q}%`),
      ),
    )
    .limit(10);

  res.json({ companies });
});

router.get("/companies/:id", async (req: Request, res: Response) => {
  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.id, req.params.id));

  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  res.json({ company });
});

router.post("/companies", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = CreateCompanyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }

  const [company] = await db
    .insert(companiesTable)
    .values({ ...parsed.data, createdBy: req.user.id })
    .returning();

  res.status(201).json({ company });
});

router.put("/companies/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = UpdateCompanyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }

  const [company] = await db
    .update(companiesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(companiesTable.id, req.params.id))
    .returning();

  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  res.json({ company });
});

export default router;
