import { useState, useEffect, useCallback } from "react";
import {
  CalendarDays, Plus, Trash2, Clock, MapPin,
  ChevronDown, ChevronUp, Bell, X, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getEvents, createEvent, deleteEvent, type ApiEvent } from "@/lib/api";
import { getCountdown, REMINDER_LABELS } from "@/lib/events-storage";
import { useToast } from "@/hooks/use-toast";

type ReminderFrequency = "none" | "15min" | "1hour" | "1day" | "1week";
const REMINDER_OPTIONS: ReminderFrequency[] = ["none", "15min", "1hour", "1day", "1week"];

function CountdownBadge({ dateTime }: { dateTime: string }) {
  const [label, setLabel] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    function tick() {
      const cd = getCountdown(dateTime);
      setLabel(cd.label);
      setUrgent(cd.urgent);
      setPassed(cd.passed);
    }
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [dateTime]);

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
        passed
          ? "bg-muted text-muted-foreground"
          : urgent
          ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
          : "bg-primary/10 text-primary"
      }`}
    >
      <Clock className="h-3 w-3" />
      {label}
    </span>
  );
}

export default function Events() {
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [location_, setLocation_] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [reminder, setReminder] = useState<ReminderFrequency>("1hour");

  const reload = useCallback(async () => {
    try {
      const data = await getEvents();
      setEvents(data);
    } catch {
      toast({ title: "Failed to load events", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { reload(); }, [reload]);

  async function handleAdd() {
    if (!title.trim() || !dateTime) {
      toast({ title: "Please enter a title and date/time", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await createEvent({
        title: title.trim(),
        location: location_.trim() || undefined,
        dateTime: new Date(dateTime).toISOString(),
        reminderFrequency: reminder,
      });
      setTitle(""); setLocation_(""); setDateTime(""); setReminder("1hour");
      setShowForm(false);
      await reload();
      toast({ title: "Event added!" });
    } catch (err) {
      toast({ title: "Failed to save event", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteEvent(id);
      await reload();
      toast({ title: "Event deleted" });
    } catch {
      toast({ title: "Failed to delete event", variant: "destructive" });
    }
  }

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Events
          </h1>
          <Button
            className="ml-auto"
            onClick={() => setShowForm((v) => !v)}
            data-testid="button-add-event"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Event
          </Button>
        </div>

        {showForm && (
          <div className="bg-card border border-card-border rounded-2xl p-5 mb-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">New Event</h2>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="event-title" className="text-sm font-medium mb-1.5 block">Event Title *</Label>
                <Input id="event-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. BCoC Monthly Networking" data-testid="input-event-title" />
              </div>
              <div>
                <Label htmlFor="event-location" className="text-sm font-medium mb-1.5 block">Location (optional)</Label>
                <Input id="event-location" value={location_} onChange={(e) => setLocation_(e.target.value)} placeholder="e.g. Burlington Convention Centre" />
              </div>
              <div>
                <Label htmlFor="event-datetime" className="text-sm font-medium mb-1.5 block">Date & Time *</Label>
                <Input id="event-datetime" type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} data-testid="input-event-datetime" />
              </div>
              <div>
                <Label htmlFor="event-reminder" className="text-sm font-medium mb-1.5 block">
                  <Bell className="h-3.5 w-3.5 inline mr-1" />
                  Reminder
                </Label>
                <select
                  id="event-reminder"
                  value={reminder}
                  onChange={(e) => setReminder(e.target.value as ReminderFrequency)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {REMINDER_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{REMINDER_LABELS[opt]}</option>
                  ))}
                </select>
              </div>
              <Button className="w-full font-semibold" onClick={handleAdd} disabled={saving} data-testid="button-save-event">
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save Event"}
              </Button>
            </div>
          </div>
        )}

        {sortedEvents.length === 0 && !showForm && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <CalendarDays className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No events yet</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs">
              Add networking events to track who you met and when.
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Event
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {sortedEvents.map((event) => {
            const isExpanded = expandedId === event.id;
            const dt = new Date(event.dateTime);
            const freq = event.reminderFrequency as ReminderFrequency | null;

            return (
              <div
                key={event.id}
                className="bg-card border border-card-border rounded-2xl shadow-sm overflow-hidden"
                data-testid={`card-event-${event.id}`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground text-base mb-1">{event.title}</h3>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <CountdownBadge dateTime={event.dateTime} />
                      </div>
                      <div className="text-sm text-muted-foreground space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          {dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                          {" at "}
                          {dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            {event.location}
                          </div>
                        )}
                        {freq && freq !== "none" && REMINDER_LABELS[freq] && (
                          <div className="flex items-center gap-1.5">
                            <Bell className="h-3.5 w-3.5 shrink-0" />
                            {REMINDER_LABELS[freq]}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(event.id)}
                        data-testid={`button-delete-event-${event.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
