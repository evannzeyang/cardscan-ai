import { apiUrl } from "@workspace/api-client-react";

export interface ApiNote {
  id: string;
  contactId: string;
  userId: string;
  type: "written" | "voice";
  text: string;
  aiSummary: string | null;
  todoItems: string[] | null;
  createdAt: string;
}

export interface ApiCompany {
  id: string;
  businessName: string;
  businessAddress: string | null;
  city: string | null;
  province: string | null;
  fullCivicAddress: string | null;
  latitude: string | null;
  longitude: string | null;
  website: string | null;
  phone: string | null;
}

export interface ApiContact {
  id: string;
  userId: string;
  companyId: string | null;
  name: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  linkedin: string | null;
  address: string | null;
  companySummary: string | null;
  syncedToSheets: boolean | null;
  eventId: string | null;
  scannedAt: string | null;
  createdAt: string | null;
  company: ApiCompany | null;
}

export interface ApiEvent {
  id: string;
  userId: string;
  title: string;
  location: string | null;
  dateTime: string;
  reminderFrequency: string | null;
  createdAt: string | null;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function getContacts(): Promise<ApiContact[]> {
  const data = await apiFetch<{ contacts: ApiContact[] }>("/api/user/contacts");
  return data.contacts;
}

export async function getContact(id: string): Promise<ApiContact> {
  const data = await apiFetch<{ contact: ApiContact }>(`/api/user/contacts/${id}`);
  return data.contact;
}

export async function createContact(body: {
  companyId?: string;
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  address?: string;
  companySummary?: string;
  eventId?: string;
}): Promise<ApiContact> {
  const data = await apiFetch<{ contact: ApiContact }>("/api/user/contacts", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data.contact;
}

export async function updateContact(
  id: string,
  body: Partial<{
    name: string;
    title: string;
    email: string;
    phone: string;
    website: string;
    linkedin: string;
    address: string;
    companySummary: string;
    eventId: string;
    companyId: string;
    syncedToSheets: boolean;
  }>,
): Promise<ApiContact> {
  const data = await apiFetch<{ contact: ApiContact }>(`/api/user/contacts/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return data.contact;
}

export async function deleteContact(id: string): Promise<void> {
  await apiFetch(`/api/user/contacts/${id}`, { method: "DELETE" });
}

export async function searchCompanies(q: string): Promise<ApiCompany[]> {
  const data = await apiFetch<{ companies: ApiCompany[] }>(
    `/api/companies/search?q=${encodeURIComponent(q)}`,
  );
  return data.companies;
}

export async function createCompany(body: {
  businessName: string;
  businessAddress?: string;
  city?: string;
  province?: string;
  fullCivicAddress?: string;
  latitude?: string;
  longitude?: string;
  website?: string;
  phone?: string;
}): Promise<ApiCompany> {
  const data = await apiFetch<{ company: ApiCompany }>("/api/companies", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data.company;
}

export async function getEvents(): Promise<ApiEvent[]> {
  const data = await apiFetch<{ events: ApiEvent[] }>("/api/user/events");
  return data.events;
}

export async function createEvent(body: {
  title: string;
  location?: string;
  dateTime: string;
  reminderFrequency?: string;
}): Promise<ApiEvent> {
  const data = await apiFetch<{ event: ApiEvent }>("/api/user/events", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data.event;
}

export async function updateEvent(
  id: string,
  body: Partial<{
    title: string;
    location: string;
    dateTime: string;
    reminderFrequency: string;
  }>,
): Promise<ApiEvent> {
  const data = await apiFetch<{ event: ApiEvent }>(`/api/user/events/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return data.event;
}

export async function deleteEvent(id: string): Promise<void> {
  await apiFetch(`/api/user/events/${id}`, { method: "DELETE" });
}

export async function getNotes(contactId: string): Promise<ApiNote[]> {
  const data = await apiFetch<{ notes: ApiNote[] }>(
    `/api/user/contacts/${contactId}/notes`,
  );
  return data.notes;
}

export async function createNote(
  contactId: string,
  body: { type: "written" | "voice"; text: string },
): Promise<ApiNote> {
  const data = await apiFetch<{ note: ApiNote }>(
    `/api/user/contacts/${contactId}/notes`,
    { method: "POST", body: JSON.stringify(body) },
  );
  return data.note;
}

export async function updateNote(
  contactId: string,
  noteId: string,
  body: { text?: string; aiSummary?: string; todoItems?: string[] },
): Promise<ApiNote> {
  const data = await apiFetch<{ note: ApiNote }>(
    `/api/user/contacts/${contactId}/notes/${noteId}`,
    { method: "PUT", body: JSON.stringify(body) },
  );
  return data.note;
}

export async function deleteNote(contactId: string, noteId: string): Promise<void> {
  await apiFetch(`/api/user/contacts/${contactId}/notes/${noteId}`, {
    method: "DELETE",
  });
}

export interface ApiProfile {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  jobTitle: string | null;
  companyName: string | null;
  industry: string | null;
  businessEmail: string | null;
  businessPhone: string | null;
  linkedinUrl: string | null;
}

export async function getUserProfile(): Promise<ApiProfile> {
  const data = await apiFetch<{ profile: ApiProfile }>("/api/user/profile");
  return data.profile;
}

export async function updateUserProfile(
  body: Partial<Omit<ApiProfile, "id" | "email">>,
): Promise<ApiProfile> {
  const data = await apiFetch<{ profile: ApiProfile }>("/api/user/profile", {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return data.profile;
}

export interface PublicUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  profileImageUrl: string | null;
  jobTitle: string | null;
  companyName: string | null;
}

export interface ConnectedUserProfile extends PublicUser {
  industry: string | null;
  businessEmail: string | null;
  businessPhone: string | null;
  linkedinUrl: string | null;
}

export interface ConnectionRow {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
  createdAt: string;
  user: PublicUser | null;
}

export interface ConnectionsData {
  incoming: ConnectionRow[];
  outgoing: ConnectionRow[];
  accepted: ConnectionRow[];
}

export async function searchUsers(q: string): Promise<PublicUser[]> {
  const data = await apiFetch<{ users: PublicUser[] }>(
    `/api/users/search?q=${encodeURIComponent(q)}`,
  );
  return data.users;
}

export async function getConnections(): Promise<ConnectionsData> {
  return apiFetch<ConnectionsData>("/api/connections");
}

export async function sendConnectionRequest(receiverId: string): Promise<ConnectionRow> {
  const data = await apiFetch<{ connection: ConnectionRow }>("/api/connections", {
    method: "POST",
    body: JSON.stringify({ receiverId }),
  });
  return data.connection;
}

export async function acceptConnection(id: string): Promise<ConnectionRow> {
  const data = await apiFetch<{ connection: ConnectionRow }>(`/api/connections/${id}/accept`, {
    method: "PUT",
  });
  return data.connection;
}

export async function declineConnection(id: string): Promise<void> {
  await apiFetch(`/api/connections/${id}`, { method: "DELETE" });
}

export async function getConnectionUserProfile(userId: string): Promise<ConnectedUserProfile> {
  const data = await apiFetch<{ profile: ConnectedUserProfile }>(
    `/api/connections/users/${userId}/profile`,
  );
  return data.profile;
}

export async function getGeminiKeyStatus(): Promise<{ hasKey: boolean }> {
  return apiFetch<{ hasKey: boolean }>("/api/user/gemini-key/status");
}

export async function setGeminiKey(key: string): Promise<void> {
  await apiFetch("/api/user/gemini-key", {
    method: "PUT",
    body: JSON.stringify({ key }),
  });
}

export async function deleteGeminiKey(): Promise<void> {
  await apiFetch("/api/user/gemini-key", { method: "DELETE" });
}

export interface ScanCardResult {
  card: {
    name: string; title: string; company: string; email: string;
    phone: string; website: string; linkedin: string; address: string;
    companySummary: string;
  };
  geo: {
    businessName: string; businessAddress: string; city: string;
    province: string; fullCivicAddress: string; latitude: string; longitude: string;
  };
}

export async function scanCard(imageBase64: string, mimeType: string): Promise<ScanCardResult> {
  return apiFetch<ScanCardResult>("/api/scan/card", {
    method: "POST",
    body: JSON.stringify({ imageBase64, mimeType }),
  });
}

export async function analyzeNoteServer(
  contactId: string,
  noteId: string,
): Promise<{ summary: string; todoItems: string[] }> {
  return apiFetch<{ summary: string; todoItems: string[] }>(
    `/api/user/contacts/${contactId}/notes/${noteId}/analyze`,
    { method: "POST" },
  );
}
