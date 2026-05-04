import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Save, RotateCcw, AlertTriangle, Loader2, Building2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { ExtractedCard, ExtractedGeoData } from "@/lib/gemini";
import {
  getEvents, createContact, searchCompanies, createCompany,
  type ApiEvent, type ApiCompany,
} from "@/lib/api";

interface ReviewPageProps {
  extractedData: ExtractedCard | null;
  geoData: ExtractedGeoData | null;
  imageUrl: string;
}

export default function Review({ extractedData, geoData, imageUrl }: ReviewPageProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [matchedCompany, setMatchedCompany] = useState<ApiCompany | null>(null);
  const [companySearchDone, setCompanySearchDone] = useState(false);

  const [form, setForm] = useState<ExtractedCard>(
    extractedData ?? {
      name: "", title: "", company: "", email: "",
      phone: "", website: "", linkedin: "", address: "", companySummary: "",
    }
  );

  useEffect(() => {
    getEvents().then(setEvents).catch(() => {});
  }, []);

  useEffect(() => {
    const name = form.company?.trim();
    if (!name || companySearchDone) return;
    const timer = setTimeout(async () => {
      try {
        const results = await searchCompanies(name);
        if (results.length > 0) {
          setMatchedCompany(results[0]);
        }
      } catch {
      } finally {
        setCompanySearchDone(true);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [form.company, companySearchDone]);

  if (!extractedData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No card data to review.</p>
          <Button onClick={() => setLocation("/scan")} data-testid="button-go-scan">Scan a Card</Button>
        </div>
      </div>
    );
  }

  function handleChange(field: keyof ExtractedCard, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "company") {
      setCompanySearchDone(false);
      setMatchedCompany(null);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      let companyId: string | undefined;

      if (form.company?.trim()) {
        if (matchedCompany) {
          companyId = matchedCompany.id;
        } else {
          const company = await createCompany({
            businessName: form.company.trim(),
            businessAddress: geoData?.businessAddress,
            city: geoData?.city,
            province: geoData?.province,
            fullCivicAddress: geoData?.fullCivicAddress,
            latitude: geoData?.latitude,
            longitude: geoData?.longitude,
            website: form.website || undefined,
          });
          companyId = company.id;
        }
      }

      await createContact({
        companyId,
        name: form.name || undefined,
        title: form.title || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        website: form.website || undefined,
        linkedin: form.linkedin || undefined,
        address: form.address || geoData?.fullCivicAddress || undefined,
        companySummary: form.companySummary || undefined,
        eventId: selectedEventId || undefined,
      });

      toast({
        title: "Contact saved!",
        description: matchedCompany
          ? `Linked to existing company: ${matchedCompany.businessName}`
          : `${form.name || "Contact"} saved to your contacts.`,
      });

      setLocation("/contacts");
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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
          <p className="text-sm text-muted-foreground mt-1">Review the extracted info before saving</p>
        </div>

        {imageUrl && (
          <div className="mb-6 rounded-xl overflow-hidden border border-border">
            <img src={imageUrl} alt="Scanned business card" className="w-full object-contain max-h-40 bg-muted/30" data-testid="img-scanned-card" />
          </div>
        )}

        <div className="flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-4 mb-6">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-300">AI results may not be 100% accurate. Please review before saving.</p>
        </div>

        {matchedCompany && (
          <div className="flex items-start gap-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 p-4 mb-6">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-700 dark:text-green-300">Company already in directory</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                <Building2 className="h-3 w-3 inline mr-1" />
                {matchedCompany.businessName}
                {matchedCompany.city ? ` · ${matchedCompany.city}` : ""}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4 mb-6">
          {fields.map(({ key, label, type }) => (
            <div key={key}>
              <Label htmlFor={`field-${key}`} className="text-sm font-medium text-foreground mb-1.5 block">{label}</Label>
              <Input
                id={`field-${key}`} type={type ?? "text"} value={form[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={`Enter ${label.toLowerCase()}`} data-testid={`input-${key}`}
              />
            </div>
          ))}

          <div>
            <Label htmlFor="field-companySummary" className="text-sm font-medium text-foreground mb-1.5 block">Company Summary</Label>
            <Textarea
              id="field-companySummary" value={form.companySummary}
              onChange={(e) => handleChange("companySummary", e.target.value)}
              placeholder="AI-generated summary of the company..." rows={4} data-testid="input-companySummary"
            />
          </div>

          {events.length > 0 && (
            <div>
              <Label htmlFor="field-event" className="text-sm font-medium text-foreground mb-1.5 block">Link to Event (optional)</Label>
              <select
                id="field-event"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                data-testid="select-event"
              >
                <option value="">— No event —</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({new Date(ev.dateTime).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {geoData && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 mb-6 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground text-sm mb-2">Location data</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="font-medium">City:</span><span>{geoData.city}</span>
              <span className="font-medium">Province:</span><span>{geoData.province}</span>
              <span className="font-medium">Latitude:</span><span>{geoData.latitude}</span>
              <span className="font-medium">Longitude:</span><span>{geoData.longitude}</span>
            </div>
            <p className="mt-2 text-xs">{geoData.fullCivicAddress}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setLocation("/scan")} disabled={saving} data-testid="button-rescan">
            <RotateCcw className="h-4 w-4 mr-2" />Rescan
          </Button>
          <Button className="flex-1 font-semibold" onClick={handleSave} disabled={saving} data-testid="button-save-contact">
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save Contact</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
