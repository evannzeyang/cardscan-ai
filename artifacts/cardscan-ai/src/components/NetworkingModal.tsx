import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Search, UserCheck, Users, Network, Loader2, UserPlus,
  Check, XIcon, ExternalLink, Mail, Phone, Building2, Briefcase,
  Globe, ChevronLeft, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  searchUsers, getConnections, sendConnectionRequest,
  acceptConnection, declineConnection, getConnectionUserProfile,
  type PublicUser, type ConnectionRow, type ConnectionsData, type ConnectedUserProfile,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type Tab = "search" | "requests" | "network";

function UserAvatar({ src, name, size = "md" }: { src?: string | null; name?: string | null; size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? "w-16 h-16 text-2xl" : size === "md" ? "w-10 h-10 text-sm" : "w-8 h-8 text-xs";
  const initials = name?.trim() ? name.trim().slice(0, 1).toUpperCase() : "?";
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? ""}
        className={`${dim} rounded-full object-cover shrink-0`}
        onError={(e) => { (e.target as HTMLImageElement).src = ""; }}
      />
    );
  }
  return (
    <div className={`${dim} rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-semibold text-primary`}>
      {initials}
    </div>
  );
}

function displayName(user: PublicUser | null): string {
  if (!user) return "Unknown";
  const n = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return n || user.email?.split("@")[0] || "User";
}

