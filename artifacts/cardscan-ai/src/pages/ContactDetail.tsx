import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Mail, Phone, Globe, Linkedin, MapPin,
  Mic, MicOff, FileText, Trash2, Sparkles, Loader2,
  CheckSquare, Square, ChevronDown, ChevronUp, PenLine,
  CalendarDays, Upload, CheckCircle2, Pencil, Save, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  getContact, addNoteToContact, deleteNoteFromContact,
  updateNoteOnContact, updateContact, markAsSynced,
  type Contact, type Note,
} from "@/lib/storage";
import { getEvents, type CalendarEvent } from "@/lib/events-storage";
import { analyzeNote } from "@/lib/gemini";
import { getApiKey } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";

type RecordState = "idle" | "recording" | "processing";

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionObj;
    webkitSpeechRecognition: new () => SpeechRecognitionObj;
  }
}
interface SpeechRecognitionObj extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEvent_) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: Event) => void) | null;
}
interface SpeechRecognitionEvent_ extends Event {
  results: SpeechRecognitionResultList;
}

function buildGeoFromContact(contact: Contact) {
  if (contact.geoData) return contact.geoData;
  return {
    businessName: contact.company || "N/A",
    businessAddress: contact.address || "N/A",
    city: "N/A", province: "N/A",
    fullCivicAddress: contact.address || "N/A",
    latitude: "N/A", longitude: "N/A",
  };
}

async function callSheetsAppend(geo: ReturnType<typeof buildGeoFromContact>) {
  const response = await fetch("/api/sheets/append", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(geo),
  });
  if (!response.ok) {
    const d = await response.json().catch(() => ({}));
    throw new Error((d as { message?: string }).message ?? `HTTP ${response.status}`);
  }
}

interface NoteCardProps {
  note: Note;
  contactId: string;
  onDeleted: () => void;
  onUpdated: () => void;
}

