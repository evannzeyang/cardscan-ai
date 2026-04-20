import { useState } from "react";
import { useLocation } from "wouter";
import { Save, RotateCcw, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveContact, type Contact } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import type { ExtractedCard, ExtractedGeoData } from "@/lib/gemini";

interface ReviewPageProps {
  extractedData: ExtractedCard | null;
  geoData: ExtractedGeoData | null;
  imageUrl: string;
}

async function appendToSheet(geo: ExtractedGeoData): Promise<void> {
  const response = await fetch("/api/sheets/append", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(geo),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error((data as { message?: string }).message ?? `HTTP ${response.status}`);
  }
}

export default function Review({ extractedData, geoData, imageUrl }: ReviewPageProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<ExtractedCard>(
    extractedData ?? {
      name: "",
      title: "",
      company: "",
      email: "",
      phone: "",
      website: "",
      linkedin: "",
      address: "",
      companySummary: "",
    }
  );

  if (!extractedData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No card data to review.</p>
          <Button onClick={() => setLocation("/scan")} data-testid="button-go-scan">
            Scan a Card
          </Button>
        </div>
      </div>
    );
  }

  function handleChange(field: keyof ExtractedCard, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);

    const contactData: Omit<Contact, "id" | "scannedAt"> = {
      name: form.name,
      title: form.title,
      company: form.company,
      email: form.email,
      phone: form.phone,
      website: form.website,
      linkedin: form.linkedin,
      address: form.address,
      companySummary: form.companySummary,
    };

    saveContact(contactData);

    if (geoData) {
      try {
        await appendToSheet(geoData);
        toast({
          title: "Contact saved!",
          description: (
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              {form.name || "Contact"} saved and added to BCoC Members sheet.
            </span>
          ),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        toast({
          title: "Contact saved",
          description: `Saved locally. Google Sheet update failed: ${msg}`,
          variant: "destructive",
        });
      }
    } else {
      toast({ title: "Contact saved!", description: `${form.name || "Contact"} has been saved.` });
    }

    setSaving(false);
    setLocation("/");
  }

  const fields: Array<{ key: keyof ExtractedCard; label: string; type?: string }> = [
    { key: "name", label: "Full Name" },
    { key: "title", label: "Job Title" },
    { key: "company", label: "Company" },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone", type: "tel" },
    { key: "website", label: "Website", type: "url" },
    { key: "linkedin", label: "LinkedIn URL", type: "url" },
    { key: "address", label: "Address" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-foreground">Review & Save</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review the extracted info before saving
          </p>
        </div>

        {/* Image preview (small) */}
        {imageUrl && (
          <div className="mb-6 rounded-xl overflow-hidden border border-border">
            <img
              src={imageUrl}
              alt="Scanned business card"
              className="w-full object-contain max-h-40 bg-muted/30"
              data-testid="img-scanned-card"
            />
          </div>
        )}

        {/* AI warning */}
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-4 mb-6">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            AI results may not be 100% accurate. Please review before saving.
          </p>
        </div>

        {/* Form fields */}
        <div className="space-y-4 mb-6">
          {fields.map(({ key, label, type }) => (
            <div key={key}>
              <Label htmlFor={`field-${key}`} className="text-sm font-medium text-foreground mb-1.5 block">
                {label}
              </Label>
              <Input
                id={`field-${key}`}
                type={type ?? "text"}
                value={form[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={`Enter ${label.toLowerCase()}`}
                data-testid={`input-${key}`}
              />
            </div>
          ))}

          <div>
            <Label htmlFor="field-companySummary" className="text-sm font-medium text-foreground mb-1.5 block">
              Company Summary
            </Label>
            <Textarea
              id="field-companySummary"
              value={form.companySummary}
              onChange={(e) => handleChange("companySummary", e.target.value)}
              placeholder="AI-generated summary of the company..."
              rows={4}
              data-testid="input-companySummary"
            />
          </div>
        </div>

        {/* Google Sheet geo preview (subtle, info only) */}
        {geoData && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 mb-6 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground text-sm mb-2">Google Sheet data (auto-filled)</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="font-medium">City:</span><span>{geoData.city}</span>
              <span className="font-medium">Province:</span><span>{geoData.province}</span>
              <span className="font-medium">Latitude:</span><span>{geoData.latitude}</span>
              <span className="font-medium">Longitude:</span><span>{geoData.longitude}</span>
            </div>
            <p className="mt-2 text-xs">{geoData.fullCivicAddress}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setLocation("/scan")}
            disabled={saving}
            data-testid="button-rescan"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Rescan
          </Button>
          <Button
            className="flex-1 font-semibold"
            onClick={handleSave}
            disabled={saving}
            data-testid="button-save-contact"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Contact
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