function UserCard({ user, children }: { user: PublicUser; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
      <UserAvatar src={user.profileImageUrl} name={displayName(user)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{displayName(user)}</p>
        {(user.jobTitle || user.companyName) && (
          <p className="text-xs text-muted-foreground truncate">
            {[user.jobTitle, user.companyName].filter(Boolean).join(" · ")}
          </p>
        )}
        {!user.jobTitle && !user.companyName && user.email && (
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        )}
      </div>
      {children}
    </div>
  );
}

interface Props {
  onClose: () => void;
}

export default function NetworkingModal({ onClose }: Props) {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("network");
  const [connections, setConnections] = useState<ConnectionsData>({ incoming: [], outgoing: [], accepted: [] });
  const [loadingConns, setLoadingConns] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PublicUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [profileView, setProfileView] = useState<ConnectedUserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadConnections = useCallback(async () => {
    try {
      const data = await getConnections();
      setConnections(data);
    } catch {
      /* silent */
    } finally {
      setLoadingConns(false);
    }
  }, []);

  useEffect(() => { loadConnections(); }, [loadConnections]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchUsers(searchQuery.trim());
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  function getConnectionStatus(userId: string): "outgoing" | "incoming" | "accepted" | null {
    if (connections.accepted.some((c) => c.user?.id === userId)) return "accepted";
    if (connections.outgoing.some((c) => c.user?.id === userId)) return "outgoing";
    if (connections.incoming.some((c) => c.user?.id === userId)) return "incoming";
    return null;
  }

  async function handleConnect(userId: string) {
    setActionLoading((p) => ({ ...p, [userId]: true }));
    try {
      await sendConnectionRequest(userId);
      await loadConnections();
      toast({ title: "Connection request sent!" });
    } catch (err) {
      toast({ title: "Failed to send request", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setActionLoading((p) => ({ ...p, [userId]: false }));
    }
  }

  async function handleAccept(connId: string) {
    setActionLoading((p) => ({ ...p, [connId]: true }));
    try {
      await acceptConnection(connId);
      await loadConnections();
      toast({ title: "Connection accepted!" });
    } catch {
      toast({ title: "Failed to accept request", variant: "destructive" });
    } finally {
      setActionLoading((p) => ({ ...p, [connId]: false }));
    }
  }

  async function handleDecline(connId: string) {
    setActionLoading((p) => ({ ...p, [connId]: true }));
    try {
      await declineConnection(connId);
      await loadConnections();
    } catch {
      toast({ title: "Failed to decline request", variant: "destructive" });
    } finally {
      setActionLoading((p) => ({ ...p, [connId]: false }));
    }
  }

  async function handleViewProfile(userId: string) {
    setLoadingProfile(true);
    try {
      const profile = await getConnectionUserProfile(userId);
      setProfileView(profile);
    } catch {
      toast({ title: "Could not load profile", variant: "destructive" });
    } finally {
      setLoadingProfile(false);
    }
  }

  const incomingCount = connections.incoming.length;

  const tabs: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: "network", label: "My Network", icon: Users },
    { id: "requests", label: "Requests", icon: UserCheck, badge: incomingCount },
    { id: "search", label: "Find People", icon: Search },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md z-10 flex flex-col max-h-[92vh] sm:max-h-[85vh]">

        {profileView ? (
          <ProfileOverlay
            profile={profileView}
            onBack={() => setProfileView(null)}
            onClose={onClose}
          />
        ) : (
          <>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Network className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground leading-tight">Networking</h2>
                  <p className="text-xs text-muted-foreground">
                    {connections.accepted.length} connection{connections.accepted.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex border-b border-border shrink-0">
              {tabs.map(({ id, label, icon: Icon, badge }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors relative ${
                    tab === id
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  {badge != null && badge > 0 && (
                    <span className="absolute top-1.5 right-3 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {tab === "search" && (
                <SearchTab
                  query={searchQuery}
                  onQueryChange={setSearchQuery}
                  results={searchResults}
                  searching={searching}
                  getStatus={getConnectionStatus}
                  actionLoading={actionLoading}
                  onConnect={handleConnect}
                />
              )}
              {tab === "requests" && (
                <RequestsTab
                  incoming={connections.incoming}
                  outgoing={connections.outgoing}
                  actionLoading={actionLoading}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                  loading={loadingConns}
                />
              )}
              {tab === "network" && (
                <NetworkTab
                  accepted={connections.accepted}
                  loading={loadingConns || loadingProfile}
                  onViewProfile={handleViewProfile}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SearchTab({
  query, onQueryChange, results, searching, getStatus, actionLoading, onConnect,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  results: PublicUser[];
  searching: boolean;
  getStatus: (id: string) => "outgoing" | "incoming" | "accepted" | null;
  actionLoading: Record<string, boolean>;
  onConnect: (id: string) => void;
}) {
  return (
    <div className="p-4 space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search by name or email…"
          className="pl-9"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {query.trim().length < 2 && (
        <div className="text-center py-10 text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Type at least 2 characters to search</p>
        </div>
      )}

      {query.trim().length >= 2 && !searching && results.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <p className="text-sm">No users found for "{query}"</p>
        </div>
      )}

      <div className="space-y-2">
        {results.map((user) => {
          const status = getStatus(user.id);
          const loading = actionLoading[user.id];
          return (
            <UserCard key={user.id} user={user}>
              {status === "accepted" ? (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium shrink-0">
                  <UserCheck className="h-3.5 w-3.5" />Connected
                </span>
              ) : status === "outgoing" ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Clock className="h-3.5 w-3.5" />Pending
                </span>
              ) : status === "incoming" ? (
                <span className="text-xs text-amber-600 font-medium shrink-0">Respond ↑</span>
              ) : (
                <Button
                  size="sm"
                  className="h-7 px-3 text-xs shrink-0"
                  disabled={loading}
                  onClick={() => onConnect(user.id)}
                >
                  {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <><UserPlus className="h-3 w-3 mr-1" />Connect</>}
                </Button>
              )}
            </UserCard>
          );
        })}
      </div>
    </div>
  );
}

function RequestsTab({
  incoming, outgoing, actionLoading, onAccept, onDecline, loading,
}: {
  incoming: ConnectionRow[];
  outgoing: ConnectionRow[];
  actionLoading: Record<string, boolean>;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  loading: boolean;
}) {
  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const hasAny = incoming.length > 0 || outgoing.length > 0;

  if (!hasAny) {
    return (
      <div className="text-center py-14 px-6 text-muted-foreground">
        <UserCheck className="h-9 w-9 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">No pending requests</p>
        <p className="text-xs mt-1">Search for people to connect with</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5">
      {incoming.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Incoming ({incoming.length})
          </p>
          <div className="space-y-2">
            {incoming.map((conn) => (
              <div key={conn.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                <UserAvatar src={conn.user?.profileImageUrl} name={displayName(conn.user)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{displayName(conn.user)}</p>
                  {conn.user?.jobTitle && (
                    <p className="text-xs text-muted-foreground truncate">{conn.user.jobTitle}</p>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 border-destructive/40 hover:bg-destructive/10 hover:border-destructive text-destructive"
                    disabled={actionLoading[conn.id]}
                    onClick={() => onDecline(conn.id)}
                    title="Decline"
                  >
                    {actionLoading[conn.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <XIcon className="h-3 w-3" />}
                  </Button>
                  <Button
                    size="icon"
                    className="h-7 w-7 bg-green-600 hover:bg-green-700"
                    disabled={actionLoading[conn.id]}
                    onClick={() => onAccept(conn.id)}
                    title="Accept"
                  >
                    {actionLoading[conn.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {outgoing.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Sent ({outgoing.length})
          </p>
          <div className="space-y-2">
            {outgoing.map((conn) => (
              <div key={conn.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                <UserAvatar src={conn.user?.profileImageUrl} name={displayName(conn.user)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{displayName(conn.user)}</p>
                  {conn.user?.jobTitle && (
                    <p className="text-xs text-muted-foreground truncate">{conn.user.jobTitle}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Pending</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 shrink-0"
                  disabled={actionLoading[conn.id]}
                  onClick={() => onDecline(conn.id)}
                  title="Cancel request"
                >
                  {actionLoading[conn.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <XIcon className="h-3 w-3" />}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NetworkTab({
  accepted, loading, onViewProfile,
}: {
  accepted: ConnectionRow[];
  loading: boolean;
  onViewProfile: (userId: string) => void;
}) {
  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (accepted.length === 0) {
    return (
      <div className="text-center py-14 px-6 text-muted-foreground">
        <Users className="h-9 w-9 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">Your network is empty</p>
        <p className="text-xs mt-1">Find people to connect with using the search tab</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      {accepted.map((conn) => (
        <UserCard key={conn.id} user={conn.user!}>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 text-xs shrink-0"
            onClick={() => conn.user && onViewProfile(conn.user.id)}
          >
            View Card
          </Button>
        </UserCard>
      ))}
    </div>
  );
}

function ProfileOverlay({ profile, onBack, onClose }: { profile: ConnectedUserProfile; onBack: () => void; onClose: () => void }) {
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.email?.split("@")[0] || "User";

  const details: Array<{ icon: React.ElementType; label: string; value: string | null; href?: string }> = [
    { icon: Briefcase, label: "Title", value: profile.jobTitle },
    { icon: Building2, label: "Company", value: profile.companyName },
    { icon: Globe, label: "Industry", value: profile.industry },
    { icon: Mail, label: "Email", value: profile.businessEmail, href: profile.businessEmail ? `mailto:${profile.businessEmail}` : undefined },
    { icon: Phone, label: "Phone", value: profile.businessPhone, href: profile.businessPhone ? `tel:${profile.businessPhone}` : undefined },
    { icon: ExternalLink, label: "LinkedIn", value: profile.linkedinUrl ? "View Profile" : null, href: profile.linkedinUrl ?? undefined },
  ].filter((d) => d.value);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-border shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-base font-semibold text-foreground flex-1">Digital Business Card</h2>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <UserAvatar src={profile.profileImageUrl} name={name} size="lg" />
          <div>
            <h3 className="text-xl font-bold text-foreground">{name}</h3>
            {profile.email && (
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            )}
          </div>
          {(profile.jobTitle || profile.companyName) && (
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              {profile.jobTitle && (
                <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                  {profile.jobTitle}
                </span>
              )}
              {profile.companyName && (
                <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full">
                  {profile.companyName}
                </span>
              )}
            </div>
          )}
        </div>

        {details.length > 0 && (
          <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
            {details.map(({ icon: Icon, label, value, href }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate block">
                      {value}
                    </a>
                  ) : (
                    <p className="text-sm text-foreground truncate">{value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {details.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">This user hasn't filled out their profile yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
