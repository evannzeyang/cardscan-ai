import { Router, type IRouter } from "express";
import { google } from "googleapis";
import { AppendToSheetBody, AppendToSheetResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SHEET_NAME = "BCoC Members";

async function getAuthClient() {
  const credentialsRaw = process.env["GOOGLE_CREDENTIALS"];
  if (!credentialsRaw) {
    throw new Error("GOOGLE_CREDENTIALS environment variable is not set");
  }

  let credentials: object;
  try {
    credentials = JSON.parse(credentialsRaw);
  } catch {
    throw new Error("GOOGLE_CREDENTIALS is not valid JSON");
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.readonly",
    ],
  });

  return auth;
}

async function findSpreadsheetId(auth: InstanceType<typeof google.auth.GoogleAuth>): Promise<string> {
  const drive = google.drive({ version: "v3", auth });
  const response = await drive.files.list({
    q: `name='${SHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
    fields: "files(id, name)",
    pageSize: 1,
  });

  const files = response.data.files;
  if (!files || files.length === 0) {
    throw new Error(`Google Sheet named "${SHEET_NAME}" not found. Make sure the service account has access to it.`);
  }

  const id = files[0].id;
  if (!id) {
    throw new Error("Spreadsheet ID is missing from Drive response");
  }

  return id;
}

router.post("/sheets/append", async (req, res): Promise<void> => {
  const parsed = AppendToSheetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(AppendToSheetResponse.parse({ success: false, message: parsed.error.message }));
    return;
  }

  const {
    businessName,
    businessAddress,
    city,
    province,
    fullCivicAddress,
    latitude,
    longitude,
  } = parsed.data;

  try {
    const auth = await getAuthClient();
    const spreadsheetId = await findSpreadsheetId(auth);

    const sheets = google.sheets({ version: "v4", auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_NAME}!A:G`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[businessName, businessAddress, city, province, fullCivicAddress, latitude, longitude]],
      },
    });

    req.log.info({ businessName }, "Appended row to Google Sheet");
    res.json(AppendToSheetResponse.parse({ success: true, message: "Row appended successfully" }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error({ err }, "Failed to append to Google Sheet");
    res.status(500).json(AppendToSheetResponse.parse({ success: false, message }));
  }
});

export default router;
