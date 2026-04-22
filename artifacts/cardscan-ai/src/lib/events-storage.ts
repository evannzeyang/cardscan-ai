export type ReminderFrequency = "none" | "15min" | "1hour" | "1day" | "1week";

export const REMINDER_LABELS: Record<ReminderFrequency, string> = {
  none: "None",
  "15min": "15 minutes before",
  "1hour": "1 hour before",
  "1day": "1 day before",
  "1week": "1 week before",
};

export const REMINDER_MS: Record<ReminderFrequency, number> = {
  none: 0,
  "15min": 15 * 60 * 1000,
  "1hour": 60 * 60 * 1000,
  "1day": 24 * 60 * 60 * 1000,
  "1week": 7 * 24 * 60 * 60 * 1000,
};

export interface CalendarEvent {
  id: string;
  title: string;
  location?: string;
  dateTime: string;
  reminderFrequency: ReminderFrequency;
  createdAt: string;
}

const EVENTS_KEY = "cardscan_events";
const NOTIFIED_KEY = "cardscan_notified_ids";

export function getEvents(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CalendarEvent[];
  } catch {
    return [];
  }
}

export function saveEvent(
  event: Omit<CalendarEvent, "id" | "createdAt">
): CalendarEvent {
  const events = getEvents();
  const newEvent: CalendarEvent = {
    ...event,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  events.unshift(newEvent);
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  return newEvent;
}

export function updateEvent(
  id: string,
  updates: Partial<Omit<CalendarEvent, "id" | "createdAt">>
): void {
  const events = getEvents().map((e) => (e.id === id ? { ...e, ...updates } : e));
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

export function deleteEvent(id: string): void {
  const events = getEvents().filter((e) => e.id !== id);
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

export function getNotifiedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function markNotified(id: string): void {
  const ids = getNotifiedIds();
  ids.add(id);
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...ids]));
}

export function getCountdown(dateTime: string): { label: string; urgent: boolean; passed: boolean } {
  const diff = new Date(dateTime).getTime() - Date.now();
  if (diff <= 0) return { label: "Event has passed", urgent: false, passed: true };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const urgent = diff < 24 * 60 * 60 * 1000;
  if (days > 0) return { label: `${days}d ${hours}h remaining`, urgent, passed: false };
  if (hours > 0) return { label: `${hours}h ${minutes}m remaining`, urgent, passed: false };
  return { label: `${minutes}m remaining`, urgent: true, passed: false };
}
