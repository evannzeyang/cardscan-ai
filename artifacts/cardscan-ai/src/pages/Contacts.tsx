import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Scan, Download, Trash2, Upload, CheckCircle2,
  Loader2, Pencil, X, Save, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getContacts, deleteContact, updateContact,
  markAsSynced, exportContactsCSV,
  type Contact, type GeoData,
} from "@/lib/storage";
import { getEvents } from "@/lib/events-storage";
import { useToast } from "@/hooks/use-toast";

function buildGeoFromContact(contact: Contact): GeoData {
  if (contact.geoData) return contact.geoData;
  return {
    businessName: contact.company || "N/A",
    businessAddress: contact.address || "N/A",
    city: "N/A", province: "N/A",
    fullCivicAddress: contact.address || "N/A",
    latitude: "N/A", longitude: "N/A",
  };
}

async function callSheetsAppend(geo: GeoData): Promise<void> {
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

interface EditModalProps {
  contact: Contact;
  onSave: (updates: Partial<Contact>) => void;
  onClose: () => void;
}

function EditModal({ contact, onSave, onClose }: EditModalProps) {
  const [name, setName] = useState(contact.name);
  const [company, setCompany] = useState(contact.company);
  const [address, setAddress] = useState(contact.address);
  const [title, setTitle] = useState(contact.title);
  const [email, setEmail] = useState(contact.email);
  const [phone, setPhone] = useState(contact.phone);
  const events = getEvents();
  const [eventId, setEventId] = useState(contact.eventId ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-card-border rounded-2xl shadow-xl w-full max-w-md p-6 z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Edit Contact</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-4 mb-6">
          {([
            { label: "Full Name", value: name, set: setName },
            { label: "Job Title", value: title, set: setTitle },
            { label: "Company", value: company, set: setCompany },
            { label: "Email", value: email, set: setEmail },
            { label: "Phone", value: phone, set: setPhone },
            { label: "Address", value: address, set: setAddress },
          ] as const).map(({ label, value, set }) => (
            <div key={label}>
              <Label className="text-sm font-medium mb-1.5 block">{label}</Label>
              <Input value={value} onChange={(e) => set(e.target.value)} />
            </div>
          ))}
          {events.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Linked Event</Label>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">— No event —</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.title} ({new Date(ev.dateTime).toLocaleDateString()})</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 font-semibold"
            onClick={() => onSave({ name, company, address, title, email, phone, eventId: eventId || undefined })}
            data-testid="button-save-edit"
          >
            <Save className="h-4 w-4 mr-2" />Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const reload = useCallback(() => setContacts(getContacts()), []);
  useEffect(() => { reload(); }, [reload]);

  function handleDelete(id: string) {
    deleteContact(id);
    reload();
    toast({ title: "Contact deleted" });
  }

  function handleExport() {
    if (contacts.length === 0) {
      toast({ title: "No contacts to export", variant: "destructive" });
      return;
    }
    exportContactsCSV(contacts);
    toast({ title: "CSV exported successfully" });
  }

  function handleEditSave(updates: Partial<Contact>) {
    if (!editingContact) return;
    updateContact(editingContact.id, updates);
    reload();
    setEditingContact(null);
    toast({ title: "Contact updated" });
  }

  async function handleSync(contact: Contact) {
    setSyncingIds((prev) => new Set(prev).add(contact.id));
    try {
      await callSheetsAppend(buildGeoFromContact(contact));
      markAsSynced(contact.id);
      reload();
      toast({ title: "Synced!", description: `${contact.name || "Contact"} added to BCoC Members.` });
    } catch (err) {
      toast({ title: "Sync failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setSyncingIds((prev) => { const n = new Set(prev); n.delete(contact.id); return n; });
    }
  }

  const synced = contacts.filter((c) => c.syncedToSheets).length;
  const pending = contacts.length - synced;

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Button onClick={() => setLocation("/scan")} className="flex items-center gap-2" data-testid="button-scan-new">
              <Scan className="h-4 w-4" />Scan New Card
            </Button>
            <Button variant="outline" onClick={handleExport} className="flex items-center gap-2" data-testid="button-export-csv">
              <Download className="h-4 w-4" />Export CSV
            </Button>
            <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
              <span>{contacts.length} total</span>
              {synced > 0 && <span className="flex items-center gap-1 text-green-600 dark:text-green-400"><CheckCircle2 className="h-3.5 w-3.5" />{synced} synced</span>}
              {pending > 0 && <span className="text-amber-600 dark:text-amber-400">{pending} pending</span>}
            </div>
          </div>

          {contacts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center" data-testid="empty-state">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Scan className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No contacts yet</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-xs">Scan your first business card to get started.</p>
              <Button onClick={() => setLocation("/scan")} data-testid="button-empty-scan">
                <Scan className="h-4 w-4 mr-2" />Scan Your First Card
              </Button>
            </div>
          )}

          {contacts.length > 0 && (
            <>
              {/* Mobile cards */}
              <div className="block md:hidden space-y-3">
                {contacts.map((contact) => {
                  const isSyncing = syncingIds.has(contact.id);
                  return (
                    <div key={contact.id} className="bg-card border border-card-border rounded-xl p-4 shadow-sm" data-testid={`card-contact-${contact.id}`}>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <p className="font-semibold text-foreground truncate">{contact.name || "—"}</p>
                            {contact.syncedToSheets ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                                <CheckCircle2 className="h-3 w-3" />Synced
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Pending</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {contact.title}{contact.title && contact.company ? " · " : ""}{contact.company}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLocation(`/contacts/${contact.id}`)} title="View details">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingContact(contact)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(contact.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      <Button
                        size="sm" variant={contact.syncedToSheets ? "outline" : "default"}
                        className="w-full" onClick={() => handleSync(contact)}
                        disabled={isSyncing || contact.syncedToSheets === true}
                      >
                        {isSyncing ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Syncing...</>
                          : contact.syncedToSheets ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-600" />Synced</>
                          : <><Upload className="h-3.5 w-3.5 mr-1.5" />Sync to Sheets</>}
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-border shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-left border-b border-border">
                      <th className="px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Name</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Title</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Company</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Email</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Phone</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Status</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {contacts.map((contact, idx) => {
                      const isSyncing = syncingIds.has(contact.id);
                      return (
                        <tr key={contact.id} className={`hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`} data-testid={`row-contact-${contact.id}`}>
                          <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{contact.name || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{contact.title || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{contact.company || "—"}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {contact.email ? <a href={`mailto:${contact.email}`} className="text-primary hover:underline">{contact.email}</a> : "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {contact.phone ? <a href={`tel:${contact.phone}`} className="hover:underline">{contact.phone}</a> : "—"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {contact.syncedToSheets ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                                <CheckCircle2 className="h-3 w-3" />Sent to Sheets
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Pending</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm" variant={contact.syncedToSheets ? "outline" : "default"}
                                className="h-8 px-3 text-xs" onClick={() => handleSync(contact)}
                                disabled={isSyncing || contact.syncedToSheets === true}
                                data-testid={`button-sync-${contact.id}`}
                              >
                                {isSyncing ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Syncing</>
                                  : contact.syncedToSheets ? <><CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />Synced</>
                                  : <><Upload className="h-3 w-3 mr-1" />Sync to Sheets</>}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLocation(`/contacts/${contact.id}`)} title="View details" data-testid={`button-detail-${contact.id}`}>
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingContact(contact)} data-testid={`button-edit-${contact.id}`} title="Edit">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(contact.id)} data-testid={`button-delete-${contact.id}`} title="Delete">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {editingContact && (
        <EditModal contact={editingContact} onSave={handleEditSave} onClose={() => setEditingContact(null)} />
      )}
    </>
  );
}
