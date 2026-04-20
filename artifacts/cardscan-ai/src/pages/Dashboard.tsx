import { useLocation } from "wouter";
import { Scan, TableProperties } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[calc(100vh-56px)] bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M6 9h4" /><path d="M6 13h8" /><path d="M14 9h4" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">CardScan AI</h1>
        <p className="text-muted-foreground text-sm mb-10">
          Scan business cards with AI to instantly extract and organize contact info.
        </p>

        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            className="w-full h-12 text-base font-semibold"
            onClick={() => setLocation("/scan")}
            data-testid="button-scan-new"
          >
            <Scan className="h-5 w-5 mr-2" />
            Scan New Card
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="w-full h-12 text-base font-semibold"
            onClick={() => setLocation("/contacts")}
            data-testid="button-view-contacts"
          >
            <TableProperties className="h-5 w-5 mr-2" />
            View & Sync Contacts
          </Button>
        </div>
      </div>
    </div>
  );
}
