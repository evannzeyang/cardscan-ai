import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Settings, X, Eye, EyeOff, CheckCircle, TableProperties, Scan,
  CalendarDays, Trash2, LogOut, User, Loader2, KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@workspace/replit-auth-web";
import { getGeminiKeyStatus, setGeminiKey, deleteGeminiKey } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function Header() {
  const [location, setLocation] = useLocation();
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const { user, logout } = useAuth();

  useEffect(() => {
    if (!showSettings) return;
    setLoadingStatus(true);
    getGeminiKeyStatus()
      .then((s) => setHasKey(s.hasKey))
      .catch(() => {})
      .finally(() => setLoadingStatus(false));
  }, [showSettings]);

  async function handleSaveKey() {
    if (!apiKey.trim()) return;
    setSaving(true);
    try {
      await setGeminiKey(apiKey.trim());
      setHasKey(true);
      setApiKey("");
      toast({ title: "API key saved securely" });
    } catch {
      toast({ title: "Failed to save API key", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteKey() {
    setDeleting(true);
    try {
      await deleteGeminiKey();
      setHasKey(false);
      setApiKey("");
      toast({ title: "API key removed" });
    } catch {
      toast({ title: "Failed to remove API key", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  const navLinks = [
    { path: "/scan", label: "Scan", icon: Scan },
    { path: "/contacts", label: "Contacts", icon: TableProperties },
    { path: "/events", label: "Events", icon: CalendarDays },
  ];

  const displayName = user?.firstName
    ? user.firstName
    : user?.email?.split("@")[0] ?? "Account";

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
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

          <div className="ml-auto flex items-center gap-1.5">
            {user && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mr-1 hidden sm:flex">
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt={displayName} className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <User className="h-4 w-4" />
                )}
                <span className="font-medium text-foreground">{displayName}</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setShowSettings(true)}
              title="Settings"
              data-testid="button-settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={logout}
              title="Log out"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
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

            {user && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border mb-5">
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt={displayName} className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                  {user.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
                </div>
                <Button variant="ghost" size="sm" className="ml-auto shrink-0 h-8 text-xs gap-1.5" onClick={logout}>
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </Button>
              </div>
            )}

            <div className="space-y-3 mb-5">
              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Gemini API Key</Label>
              </div>

              {loadingStatus ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking key status...
                </div>
              ) : hasKey ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-300">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    API key is configured
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleDeleteKey}
                    disabled={deleting}
                    data-testid="button-delete-api-key"
                  >
                    {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    {deleting ? "" : "Remove"}
                  </Button>
                </div>
              ) : null}

              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasKey ? "Enter new key to replace existing" : "Enter your Gemini API key"}
                  className="pr-10"
                  data-testid="input-api-key"
                  onKeyDown={(e) => e.key === "Enter" && handleSaveKey()}
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
                Get a free key from{" "}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Google AI Studio
                </a>
                . Your key is encrypted and stored securely on the server — never in your browser.
              </p>
            </div>

            <Button
              className="w-full font-semibold"
              onClick={handleSaveKey}
              disabled={!apiKey.trim() || saving}
              data-testid="button-save-api-key"
            >
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : hasKey ? "Replace API Key" : "Save API Key"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
