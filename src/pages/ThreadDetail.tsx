import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Thread, ThreadTimelineEvent } from "@/types/Thread";
import EnhancedMarkdown from "@/components/EnhancedMarkdown";

type LinkedItem = { id: string; slug?: string; label: string };

export default function ThreadDetail() {
  const { slug: routeSlug } = useParams();
  const [docId, setDocId] = useState<string | null>(null);
  const { isAdmin } = useIsAdmin();

  const [thread, setThread] = useState<Thread | null>(null);
  const [links, setLinks] = useState<{
    locations: LinkedItem[];
    npcs: LinkedItem[];
    sessions: LinkedItem[];
    monsters: LinkedItem[];
  }>({ locations: [], npcs: [], sessions: [], monsters: [] });
  const [error, setError] = useState<string | null>(null);

  // fetch the thread by slug
  useEffect(() => {
    if (!routeSlug) return;

    (async () => {
      try {
        // First, try to find the thread by slug
        const threadsRef = collection(db, "threads");
        const q = query(threadsRef, where("slug", "==", routeSlug));
        const querySnapshot = await getDocs(q);
        
        let threadData: Thread | null = null;
        let currentDocId: string | null = null;
        
        // If no thread found with the slug, check if routeSlug is an ID
        if (querySnapshot.empty) {
          // Try direct lookup by ID as fallback
          const directSnap = await getDoc(doc(db, "threads", routeSlug));
          if (!directSnap.exists()) {
            setError("Thread not found.");
            return;
          }
          
          currentDocId = directSnap.id;
          const raw = directSnap.data() as any;
          threadData = { id: directSnap.id, ...raw } as Thread;
        } else {
          // Use the first matching document by slug
          const snap = querySnapshot.docs[0];
          currentDocId = snap.id;
          const raw = snap.data() as any;
          threadData = { id: snap.id, ...raw } as Thread;
        }
        
        // Set the document data and ID
        setDocId(currentDocId);
        setThread(threadData);

        // resolve linked labels
        async function resolve(col: string, ids?: string[]) {
          const list = ids ?? [];
          if (!list.length) return [] as LinkedItem[];
          const out: LinkedItem[] = [];
          for (const id of list) {
            try {
              const s = await getDoc(doc(db, col, id));
              if (s.exists()) {
                const v = s.data() as any;
                out.push({ id, slug: v.slug || id, label: v.title || v.name || id });
                continue;
              }
            } catch {/* ignore */}
            out.push({ id, slug: id, label: id });
          }
          return out;
        }

        const [locs, npcs, sess, mons] = await Promise.all([
          resolve("locations", threadData.linkedLocations),
          resolve("npcs", threadData.linkedNpcs),
          resolve("sessions", threadData.linkedSessions),
          resolve("monsters", threadData.linkedMonsters),
        ]);

        setLinks({ locations: locs, npcs, sessions: sess, monsters: mons });
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to load thread.");
      }
    })();
  }, [routeSlug]);

  if (error) return <div className="p-6">{error}</div>;
  if (!thread) return <div className="p-6">Loading…</div>;

  // Status badge renderer
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <span className="badge badge-lg badge-primary">Open</span>;
      case 'resolved':
        return <span className="badge badge-lg badge-success">Resolved</span>;
      case 'abandoned':
        return <span className="badge badge-lg badge-warning">Abandoned</span>;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 prose prose-invert max-w-3xl">
      {/* Header */}
      <div className="not-prose flex items-center justify-between">
        <h1 className="text-3xl font-bold">{thread.title}</h1>
        <div className="flex items-center gap-3">
          {renderStatusBadge(thread.status)}
          {isAdmin && (
            <Link
              to={`/admin/threads/${docId}/edit`}
              className="btn btn-sm btn-outline"
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="my-4">
        <EnhancedMarkdown>{thread.description}</EnhancedMarkdown>
      </div>

      {/* Timeline Events */}
      {thread.events && thread.events.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Timeline</h2>
          <div className="w-full space-y-4">
            {/* Sort events chronologically (oldest to newest) */}
            {[...thread.events]
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((event, index) => {
                // Find the session for this event if it exists
                const session = event.sessionId ? links.sessions.find(s => s.id === event.sessionId) : null;
                const eventDate = new Date(event.date).toLocaleDateString();
                
                return (
                  <div key={event.id} className="relative">
                    {/* Timeline connector */}
                    {index > 0 && (
                      <div className="absolute left-4 -top-4 w-0.5 h-4 bg-primary"></div>
                    )}
                    
                    {/* Event card */}
                    <div className="card w-full bg-base-200 shadow-sm">
                      {/* Card header with date dot */}
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-base-300 border-2 border-primary flex items-center justify-center mr-2">
                          <div className="w-2 h-2 rounded-full bg-primary"></div>
                        </div>
                        <div className="card-title text-lg py-2">
                          <div className="badge badge-primary badge-outline p-3 font-medium">
                            {eventDate}
                          </div>
                          {session && (
                            <div className="badge badge-secondary p-3 ml-2">
                              {session.label}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="card-body pt-2">
                        {/* Event content */}
                        <div className="prose prose-invert max-w-none">
                          <EnhancedMarkdown autoBoldCharacters={true}>{event.content}</EnhancedMarkdown>
                        </div>
                        
                        {/* View in session link */}
                        {event.sessionId && session && (
                          <div className="card-actions justify-end mt-2">
                            <Link 
                              to={`/sessions/${session.slug || event.sessionId}`}
                              className="btn btn-sm btn-outline btn-accent inline-flex items-center gap-1"
                            >
                              <span>View in session</span>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Timeline connector to next event */}
                    {index < thread.events.length - 1 && (
                      <div className="absolute left-4 bottom-0 w-0.5 h-4 bg-primary"></div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Links */}
      {(links.locations.length || links.npcs.length || links.sessions.length || links.monsters.length) && (
        <div className="not-prose mt-10 border-t border-base-300 pt-6">
          <h2 className="text-2xl font-semibold mb-4">Related Content</h2>

          {links.sessions.length > 0 && (
            <BlockLinks title="Sessions" base="/sessions" items={links.sessions} />
          )}
          {links.npcs.length > 0 && (
            <BlockLinks title="NPCs" base="/npcs" items={links.npcs} />
          )}
          {links.locations.length > 0 && (
            <BlockLinks title="Locations" base="/locations" items={links.locations} />
          )}
          {links.monsters.length > 0 && (
            <BlockLinks title="Monsters" base="/monsters" items={links.monsters} />
          )}
        </div>
      )}
    </div>
  );
}

function BlockLinks({
  title,
  base,
  items,
}: {
  title: string;
  base: string;
  items: LinkedItem[];
}) {
  return (
    <div className="mb-4">
      <h3 className="text-xl font-medium mb-2">{title}</h3>
      <ul className="list-disc list-inside space-y-1">
        {items.map((x) => (
          <li key={x.id}>
            <Link className="link" to={`${base}/${x.slug || x.id}`}>
              {x.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
