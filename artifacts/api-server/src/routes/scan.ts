import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db, userNotesTable, userContactsTable } from "@workspace/db";
import { getUserGeminiKey } from "./gemini-key";

const router: IRouter = Router();

const NO_KEY_ERROR = "Please add your Gemini API Key in Settings to use this feature.";

function safeStr(val: unknown): string {
  if (typeof val === "string" && val.trim() !== "" && val.trim() !== "N/A") return val.trim();
  return "N/A";
}

async function callGemini(
  apiKey: string,
  contents: unknown[],
): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    let msg = `Gemini API error (${res.status})`;
    try {
      const json = JSON.parse(text) as { error?: { message?: string } };
      if (json?.error?.message) msg = json.error.message;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function parseJson<T>(raw: string): T {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  try {
    return JSON.parse(s) as T;
  } catch {
    const match = s.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Could not parse AI response as JSON.");
    return JSON.parse(match[0]) as T;
  }
}

router.post("/scan/card", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = z
    .object({ imageBase64: z.string().min(1), mimeType: z.string().min(1) })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "imageBase64 and mimeType are required" });
    return;
  }

  const apiKey = await getUserGeminiKey(req.user.id);
  if (!apiKey) {
    res.status(403).json({ error: NO_KEY_ERROR });
    return;
  }

  const prompt = `You are analyzing a business card image. Extract all visible text and use your knowledge to infer additional details.

Return a single valid JSON object with EXACTLY these keys (no markdown, no code fences, no extra text):

{
  "name": "full name on the card",
  "title": "job title/position",
  "company": "company or organization name",
  "email": "email address",
  "phone": "phone number",
  "website": "website URL",
  "linkedin": "LinkedIn URL or profile",
  "address": "full address as printed on the card",
  "companySummary": "2-3 sentences describing what this company likely does based on its name, industry, and other context clues",
  "businessName": "company or organization name (same as company field)",
  "businessAddress": "street address only (without city/province)",
  "city": "city name — infer from address, area code, or other clues if not explicit",
  "province": "province or state — infer from address or other clues if not explicit",
  "fullCivicAddress": "complete formatted address combining street, city, province (e.g. '123 Main St, Vancouver, BC')",
  "latitude": "approximate decimal latitude of this address if you can estimate it, otherwise N/A",
  "longitude": "approximate decimal longitude of this address if you can estimate it, otherwise N/A"
}

Rules:
- If a field is not found and cannot be reasonably inferred, use the string "N/A"
- Do NOT leave any field out of the JSON
- Return ONLY the JSON object, nothing else`;

  try {
    const raw = await callGemini(apiKey, [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: parsed.data.mimeType, data: parsed.data.imageBase64 } },
        ],
      },
    ]);

    type RawCard = Partial<{
      name: string; title: string; company: string; email: string;
      phone: string; website: string; linkedin: string; address: string;
      companySummary: string; businessName: string; businessAddress: string;
      city: string; province: string; fullCivicAddress: string;
      latitude: string; longitude: string;
    }>;

    const p = parseJson<RawCard>(raw);

    res.json({
      card: {
        name: p.name ?? "",
        title: p.title ?? "",
        company: p.company ?? "",
        email: p.email ?? "",
        phone: p.phone ?? "",
        website: p.website ?? "",
        linkedin: p.linkedin ?? "",
        address: p.address ?? "",
        companySummary: p.companySummary ?? "",
      },
      geo: {
        businessName: safeStr(p.businessName ?? p.company),
        businessAddress: safeStr(p.businessAddress ?? p.address),
        city: safeStr(p.city),
        province: safeStr(p.province),
        fullCivicAddress: safeStr(p.fullCivicAddress),
        latitude: safeStr(p.latitude),
        longitude: safeStr(p.longitude),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Scan failed" });
  }
});

router.post(
  "/user/contacts/:contactId/notes/:noteId/analyze",
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

    const [note] = await db
      .select({ id: userNotesTable.id, text: userNotesTable.text })
      .from(userNotesTable)
      .where(
        and(
          eq(userNotesTable.id, req.params.noteId),
          eq(userNotesTable.contactId, req.params.contactId),
          eq(userNotesTable.userId, req.user.id),
        ),
      );
    if (!note) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    const apiKey = await getUserGeminiKey(req.user.id);
    if (!apiKey) {
      res.status(403).json({ error: NO_KEY_ERROR });
      return;
    }

    const prompt = `You are a networking CRM assistant. A user has recorded a note about a business contact.

Note content:
"${note.text}"

Your tasks:
1. Write a concise 2-3 sentence summary of this note.
2. Extract any action items, follow-ups, or to-do tasks mentioned (explicit or implied).

Return a single valid JSON object with NO markdown, NO code fences, NO extra text:
{
  "summary": "2-3 sentence summary of the note",
  "todoItems": ["action item 1", "action item 2"]
}

Rules:
- If there are no action items, return an empty array for todoItems
- Keep summary concise and professional
- Return ONLY the JSON object`;

    try {
      const raw = await callGemini(apiKey, [{ parts: [{ text: prompt }] }]);
      const p = parseJson<{ summary?: string; todoItems?: string[] }>(raw);

      const summary = p.summary ?? "No summary available.";
      const todoItems = Array.isArray(p.todoItems) ? p.todoItems : [];

      await db
        .update(userNotesTable)
        .set({ aiSummary: summary, todoItems })
        .where(eq(userNotesTable.id, note.id));

      res.json({ summary, todoItems });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Analysis failed" });
    }
  },
);

export default router;
