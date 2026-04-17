import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Scan,
  Download,
  Trash2,
  User,
  Building2,
  Mail,
  Phone,
  Globe,
  Linkedin,
  MapPin,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getContacts, deleteContact, exportContactsCSV, type Contact } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    setContacts(getContacts());
  }, []);

  function handleDelete(id: string) {
    deleteContact(id);
    setContacts(getContacts());
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Action bar */}
        <div className="flex items-center gap-3 mb-6">
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
          <span className="ml-auto text-sm text-muted-foreground">
            {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Empty state */}
        {contacts.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-24 text-center"
            data-testid="empty-state"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Scan className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No contacts yet
            </h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs">
              Scan your first business card to extract and save contact information automatically.
            </p>
            <Button onClick={() => setLocation("/scan")} data-testid="button-empty-scan">
              <Scan className="h-4 w-4 mr-2" />
              Scan Your First Card
            </Button>
          </div>
        )}

        {/* Desktop table view */}
        {contacts.length > 0 && (
          <>
            {/* Mobile card list */}
            <div className="block md:hidden space-y-3">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="bg-card border border-card-border rounded-xl p-4 shadow-sm"
                  data-testid={`card-contact-${contact.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate" data-testid={`text-name-${contact.id}`}>
                        {contact.name || "—"}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {contact.title}{contact.title && contact.company ? " · " : ""}{contact.company}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
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

                  {/* Expanded details */}
                  {expandedId === contact.id && (
                    <div className="mt-3 pt-3 border-t border-border space-y-2 text-sm">
                      {contact.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <a href={`mailto:${contact.email}`} className="text-primary hover:underline truncate">
                            {contact.email}
                          </a>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <a href={`tel:${contact.phone}`} className="hover:underline">
                            {contact.phone}
                          </a>
                        </div>
                      )}
                      {contact.website && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Globe className="h-3.5 w-3.5 shrink-0" />
                          <a href={contact.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                            {contact.website}
                          </a>
                        </div>
                      )}
                      {contact.linkedin && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Linkedin className="h-3.5 w-3.5 shrink-0" />
                          <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                            {contact.linkedin}
                          </a>
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
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {contact.companySummary}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-border shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-left border-b border-border">
                    <th className="px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">
                      <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />Name</span>
                    </th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Title</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">
                      <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />Company</span>
                    </th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">
                      <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />Email</span>
                    </th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">
                      <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />Phone</span>
                    </th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">
                      <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />Website</span>
                    </th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">
                      <span className="flex items-center gap-1.5"><Linkedin className="h-3.5 w-3.5" />LinkedIn</span>
                    </th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Summary</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {contacts.map((contact, idx) => (
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
                          <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                            {contact.email}
                          </a>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {contact.phone ? (
                          <a href={`tel:${contact.phone}`} className="hover:underline">
                            {contact.phone}
                          </a>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap max-w-[160px] truncate">
                        {contact.website ? (
                          <a href={contact.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {contact.website}
                          </a>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap max-w-[160px] truncate">
                        {contact.linkedin ? (
                          <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {contact.linkedin}
                          </a>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 max-w-[240px]">
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {contact.companySummary || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(contact.id)}
                          data-testid={`button-delete-${contact.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
  );
}