function NoteCard({ note, contactId, onDeleted, onUpdated }: NoteCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const { toast } = useToast();

  async function handleAnalyze() {
    const apiKey = getApiKey();
    if (!apiKey) {
      toast({ title: "No API key", description: "Add your Gemini API key in Settings.", variant: "destructive" });
      return;
    }
    setAnalyzing(true);
    try {
      const result = await analyzeNote(note.text, apiKey);
      updateNoteOnContact(contactId, note.id, {
        aiSummary: result.summary,
        todoItems: result.todoItems,
      });
      onUpdated();
      toast({ title: "AI analysis complete!" });
    } catch (err) {
      toast({ title: "Analysis failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  }

  const dt = new Date(note.createdAt);

  return (
    <div className="bg-muted/30 border border-border rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {note.type === "voice" ? (
            <Mic className="h-4 w-4 text-primary shrink-0" />
          ) : (
            <PenLine className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className="text-xs text-muted-foreground">
            {note.type === "voice" ? "Voice Note" : "Written Note"} · {dt.toLocaleDateString()} {dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!note.aiSummary && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={handleAnalyze}
              disabled={analyzing}
              data-testid={`button-analyze-note-${note.id}`}
            >
              {analyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-primary" />}
              Analyze
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => { deleteNoteFromContact(contactId, note.id); onDeleted(); }}
            data-testid={`button-delete-note-${note.id}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{note.text}</p>

      {note.aiSummary && (
        <div className="mt-3 space-y-2">
          <button
            className="flex items-center gap-1.5 text-xs font-semibold text-primary"
            onClick={() => setExpanded((v) => !v)}
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Analysis
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {expanded && (
            <div className="space-y-3 pt-2 border-t border-border">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Summary</p>
                <p className="text-sm text-foreground leading-relaxed">{note.aiSummary}</p>
              </div>
              {note.todoItems && note.todoItems.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Action Items</p>
                  <ul className="space-y-1.5">
                    {note.todoItems.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(!note.todoItems || note.todoItems.length === 0) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Square className="h-4 w-4 shrink-0" />
                  No action items found
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ContactDetailProps {
  id: string;
}

export default function ContactDetail({ id }: ContactDetailProps) {
  const [, setLocation] = useLocation();
  const [contact, setContact] = useState<Contact | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const { toast } = useToast();

  const [writtenNote, setWrittenNote] = useState("");
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [syncingSheet, setSyncingSheet] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", title: "", company: "", email: "", phone: "", address: "" });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognitionObj | null>(null);
  const transcriptRef = useRef("");

  const reload = useCallback(() => {
    const c = getContact(id);
    setContact(c ?? null);
    setEvents(getEvents());
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    if (contact) {
      setEditForm({
        name: contact.name, title: contact.title,
        company: contact.company, email: contact.email,
        phone: contact.phone, address: contact.address,
      });
    }
  }, [contact]);

  if (!contact) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Contact not found.</p>
          <Button onClick={() => setLocation("/contacts")}>Back to Contacts</Button>
        </div>
      </div>
    );
  }

  const linkedEvent = contact.eventId ? events.find((e) => e.id === contact.eventId) : null;

  function handleSaveEdit() {
    updateContact(id, editForm);
    reload();
    setEditMode(false);
    toast({ title: "Contact updated" });
  }

  function handleSaveWrittenNote() {
    if (!writtenNote.trim()) return;
    addNoteToContact(id, { type: "written", text: writtenNote.trim() });
    setWrittenNote("");
    reload();
    toast({ title: "Note saved" });
  }

  async function handleSyncSheet() {
    setSyncingSheet(true);
    try {
      await callSheetsAppend(buildGeoFromContact(contact));
      markAsSynced(id);
      reload();
      toast({ title: "Synced to Sheets!" });
    } catch (err) {
      toast({ title: "Sync failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setSyncingSheet(false);
    }
  }

  async function handleStartRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      transcriptRef.current = "";
      setLiveTranscript("");

      const SRClass = window.SpeechRecognition ?? window.webkitSpeechRecognition;
      if (SRClass) {
        const recognition = new SRClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.onresult = (e) => {
          let final = "";
          let interim = "";
          for (let i = 0; i < e.results.length; i++) {
            const t = e.results[i][0].transcript;
            if (e.results[i].isFinal) final += t + " ";
            else interim += t;
          }
          transcriptRef.current = final;
          setLiveTranscript(final + interim);
        };
        recognition.onerror = () => {};
        recognition.onend = () => {};
        recognition.start();
        recognitionRef.current = recognition;
      }

      const recorder = new MediaRecorder(stream);
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecordState("recording");
    } catch {
      toast({ title: "Microphone access denied", variant: "destructive" });
    }
  }

  function handleStopRecording() {
    setRecordState("processing");

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current = null;
    }

    setTimeout(() => {
      const text = transcriptRef.current.trim() || liveTranscript.trim();
      if (text) {
        addNoteToContact(id, { type: "voice", text });
        reload();
        toast({ title: "Voice note saved" });
      } else {
        toast({ title: "No speech detected", description: "Please type your note instead.", variant: "destructive" });
      }
      setLiveTranscript("");
      transcriptRef.current = "";
      setRecordState("idle");
    }, 600);
  }

  const notes = contact.notes ?? [];

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Back + actions */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setLocation("/contacts")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">{contact.name || "Unnamed Contact"}</h1>
            <p className="text-sm text-muted-foreground truncate">{contact.title}{contact.title && contact.company ? " · " : ""}{contact.company}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setEditMode(true)} data-testid="button-edit-contact">
            <Pencil className="h-4 w-4" />
          </Button>
        </div>

        {/* Edit modal */}
        {editMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditMode(false)} />
            <div className="relative bg-card border border-card-border rounded-2xl shadow-xl w-full max-w-md p-6 z-10 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-foreground">Edit Contact</h2>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditMode(false)}><X className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-3 mb-5">
                {([
                  { label: "Full Name", key: "name" as const },
                  { label: "Job Title", key: "title" as const },
                  { label: "Company", key: "company" as const },
                  { label: "Email", key: "email" as const },
                  { label: "Phone", key: "phone" as const },
                  { label: "Address", key: "address" as const },
                ] as const).map(({ label, key }) => (
                  <div key={key}>
                    <Label className="text-sm font-medium mb-1.5 block">{label}</Label>
                    <Input value={editForm[key]} onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setEditMode(false)}>Cancel</Button>
                <Button className="flex-1 font-semibold" onClick={handleSaveEdit} data-testid="button-save-edit">
                  <Save className="h-4 w-4 mr-2" />Save
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Linked event */}
        {linkedEvent && (
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5 mb-4">
            <CalendarDays className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary truncate">{linkedEvent.title}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(linkedEvent.dateTime).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>
        )}

        {/* Contact info */}
        <div className="bg-card border border-card-border rounded-2xl p-4 mb-4 shadow-sm space-y-2">
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-3 text-sm hover:bg-muted/50 rounded-lg px-2 py-1.5 -mx-2 transition-colors">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-primary hover:underline truncate">{contact.email}</span>
            </a>
          )}
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="flex items-center gap-3 text-sm hover:bg-muted/50 rounded-lg px-2 py-1.5 -mx-2 transition-colors">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{contact.phone}</span>
            </a>
          )}
          {contact.website && (
            <a href={contact.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm hover:bg-muted/50 rounded-lg px-2 py-1.5 -mx-2 transition-colors">
              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-primary hover:underline truncate">{contact.website}</span>
            </a>
          )}
          {contact.linkedin && (
            <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm hover:bg-muted/50 rounded-lg px-2 py-1.5 -mx-2 transition-colors">
              <Linkedin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-primary hover:underline truncate">{contact.linkedin}</span>
            </a>
          )}
          {contact.address && (
            <div className="flex items-start gap-3 text-sm px-2 py-1.5">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{contact.address}</span>
            </div>
          )}
          {contact.companySummary && contact.companySummary !== "N/A" && (
            <div className="pt-2 mt-1 border-t border-border">
              <p className="text-xs text-muted-foreground leading-relaxed px-2">{contact.companySummary}</p>
            </div>
          )}
        </div>

        {/* Sync to Sheets */}
        <Button
          variant={contact.syncedToSheets ? "outline" : "default"}
          className="w-full mb-6"
          onClick={handleSyncSheet}
          disabled={syncingSheet || contact.syncedToSheets === true}
          data-testid="button-sync-detail"
        >
          {syncingSheet ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Syncing...</>
          ) : contact.syncedToSheets ? (
            <><CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />Synced to Sheets</>
          ) : (
            <><Upload className="h-4 w-4 mr-2" />Sync to BCoC Sheets</>
          )}
        </Button>

        {/* Notes section */}
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-primary" />
            Notes & Follow-ups
          </h2>

          {/* Existing notes */}
          {notes.length > 0 && (
            <div className="space-y-3 mb-4">
              {notes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  contactId={id}
                  onDeleted={reload}
                  onUpdated={reload}
                />
              ))}
            </div>
          )}

          {/* Voice note button — large for easy use */}
          <div className="mb-4">
            {recordState === "idle" && (
              <button
                onClick={handleStartRecording}
                className="w-full h-20 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 transition-all flex flex-col items-center justify-center gap-1.5 active:scale-[0.98]"
                data-testid="button-start-voice-note"
              >
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-md">
                  <Mic className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-semibold text-primary">Record Voice Note</span>
              </button>
            )}

            {recordState === "recording" && (
              <div className="rounded-2xl border-2 border-red-400 bg-red-50 dark:bg-red-950/20 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center animate-pulse shadow-md">
                    <MicOff className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">Recording...</p>
                    <p className="text-xs text-muted-foreground">Speak clearly</p>
                  </div>
                  <button
                    onClick={handleStopRecording}
                    className="ml-auto h-10 px-4 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors active:scale-[0.98]"
                    data-testid="button-stop-recording"
                  >
                    Stop
                  </button>
                </div>
                {liveTranscript && (
                  <p className="text-sm text-foreground leading-relaxed bg-white dark:bg-muted/30 rounded-xl p-3 border border-border min-h-[48px]">
                    {liveTranscript}
                  </p>
                )}
              </div>
            )}

            {recordState === "processing" && (
              <div className="w-full h-20 rounded-2xl bg-muted/40 flex items-center justify-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Saving voice note...</span>
              </div>
            )}
          </div>

          {/* Written note */}
          <div>
            <Label className="text-sm font-medium mb-1.5 block">
              <PenLine className="h-3.5 w-3.5 inline mr-1.5" />
              Written Note
            </Label>
            <Textarea
              value={writtenNote}
              onChange={(e) => setWrittenNote(e.target.value)}
              placeholder="Type a note about this contact — follow-ups, conversation highlights, to-dos..."
              rows={3}
              className="mb-2 resize-none"
              data-testid="textarea-written-note"
            />
            <Button
              className="w-full"
              onClick={handleSaveWrittenNote}
              disabled={!writtenNote.trim()}
              data-testid="button-save-written-note"
            >
              Save Note
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
