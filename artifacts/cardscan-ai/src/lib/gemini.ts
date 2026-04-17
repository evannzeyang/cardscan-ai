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

export async function analyzeBusinessCard(
  imageFile: File,
  apiKey: string
): Promise<ExtractedCard> {
  if (!apiKey) {
    throw new Error("No Gemini API key configured. Please add your API key in Settings.");
  }

  const base64Data = await fileToBase64(imageFile);
  const mimeType = imageFile.type || "image/jpeg";

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: 'Extract all information from this business card and return it as JSON with these exact keys: name, title, company, email, phone, website, linkedin, address. Then add a \'companySummary\' key with 2-3 sentences describing what this company likely does. Return ONLY valid JSON, no markdown, no code fences.',
          },
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

  let parsed: Partial<ExtractedCard>;
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

  return {
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
}
