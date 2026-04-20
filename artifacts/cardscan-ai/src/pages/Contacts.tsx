import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Scan,
  Download,
  Trash2,
  Mail,
  Phone,
  Globe,
  Linkedin,
  MapPin,
  FileText,
  Upload,
  CheckCircle2,
  Loader2,
  Pencil,
  X,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getContacts,
  deleteContact,
  updateContact,
  markAsSynced,
  exportContactsCSV,
  type Contact,
  type GeoData,
} from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";

function buildGeoFromContact(contact: Contact): GeoData {
  if (contact.geoData) return contact.geoData;
  return {
    businessName: contact.company || "N/A",
    businessAddress: contact.address || "N/A",
    city: "N/A",
    province: "N/A",
    fullCivicAddress: contact.address || "N/A",
    latitude: "N/A",
    longitude: "N/A",
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

  function handleSave() {
    onSave({ name, company, address, title, email, phone });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-card border border-card-border rounded-2xl shadow-xl w-full max-w-md p-6 z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Edit Contact</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} data-testid="button-close-edit">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 mb-6">
          {([
            { label: "Full Name", value: name, set: setName, id: "edit-name" },
            { label: "Job Title", value: title, set: setTitle, id: "edit-title" },
            { label: "Company", value: company, set: setCompany, id: "edit-company" },
            { label: "Email", value: email, set: setEmail, id: "edit-email" },
            { label: "Phone", value: phone, set: setPhone, id: "edit-phone" },
            { label: "Address", value: address, set: setAddress, id: "edit-address" },
          ] as const).map(({ label, value, set, id }) => (
            <div key={id}>
              <Label htmlFor={id} className="text-sm font-medium mb-1.5 block">{label}</Label>
              <Input
                id={id}
                value={value}
                onChange={(e) => set(e.target.value)}
                data-testid={id}
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 font-semibold" onClick={handleSave} data-testid="button-save-edit">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const reload = useCallback(() => setContacts(getContacts()), []);

  useEffect(() => {
    reload();
  }, [reload]);

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

  function handleEdit(contact: Contact) {
    setEditingContact(contact);
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
    const geo = buildGeoFromContact(contact);
    try {
      await callSheetsAppend(geo);
      markAsSynced(contact.id);
      reload();
      toast({ title: "Synced to Sheets!", description: `${contact.name || "Contact"} added to BCoC Members.` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Sync failed", description: msg, variant: "destructive" });
    } finally {
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(contact.id);
        return next;
      });
    }
  }

  const synced = contacts.filter((c) => c.syncedToSheets).length;
  const pending = contacts.length - synced;

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Header bar */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Button
              onClick={() => setLocation("/scan")}
              className="flex items-center gap-2"
              data-testid="button-scan-new"
            >
              <Scan className="h-4 w-4" />
              Scan New Card
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              className="flex items-center gap-2"
              data-testid="button-export-csv"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
              <span>{contacts.length} total</span>
              {synced > 0 && (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {synced} synced
                </span>
              )}
              {pending > 0 && (
                <span className="text-amber-600 dark:text-amber-400">
                  {pending} pending
                </span>
              )}
            </div>
          </div>

          {/* Empty state */}
          {contacts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center" data-testid="empty-state">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Scan className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No contacts yet</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-xs">
                Scan your first business card to extract and save contact information automatically.
              </p>
              <Button onClick={() => setLocation("/scan")} data-testid="button-empty-scan">
                <Scan className="h-4 w-4 mr-2" />
                Scan Your First Card
              </Button>
            </div>
          )}

          {contacts.length > 0 && (
            <>
              {/* Mobile card list */}
              <div className="block md:hidden space-y-3">
                {contacts.map((contact) => {
                  const isSyncing = syncingIds.has(contact.id);
                  return (
                    <div
                      key={contact.id}
                      className="bg-card border border-card-border rounded-xl p-4 shadow-sm"
                      data-testid={`card-contact-${contact.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-foreground truncate" data-testid={`text-name-${contact.id}`}>
                              {contact.name || "—"}
                            </p>
                            {contact.syncedToSheets ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                                <CheckCircle2 className="h-3 w-3" /> Synced
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                Pending
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {contact.title}{contact.title && contact.company ? " · " : ""}{contact.company}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(contact)}
                            data-testid={`button-edit-${contact.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setExpandedId(expandedId === contact.id ? null : contact.id)}
                            data-testid={`button-expand-${contact.id}`}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(contact.id)}
                            data-testid={`button-delete-${contact.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Sync button */}
                      <div className="mt-3">
                        <Button
                          size="sm"
                          variant={contact.syncedToSheets ? "outline" : "default"}
                          className="w-full"
                          onClick={() => handleSync(contact)}
                          disabled={isSyncing || contact.syncedToSheets === true}
                          data-testid={`button-sync-${contact.id}`}
                        >
                          {isSyncing ? (
                            <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Syncing...</>
                          ) : contact.syncedToSheets ? (
                            <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-600" />Synced</>
                          ) : (
                            <><Upload className="h-3.5 w-3.5 mr-1.5" />Sync to Sheets</>
                          )}
                        </Button>
                      </div>

                      {/* Expanded details */}
                      {expandedId === contact.id && (
                        <div className="mt-3 pt-3 border-t border-border space-y-2 text-sm">
                          {contact.email && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-3.5 w-3.5 shrink-0" />
                              <a href={`mailto:${contact.email}`} className="text-primary hover:underline truncate">{contact.email}</a>
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-3.5 w-3.5 shrink-0" />
                              <a href={`tel:${contact.phone}`} className="hover:underline">{contact.phone}</a>
                            </div>
                          )}
                          {contact.website && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Globe className="h-3.5 w-3.5 shrink-0" />
                              <a href={contact.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{contact.website}</a>
                            </div>
                          )}
                          {contact.linkedin && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Linkedin className="h-3.5 w-3.5 shrink-0" />
                              <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{contact.linkedin}</a>
                            </div>
                          )}
                          {contact.address && (
                            <div className="flex items-start gap-2 text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                              <span>{contact.address}</span>
                            </div>
                          )}
                          {contact.companySummary && (
                            <div className="mt-2 pt-2 border-t border-border">
                              <p className="text-xs text-muted-foreground leading-relaxed">{contact.companySummary}</p>
                            </div>
                          )}
                        </div>
                      )}
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
                      <th className="px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Address</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Status</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {contacts.map((contact, idx) => {
                      const isSyncing = syncingIds.has(contact.id);
                      return (
                        <tr
                          key={contact.id}
                          className={`hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
                          data-testid={`row-contact-${contact.id}`}
                        >
                          <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap" data-testid={`text-name-${contact.id}`}>
                            {contact.name || "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {contact.title || "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {contact.company || "—"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {contact.email ? (
                              <a href={`mailto:${contact.email}`} className="text-primary hover:underline">{contact.email}</a>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {contact.phone ? (
                              <a href={`tel:${contact.phone}`} className="hover:underline">{contact.phone}</a>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">
                            {contact.address || "—"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {contact.syncedToSheets ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" data-testid={`status-synced-${contact.id}`}>
                                <CheckCircle2 className="h-3 w-3" /> Sent to Sheets
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" data-testid={`status-pending-${contact.id}`}>
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              {/* Sync button */}
                              <Button
                                size="sm"
                                variant={contact.syncedToSheets ? "outline" : "default"}
                                className="h-8 px-3 text-xs"
                                onClick={() => handleSync(contact)}
                                disabled={isSyncing || contact.syncedToSheets === true}
                                data-testid={`button-sync-${contact.id}`}
                              >
                                {isSyncing ? (
                                  <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Syncing</>
                                ) : contact.syncedToSheets ? (
                                  <><CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />Synced</>
                                ) : (
                                  <><Upload className="h-3 w-3 mr-1" />Sync to Sheets</>
                                )}
                              </Button>

                              {/* Edit button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(contact)}
                                data-testid={`button-edit-${contact.id}`}
                                title="Edit contact"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>

                              {/* Delete button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(contact.id)}
                                data-testid={`button-delete-${contact.id}`}
                                title="Delete contact"
                              >
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
        <EditModal
          contact={editingContact}
          onSave={handleEditSave}
          onClose={() => setEditingContact(null)}
        />
      )}
    </>
  );
}
