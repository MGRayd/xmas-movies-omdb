import { useState, useRef } from "react";
import { v4 as uuid } from "uuid";
import { ThreadTimelineEvent } from "@/types/Thread";
import { Option } from "@/components/RelationPicker";
import PlayerCharacterReference from "@/components/PlayerCharacterReference";

export default function ThreadEventsEditor({
  events,
  sessions,
  onChange,
}: {
  events: ThreadTimelineEvent[];
  sessions: Option[];
  onChange: (events: ThreadTimelineEvent[]) => void;
}) {
  const [draft, setDraft] = useState<Partial<ThreadTimelineEvent>>({
    date: new Date().toISOString().slice(0, 10),
    content: "",
    sessionId: "",
  });
  
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  function addEvent() {
    if (!draft.content?.trim()) return;

    const newEvent: ThreadTimelineEvent = {
      id: uuid(),
      date: draft.date || new Date().toISOString().slice(0, 10),
      content: draft.content.trim(),
      sessionId: draft.sessionId || undefined,
    };

    onChange([...events, newEvent]);
    
    // Reset content but keep the date
    setDraft({
      date: draft.date,
      content: "",
      sessionId: "",
    });
  }

  function updateEvent(id: string, patch: Partial<ThreadTimelineEvent>) {
    const updatedEvents = events.map(event => 
      event.id === id ? { ...event, ...patch } : event
    );
    onChange(updatedEvents);
  }

  function removeEvent(id: string) {
    const updatedEvents = events.filter(event => event.id !== id);
    onChange(updatedEvents);
  }

  function handleInsertCharacter(characterName: string) {
    // For new event draft
    if (contentTextareaRef.current) {
      const textarea = contentTextareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = draft.content || "";
      const newText = text.substring(0, start) + characterName + text.substring(end);
      setDraft({ ...draft, content: newText });
      
      // Set focus back to textarea and place cursor after inserted text
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + characterName.length, start + characterName.length);
      }, 0);
    }
  }

  // Sort events by date (newest first)
  const sortedEvents = [...events].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="card bg-base-200">
      <div className="card-body gap-4">
        <h3 className="card-title">Timeline Events</h3>

        {/* Add new event form */}
        <div className="grid gap-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Date</span>
              </label>
              <input
                type="date"
                className="input input-bordered w-full"
                value={draft.date || ""}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </div>
            <div className="form-control md:col-span-2">
              <label className="label">
                <span className="label-text">Related Session (Optional)</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={draft.sessionId || ""}
                onChange={(e) => setDraft({ ...draft, sessionId: e.target.value || undefined })}
              >
                <option value="">None</option>
                {[...sessions]
                  .sort((a, b) => {
                    // Extract numbers from session labels (e.g., "Session-1" -> 1)
                    const numA = parseInt(a.label.replace(/[^0-9]/g, '')) || 0;
                    const numB = parseInt(b.label.replace(/[^0-9]/g, '')) || 0;
                    return numA - numB;
                  })
                  .map(session => (
                    <option key={session.id} value={session.id}>
                      {session.label}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Event Description</span>
            </label>
            <textarea
              ref={contentTextareaRef}
              className="textarea textarea-bordered h-20"
              placeholder="Describe what happened in this thread event"
              value={draft.content || ""}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
            />
            <PlayerCharacterReference onInsert={handleInsertCharacter} />
          </div>
          <button 
            type="button" 
            className="btn btn-primary w-full"
            onClick={addEvent}
            disabled={!draft.content?.trim()}
          >
            Add Event
          </button>
        </div>

        {/* Events list */}
        {sortedEvents.length === 0 ? (
          <div className="opacity-60 mt-4">No events yet. Add your first one above.</div>
        ) : (
          <div className="mt-4">
            <h4 className="font-medium mb-2">Timeline ({sortedEvents.length} events)</h4>
            <ul className="space-y-4">
              {sortedEvents.map((event) => (
                <li key={event.id} className="card bg-base-300">
                  <div className="card-body p-4">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="date"
                          className="input input-bordered input-sm"
                          value={event.date}
                          onChange={(e) => updateEvent(event.id, { date: e.target.value })}
                        />
                        <select
                          className="select select-bordered select-sm"
                          value={event.sessionId || ""}
                          onChange={(e) => updateEvent(event.id, { sessionId: e.target.value || undefined })}
                        >
                          <option value="">No session</option>
                          {[...sessions]
                            .sort((a, b) => {
                              // Extract numbers from session labels (e.g., "Session-1" -> 1)
                              const numA = parseInt(a.label.replace(/[^0-9]/g, '')) || 0;
                              const numB = parseInt(b.label.replace(/[^0-9]/g, '')) || 0;
                              return numA - numB;
                            })
                            .map(session => (
                              <option key={session.id} value={session.id}>
                                {session.label}
                              </option>
                            ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        className="btn btn-error btn-outline btn-sm"
                        onClick={() => removeEvent(event.id)}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="relative">
                      <textarea
                        className="textarea textarea-bordered mt-2 w-full"
                        value={event.content}
                        onChange={(e) => updateEvent(event.id, { content: e.target.value })}
                      />
                      <div className="mt-1">
                        <PlayerCharacterReference 
                          onInsert={(characterName) => {
                            const updatedContent = event.content + characterName;
                            updateEvent(event.id, { content: updatedContent });
                          }} 
                        />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
