import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc, collection as firestoreCollection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import EnhancedMarkdown from "@/components/EnhancedMarkdown";
import { useIsAdmin } from "@/hooks/useIsAdmin";

// New detail components
import SessionDetailView from "@/components/admin/sessions/SessionDetailView";
import NpcDetailView from "@/components/admin/npc/NpcDetailView";
import LocationDetailView from "@/components/admin/locations/LocationDetailView";
import MonsterDetailView from "@/components/admin/monsters/MonsterDetailView";
import CharacterDetailView from "@/components/admin/characters/CharacterDetailView";
import ThreadDetailView from "@/components/admin/threads/ThreadDetailView";

type LinkedItem = { id: string; slug?: string; label: string };

type BaseDoc = {
  id: string;
  title?: string;
  name?: string;
  date?: string;
  imageUrl?: string;
  summary?: string;
  deceased?: boolean;

  // markdown fallbacks for collections without a dedicated view yet
  contentMarkdown?: string;
  detailsMarkdown?: string;
  overviewMarkdown?: string;

  // relations (optional)
  linkedLocations?: string[];
  linkedNpcs?: string[];
  linkedMonsters?: string[];
  linkedSessions?: string[];
  linkedCharacters?: string[];
  linkedThreads?: string[];
};

export default function DetailPage({ collection }: { collection: string }) {
  const { slug: routeSlug } = useParams();
  const [docId, setDocId] = useState<string | null>(null);
  const { isAdmin } = useIsAdmin();

  const [data, setData] = useState<BaseDoc | null>(null);
  const [links, setLinks] = useState<{
    locations: LinkedItem[];
    npcs: LinkedItem[];
    monsters: LinkedItem[];
    sessions: LinkedItem[];
    characters: LinkedItem[];
    threads: LinkedItem[];
  }>({ locations: [], npcs: [], monsters: [], sessions: [], characters: [], threads: [] });
  const [error, setError] = useState<string | null>(null);

  // fetch the document by slug
  useEffect(() => {
    if (!collection || !routeSlug) return;

    (async () => {
      try {
        // First, try to find the document by slug
        const collectionRef = firestoreCollection(db, collection);
        const q = query(collectionRef, where("slug", "==", routeSlug));
        const querySnapshot = await getDocs(q);
        
        let docData: BaseDoc | null = null;
        let currentDocId: string | null = null;
        
        // If no document found with the slug, check if routeSlug is an ID
        if (querySnapshot.empty) {
          // Try direct lookup by ID as fallback (for backward compatibility)
          const directSnap = await getDoc(doc(db, collection, routeSlug));
          if (!directSnap.exists()) {
            setError("Not found.");
            return;
          }
          
          currentDocId = directSnap.id;
          const raw = directSnap.data() as any;
          docData = { id: directSnap.id, ...raw };
        } else {
          // Use the first matching document by slug
          const snap = querySnapshot.docs[0];
          currentDocId = snap.id;
          const raw = snap.data() as any;
          docData = { id: snap.id, ...raw };
        }
        
        // Set the document data and ID
        setDocId(currentDocId);
        setData(docData);

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

        const [locs, npcs, mons, sess, chars, threads] = await Promise.all([
          resolve("locations", docData.linkedLocations),
          resolve("npcs", docData.linkedNpcs),
          resolve("monsters", docData.linkedMonsters),
          resolve("sessions", docData.linkedSessions),
          resolve("characters", docData.linkedCharacters),
          resolve("threads", docData.linkedThreads),
        ]);

        setLinks({ locations: locs, npcs, monsters: mons, sessions: sess, characters: chars, threads });
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to load.");
      }
    })();
  }, [collection, routeSlug]);

  if (error) return <div className="p-6">{error}</div>;
  if (!data) return <div className="p-6">Loading…</div>;

  const title = data.title || data.name || data.id;

  return (
    <div className="container mx-auto px-4 py-6 prose prose-invert max-w-3xl">
      {/* Header */}
      <div className="not-prose flex items-center justify-between">
        <h1 className="text-3xl font-bold">{title}</h1>
        <div className="flex items-center gap-3">
          {(collection === 'npcs' || collection === 'monsters') && data.deceased && (
            <span className="text-error text-xl font-semibold">DECEASED</span>
          )}
          {isAdmin && (
            <Link
              to={`/admin/${collection}/${docId}/edit`}
              className="btn btn-sm btn-outline"
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      {data.date && (
        <p className="opacity-70">
          {new Date(data.date).toLocaleDateString()}
        </p>
      )}

      {data.imageUrl && (
        <img
          src={data.imageUrl}
          alt={title}
          className="rounded border border-base-300 my-4"
        />
      )}

      {/* Body — dispatch to collection-specific views */}
      {collection === "sessions" ? (
        <SessionDetailView data={data as any} />
      ) : collection === "npcs" ? (
        <NpcDetailView data={data as any} />
      ) : collection === "locations" ? (
        <LocationDetailView data={data as any} />
      ) : collection === "monsters" ? (
        <MonsterDetailView data={data as any} />
      ) : collection === "characters" ? (
        <CharacterDetailView data={data as any} />
      ) : collection === "threads" ? (
        <ThreadDetailView data={data as any} />
      ) : (
        // default fallback for other collections (until their own views exist)
        <EnhancedMarkdown>
          {data.contentMarkdown || data.detailsMarkdown || data.overviewMarkdown || ""}
        </EnhancedMarkdown>
      )}

      {/* Links */}
      {(links.locations.length ||
        links.npcs.length ||
        links.monsters.length ||
        links.sessions.length ||
        links.characters.length ||
        links.threads.length) && (
        <div className="not-prose mt-10 border-t border-base-300 pt-6">
          <h2 className="text-2xl font-semibold mb-4">Links</h2>

          {links.locations.length > 0 && (
            <BlockLinks title="Locations" base="/locations" items={links.locations} />
          )}
          {links.npcs.length > 0 && (
            <BlockLinks title="NPCs" base="/npcs" items={links.npcs} />
          )}
          {links.monsters.length > 0 && (
            <BlockLinks title="Monsters" base="/monsters" items={links.monsters} />
          )}
          {links.sessions.length > 0 && (
            <BlockLinks title="Related Sessions" base="/sessions" items={links.sessions} />
          )}
          {links.characters.length > 0 && (
            <BlockLinks title="Characters" base="/characters" items={links.characters} />
          )}
          {links.threads.length > 0 && (
            <BlockLinks title="Threads" base="/threads" items={links.threads} />
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
