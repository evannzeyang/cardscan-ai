import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  CalendarDays, Plus, Trash2, Clock, MapPin, Users,
  ChevronDown, ChevronUp, Bell, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getEvents, saveEvent, deleteEvent,
  getCountdown, REMINDER_LABELS,
  type CalendarEvent, type ReminderFrequency,
} from "@/lib/events-storage";
import { getContacts } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";

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
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [location_, setLocation_] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [reminder, setReminder] = useState<ReminderFrequency>("1hour");

  const allContacts = getContacts();
  const reload = useCallback(() => setEvents(getEvents()), []);

  useEffect(() => { reload(); }, [reload]);

  function handleAdd() {
    if (!title.trim() || !dateTime) {
      toast({ title: "Please enter a title and date/time", variant: "destructive" });
      return;
    }
    saveEvent({ title: title.trim(), location: location_.trim(), dateTime, reminderFrequency: reminder });
    setTitle(""); setLocation_(""); setDateTime(""); setReminder("1hour");
    setShowForm(false);
    reload();
    toast({ title: "Event added!" });
  }

  function handleDelete(id: string) {
    deleteEvent(id);
    reload();
    toast({ title: "Event deleted" });
  }

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header bar */}
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

        {/* Add form */}
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
              <Button className="w-full font-semibold" onClick={handleAdd} data-testid="button-save-event">
                Save Event
              </Button>
            </div>
          </div>
        )}

        {/* Empty state */}
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

        {/* Event list */}
        <div className="space-y-3">
          {sortedEvents.map((event) => {
            const linked = allContacts.filter((c) => c.eventId === event.id);
            const isExpanded = expandedId === event.id;
            const dt = new Date(event.dateTime);

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
                        {linked.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {linked.length} contact{linked.length !== 1 ? "s" : ""}
                          </span>
                        )}
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
                        {event.reminderFrequency !== "none" && (
                          <div className="flex items-center gap-1.5">
                            <Bell className="h-3.5 w-3.5 shrink-0" />
                            {REMINDER_LABELS[event.reminderFrequency]}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {linked.length > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setExpandedId(isExpanded ? null : event.id)}
                          data-testid={`button-expand-event-${event.id}`}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      )}
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

                {/* Contacts met at this event */}
                {isExpanded && linked.length > 0 && (
                  <div className="border-t border-border px-4 py-3 bg-muted/30">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Contacts met at this event
                    </p>
                    <div className="space-y-2">
                      {linked.map((contact) => (
                        <button
                          key={contact.id}
                          className="w-full flex items-center gap-3 text-left hover:bg-muted/50 rounded-lg px-2 py-1.5 transition-colors"
                          onClick={() => setLocation(`/contacts/${contact.id}`)}
                          data-testid={`button-event-contact-${contact.id}`}
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary">
                              {(contact.name || "?").charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{contact.name || "—"}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {contact.title}{contact.title && contact.company ? " · " : ""}{contact.company}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
