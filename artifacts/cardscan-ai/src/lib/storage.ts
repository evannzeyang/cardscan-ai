export interface GeoData {
  businessName: string;
  businessAddress: string;
  city: string;
  province: string;
  fullCivicAddress: string;
  latitude: string;
  longitude: string;
}

export interface Note {
  id: string;
  type: "written" | "voice";
  text: string;
  aiSummary?: string;
  todoItems?: string[];
  createdAt: string;
}

export interface Contact {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  linkedin: string;
  address: string;
  companySummary: string;
  scannedAt: string;
  syncedToSheets?: boolean;
  geoData?: GeoData;
  eventId?: string;
  notes?: Note[];
}

const CONTACTS_KEY = "cardscan_contacts";
const API_KEY_KEY = "cardscan_gemini_api_key";

export function getContacts(): Contact[] {
  try {
    const raw = localStorage.getItem(CONTACTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Contact[];
  } catch {
    return [];
  }
}

export function getContact(id: string): Contact | undefined {
  return getContacts().find((c) => c.id === id);
}

export function saveContact(
  contact: Omit<Contact, "id" | "scannedAt" | "syncedToSheets">
): Contact {
  const contacts = getContacts();
  const newContact: Contact = {
    ...contact,
    id: crypto.randomUUID(),
    scannedAt: new Date().toISOString(),
    syncedToSheets: false,
    notes: [],
  };
  contacts.unshift(newContact);
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  return newContact;
}

export function updateContact(
  id: string,
  updates: Partial<Omit<Contact, "id" | "scannedAt">>
): void {
  const contacts = getContacts().map((c) =>
    c.id === id ? { ...c, ...updates } : c
  );
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

export function markAsSynced(id: string): void {
  updateContact(id, { syncedToSheets: true });
}

export function deleteContact(id: string): void {
  const contacts = getContacts().filter((c) => c.id !== id);
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

export function addNoteToContact(
  contactId: string,
  note: Omit<Note, "id" | "createdAt">
): Note {
  const contacts = getContacts();
  const newNote: Note = {
    ...note,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const updated = contacts.map((c) => {
    if (c.id !== contactId) return c;
    return { ...c, notes: [...(c.notes ?? []), newNote] };
  });
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(updated));
  return newNote;
}

export function deleteNoteFromContact(contactId: string, noteId: string): void {
  const contacts = getContacts().map((c) => {
    if (c.id !== contactId) return c;
    return { ...c, notes: (c.notes ?? []).filter((n) => n.id !== noteId) };
  });
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

export function updateNoteOnContact(
  contactId: string,
  noteId: string,
  updates: Partial<Omit<Note, "id" | "createdAt">>
): void {
  const contacts = getContacts().map((c) => {
    if (c.id !== contactId) return c;
    const notes = (c.notes ?? []).map((n) =>
      n.id === noteId ? { ...n, ...updates } : n
    );
    return { ...c, notes };
  });
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

export function getApiKey(): string {
  return localStorage.getItem(API_KEY_KEY) ?? "";
}

export function saveApiKey(key: string): void {
  localStorage.setItem(API_KEY_KEY, key);
}

export function exportContactsCSV(contacts: Contact[]): void {
  const headers = [
    "Name", "Title", "Company", "Email", "Phone",
    "Website", "LinkedIn", "Address", "Company Summary",
    "Scanned At", "Synced to Sheets", "Event ID",
  ];

  const rows = contacts.map((c) => [
    c.name, c.title, c.company, c.email, c.phone,
    c.website, c.linkedin, c.address, c.companySummary,
    new Date(c.scannedAt).toLocaleString(),
    c.syncedToSheets ? "Yes" : "No",
    c.eventId ?? "",
  ]);

  const csvContent = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${(cell ?? "").replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cardscan_contacts_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
