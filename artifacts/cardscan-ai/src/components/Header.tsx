import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  Settings, X, Eye, EyeOff, CheckCircle, TableProperties, Scan,
  CalendarDays, Trash2, LogOut, Loader2, KeyRound,
  UserCircle2, Users, ChevronDown, UserCog, Network,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@workspace/replit-auth-web";
import {
  getGeminiKeyStatus, setGeminiKey, deleteGeminiKey,
  getUserProfile, updateUserProfile, type ApiProfile,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type Modal = "none" | "settings" | "buildProfile" | "addConnections";

function Avatar({ src, name, size = "sm" }: { src?: string | null; name?: string | null; size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? "w-16 h-16 text-xl" : size === "md" ? "w-10 h-10 text-base" : "w-8 h-8 text-sm";
  const initials = name ? name.slice(0, 1).toUpperCase() : "?";
  if (src) return <img src={src} alt={name ?? "Avatar"} className={`${dim} rounded-full object-cover shrink-0 ring-2 ring-background`} />;
  return (
    <div className={`${dim} rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-semibold text-primary ring-2 ring-background`}>
      {initials}
    </div>
  );
}

export default function Header() {
  const [location, setLocation] = useLocation();
  const [modal, setModal] = useState<Modal>("none");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user, logout } = useAuth();

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
    : user?.email?.split("@")[0] ?? "Account";

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showDropdown]);

  const navLinks = [
    { path: "/scan", label: "Scan", icon: Scan },
    { path: "/contacts", label: "Contacts", icon: TableProperties },
    { path: "/events", label: "Events", icon: CalendarDays },
  ];

  function openModal(m: Modal) {
    setShowDropdown(false);
    setModal(m);
  }

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
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => openModal("settings")}
              title="API Key Settings"
              data-testid="button-settings"
            >
              <Settings className="h-4 w-4" />
            </Button>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown((v) => !v)}
                className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-xl hover:bg-muted/60 transition-colors"
                data-testid="button-profile-menu"
              >
                <Avatar src={user?.profileImageUrl} name={displayName} size="sm" />
                <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${showDropdown ? "rotate-180" : ""}`} />
              </button>

              {showDropdown && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50">
                  <div className="px-3 py-2.5 border-b border-border">
                    <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                    {user?.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => openModal("buildProfile")}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted/60 transition-colors"
                      data-testid="dropdown-build-profile"
                    >
                      <UserCog className="h-4 w-4 text-muted-foreground" />
                      Build Profile
                    </button>
                    <button
                      onClick={() => openModal("addConnections")}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted/60 transition-colors"
                      data-testid="dropdown-add-connections"
                    >
                      <Network className="h-4 w-4 text-muted-foreground" />
                      Add Connections
                    </button>
                    <div className="border-t border-border mt-1 pt-1">
                      <button
                        onClick={() => { setShowDropdown(false); logout(); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                        data-testid="dropdown-logout"
                      >
                        <LogOut className="h-4 w-4" />
                        Log Out
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {modal === "settings" && (
        <SettingsModal onClose={() => setModal("none")} toast={toast} />
      )}
      {modal === "buildProfile" && (
        <BuildProfileModal onClose={() => setModal("none")} toast={toast} user={user} />
      )}
      {modal === "addConnections" && (
        <AddConnectionsModal onClose={() => setModal("none")} />
      )}
    </>
  );
}

function SettingsModal({ onClose, toast }: { onClose: () => void; toast: ReturnType<typeof useToast>["toast"] }) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getGeminiKeyStatus()
      .then((s) => setHasKey(s.hasKey))
      .catch(() => {})
      .finally(() => setLoadingStatus(false));
  }, []);

  async function handleSave() {
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

  async function handleDelete() {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-card-border rounded-2xl shadow-xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">API Key Settings</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} data-testid="button-close-settings"><X className="h-4 w-4" /></Button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Gemini API Key</Label>
          </div>

          {loadingStatus ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />Checking key status...
            </div>
          ) : hasKey ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50">
              <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-300">
                <CheckCircle className="h-4 w-4 shrink-0" />
                API key is configured
              </div>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleDelete} disabled={deleting} data-testid="button-delete-api-key">
                {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1" />}
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
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowKey((v) => !v)} data-testid="button-toggle-key-visibility">
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            Get a free key from{" "}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio</a>
            . Encrypted and stored securely — never in your browser.
          </p>
        </div>

        <Button className="w-full font-semibold mt-5" onClick={handleSave} disabled={!apiKey.trim() || saving} data-testid="button-save-api-key">
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : hasKey ? "Replace API Key" : "Save API Key"}
        </Button>
      </div>
    </div>
  );
}

interface BuildProfileModalProps {
  onClose: () => void;
  toast: ReturnType<typeof useToast>["toast"];
  user: { profileImageUrl?: string | null; firstName?: string | null; lastName?: string | null; email?: string | null } | null;
}

function BuildProfileModal({ onClose, toast, user }: BuildProfileModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<ApiProfile>>({});

  useEffect(() => {
    getUserProfile()
      .then((p) => setForm(p))
      .catch(() => {
        setForm({
          firstName: user?.firstName ?? "",
          lastName: user?.lastName ?? "",
          profileImageUrl: user?.profileImageUrl ?? "",
        });
      })
      .finally(() => setLoading(false));
  }, [user]);

  function set(key: keyof ApiProfile, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateUserProfile({
        firstName: form.firstName ?? undefined,
        lastName: form.lastName ?? undefined,
        profileImageUrl: form.profileImageUrl || null,
        jobTitle: form.jobTitle ?? undefined,
        companyName: form.companyName ?? undefined,
        industry: form.industry ?? undefined,
        businessEmail: form.businessEmail || null,
        businessPhone: form.businessPhone ?? undefined,
        linkedinUrl: form.linkedinUrl || null,
      });
      toast({ title: "Profile saved!" });
      onClose();
    } catch (err) {
      toast({ title: "Failed to save profile", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const fields: Array<{ key: keyof ApiProfile; label: string; placeholder?: string; type?: string }> = [
    { key: "firstName", label: "First Name", placeholder: "Jane" },
    { key: "lastName", label: "Last Name", placeholder: "Smith" },
    { key: "jobTitle", label: "Job Title", placeholder: "Marketing Director" },
    { key: "companyName", label: "Company Name", placeholder: "Acme Corp" },
    { key: "industry", label: "Industry", placeholder: "Technology, Finance, Healthcare…" },
    { key: "businessEmail", label: "Business Email", placeholder: "jane@company.com", type: "email" },
    { key: "businessPhone", label: "Business Phone", placeholder: "+1 (555) 000-0000", type: "tel" },
    { key: "linkedinUrl", label: "LinkedIn URL", placeholder: "https://linkedin.com/in/janesmith", type: "url" },
    { key: "profileImageUrl", label: "Profile Picture URL", placeholder: "https://example.com/photo.jpg", type: "url" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-card-border rounded-2xl shadow-xl w-full max-w-md z-10 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserCog className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Build Profile</h2>
              <p className="text-xs text-muted-foreground">Your professional identity</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="overflow-y-auto px-6 py-4 space-y-4">
              {form.profileImageUrl && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border mb-2">
                  <img src={form.profileImageUrl} alt="Profile preview" className="w-12 h-12 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  <div>
                    <p className="text-xs font-medium text-foreground">Profile picture preview</p>
                    <p className="text-xs text-muted-foreground">Update the URL below to change</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {fields.slice(0, 2).map(({ key, label, placeholder, type }) => (
                  <div key={key}>
                    <Label className="text-xs font-medium mb-1.5 block text-muted-foreground uppercase tracking-wide">{label}</Label>
                    <Input
                      type={type ?? "text"}
                      value={(form[key] as string) ?? ""}
                      onChange={(e) => set(key, e.target.value)}
                      placeholder={placeholder}
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>

              {fields.slice(2).map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <Label className="text-xs font-medium mb-1.5 block text-muted-foreground uppercase tracking-wide">{label}</Label>
                  <Input
                    type={type ?? "text"}
                    value={(form[key] as string) ?? ""}
                    onChange={(e) => set(key, e.target.value)}
                    placeholder={placeholder}
                    className="text-sm"
                  />
                </div>
              ))}
            </div>

            <div className="px-6 pb-6 pt-3 border-t border-border shrink-0 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button className="flex-1 font-semibold" onClick={handleSave} disabled={saving} data-testid="button-save-profile">
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save Profile"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AddConnectionsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-card-border rounded-2xl shadow-xl w-full max-w-sm p-6 z-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Network className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Add Connections</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          Networking features coming soon! Connect with other users on the app.
        </p>
        <Button className="w-full font-semibold" onClick={onClose}>Got it</Button>
      </div>
    </div>
  );
}
