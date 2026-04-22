import { useState } from "react";
import { useLocation } from "wouter";
import { Settings, X, Eye, EyeOff, CheckCircle, TableProperties, Scan, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiKey, saveApiKey } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";

export default function Header() {
  const [location, setLocation] = useLocation();
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(getApiKey);
  const [showKey, setShowKey] = useState(false);
  const { toast } = useToast();

  function handleSaveKey() {
    saveApiKey(apiKey.trim());
    toast({ title: "API key saved" });
    setShowSettings(false);
  }

  const navLinks = [
    { path: "/scan", label: "Scan", icon: Scan },
    { path: "/contacts", label: "Contacts", icon: TableProperties },
    { path: "/events", label: "Events", icon: CalendarDays },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          {/* Logo */}
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity shrink-0"
            data-testid="button-home"
          >
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M6 9h4" /><path d="M6 13h8" /><path d="M14 9h4" />
              </svg>
            </div>
            <span className="text-base font-bold text-foreground tracking-tight hidden sm:block">CardScan AI</span>
          </button>

          {/* Nav */}
          <nav className="flex items-center gap-0.5 ml-1">
            {navLinks.map(({ path, label, icon: Icon }) => {
              const active = location === path || (path === "/contacts" && location.startsWith("/contacts/"));
              return (
                <button
                  key={path}
                  onClick={() => setLocation(path)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                  data-testid={`nav-${label.toLowerCase()}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:block">{label}</span>
                </button>
              );
            })}
          </nav>

          <div className="ml-auto">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setShowSettings(true)}
              data-testid="button-settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative bg-card border border-card-border rounded-2xl shadow-xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Settings</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSettings(false)} data-testid="button-close-settings">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2 mb-6">
              <Label htmlFor="api-key-input" className="text-sm font-medium">Gemini API Key</Label>
              <div className="relative">
                <Input
                  id="api-key-input"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Gemini API key"
                  className="pr-10"
                  data-testid="input-api-key"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowKey((v) => !v)}
                  data-testid="button-toggle-key-visibility"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your API key from{" "}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Google AI Studio
                </a>
                . The key is stored only in your browser.
              </p>
            </div>

            {getApiKey() && (
              <div className="flex items-center gap-2 text-sm text-primary mb-4">
                <CheckCircle className="h-4 w-4" />
                API key is configured
              </div>
            )}

            <Button className="w-full font-semibold" onClick={handleSaveKey} data-testid="button-save-api-key">
              Save API Key
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
