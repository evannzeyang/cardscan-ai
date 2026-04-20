export interface ExtractedCard {
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  linkedin: string;
  address: string;
  companySummary: string;
}

export interface ExtractedGeoData {
  businessName: string;
  businessAddress: string;
  city: string;
  province: string;
  fullCivicAddress: string;
  latitude: string;
  longitude: string;
}

export interface AnalysisResult {
  card: ExtractedCard;
  geo: ExtractedGeoData;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function safeStr(val: unknown): string {
  if (typeof val === "string" && val.trim() !== "") return val.trim();
  return "N/A";
}

export async function analyzeBusinessCard(
  imageFile: File,
  apiKey: string
): Promise<AnalysisResult> {
  if (!apiKey) {
    throw new Error("No Gemini API key configured. Please add your API key in Settings.");
  }

  const base64Data = await fileToBase64(imageFile);
  const mimeType = imageFile.type || "image/jpeg";

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

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Gemini API error (${response.status})`;
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson?.error?.message) {
        errorMessage = errorJson.error.message;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const rawText: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  let jsonStr = rawText.trim();

  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  type RawParsed = Partial<ExtractedCard & ExtractedGeoData>;
  let parsed: RawParsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response as JSON. Please try again.");
    }
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error("Could not parse AI response as JSON. Please try again.");
    }
  }

  const card: ExtractedCard = {
    name: parsed.name ?? "",
    title: parsed.title ?? "",
    company: parsed.company ?? "",
    email: parsed.email ?? "",
    phone: parsed.phone ?? "",
    website: parsed.website ?? "",
    linkedin: parsed.linkedin ?? "",
    address: parsed.address ?? "",
    companySummary: parsed.companySummary ?? "",
  };

  const geo: ExtractedGeoData = {
    businessName: safeStr(parsed.businessName ?? parsed.company),
    businessAddress: safeStr(parsed.businessAddress ?? parsed.address),
    city: safeStr(parsed.city),
    province: safeStr(parsed.province),
    fullCivicAddress: safeStr(parsed.fullCivicAddress),
    latitude: safeStr(parsed.latitude),
    longitude: safeStr(parsed.longitude),
  };

  return { card, geo };
}
