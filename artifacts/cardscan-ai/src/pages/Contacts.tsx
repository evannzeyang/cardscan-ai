import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Scan, Download, Trash2, Loader2, Pencil, X, Save, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getContacts, deleteContact, updateContact, getEvents,
  type ApiContact, type ApiEvent,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

function exportContactsCSV(contacts: ApiContact[]): void {
  const headers = [
    "Name", "Title", "Company", "Email", "Phone",
    "Website", "LinkedIn", "Address", "Company Summary", "Scanned At",
  ];
  const rows = contacts.map((c) => [
    c.name ?? "", c.title ?? "",
    c.company?.businessName ?? "", c.email ?? "", c.phone ?? "",
    c.website ?? "", c.linkedin ?? "", c.address ?? "", c.companySummary ?? "",
    c.scannedAt ? new Date(c.scannedAt).toLocaleString() : "",
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cardscan_contacts_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface EditModalProps {
  contact: ApiContact;
  events: ApiEvent[];
  onSave: (updates: {
    name?: string; title?: string; email?: string; phone?: string;
    address?: string; companySummary?: string; eventId?: string;
  }) => void;
  onClose: () => void;
}

function EditModal({ contact, events, onSave, onClose }: EditModalProps) {
  const [name, setName] = useState(contact.name ?? "");
  const [title, setTitle] = useState(contact.title ?? "");
  const [email, setEmail] = useState(contact.email ?? "");
  const [phone, setPhone] = useState(contact.phone ?? "");
  const [address, setAddress] = useState(contact.address ?? "");
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
            onClick={() => onSave({ name, title, email, phone, address, eventId: eventId || undefined })}
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
  const [contacts, setContacts] = useState<ApiContact[]>([]);
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingContact, setEditingContact] = useState<ApiContact | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const reload = useCallback(async () => {
    try {
      const [c, e] = await Promise.all([getContacts(), getEvents()]);
      setContacts(c);
      setEvents(e);
    } catch {
      toast({ title: "Failed to load contacts", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { reload(); }, [reload]);

  async function handleDelete(id: string) {
    try {
      await deleteContact(id);
      await reload();
      toast({ title: "Contact deleted" });
    } catch {
      toast({ title: "Failed to delete contact", variant: "destructive" });
    }
  }

  function handleExport() {
    if (contacts.length === 0) {
      toast({ title: "No contacts to export", variant: "destructive" });
      return;
    }
    exportContactsCSV(contacts);
    toast({ title: "CSV exported successfully" });
  }

  async function handleEditSave(updates: Parameters<EditModalProps["onSave"]>[0]) {
    if (!editingContact) return;
    try {
      await updateContact(editingContact.id, updates);
      await reload();
      setEditingContact(null);
      toast({ title: "Contact updated" });
    } catch {
      toast({ title: "Failed to update contact", variant: "destructive" });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

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
              <span>{contacts.length} contact{contacts.length !== 1 ? "s" : ""}</span>
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
              <div className="block md:hidden space-y-3">
                {contacts.map((contact) => (
                  <div key={contact.id} className="bg-card border border-card-border rounded-xl p-4 shadow-sm" data-testid={`card-contact-${contact.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground truncate">{contact.name || "—"}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {contact.title}{contact.title && contact.company?.businessName ? " · " : ""}{contact.company?.businessName}
                        </p>
                        {contact.email && <p className="text-xs text-muted-foreground truncate mt-1">{contact.email}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLocation(`/contacts/${contact.id}`)} title="View details">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingContact(contact)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(contact.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto rounded-xl border border-border shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-left border-b border-border">
                      <th className="px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Name</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Title</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Company</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Email</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Phone</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {contacts.map((contact, idx) => (
                      <tr key={contact.id} className={`hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`} data-testid={`row-contact-${contact.id}`}>
                        <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{contact.name || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{contact.title || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{contact.company?.businessName || "—"}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {contact.email ? <a href={`mailto:${contact.email}`} className="text-primary hover:underline">{contact.email}</a> : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {contact.phone ? <a href={`tel:${contact.phone}`} className="hover:underline">{contact.phone}</a> : "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
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
                    ))}
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
          events={events}
          onSave={handleEditSave}
          onClose={() => setEditingContact(null)}
        />
      )}
    </>
  );
}
