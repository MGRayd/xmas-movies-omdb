import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { db, storage, auth } from "@/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  addDoc,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import { onAuthStateChanged } from "firebase/auth";

import Collapsible from "@/components/admin/sessions/Collapsible";
import BasicFields from "@/components/admin/sessions/BasicFields";
import MarkdownEditor from "@/components/admin/sessions/MarkdownEditor";
import PublishToggle from "@/components/admin/sessions/PublishToggle";
import ImageUpload from "@/components/admin/sessions/ImageUpload";
import SessionRelations from "@/components/admin/sessions/SessionRelations";
import { Option } from "@/components/RelationPicker";
import TldrEditor from "@/components/admin/sessions/TldrEditor";
import ThreadRelationPicker from "@/components/admin/threads/ThreadRelationPicker";
import { useToast } from "@/ui/ToastProvider";

type AnyMap = Record<string, any>;

export default function AdminEditor({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const noteId = searchParams.get('noteId');
  const col = "sessions";
  const nav = useNavigate();

  // auth
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) return setIsAdmin(false);
      const r = await getDoc(doc(db, "roles", u.uid));
      setIsAdmin(r.exists() && r.data()?.admin === true);
    });
  }, []);

  const toast = useToast();

  // form state
  const [form, setForm] = useState<AnyMap>({
    title: "",
    slug: "",
    date: "",
    summary: "",
    quote: "",
    tldr: "",
    contentMarkdown: "",
    published: true,
    imageUrl: null as string | null,

    // relations
    linkedLocations: [] as string[],
    linkedNpcs: [] as string[],
    linkedMonsters: [] as string[],
    linkedSessions: [] as string[],
    linkedThreads: [] as string[],
  });

  const [imageFile, setImageFile] = useState<File | null>(null);

  // relation options
  const [locationsOpts, setLocationsOpts] = useState<Option[]>([]);
  const [npcsOpts, setNpcsOpts] = useState<Option[]>([]);
  const [monstersOpts, setMonstersOpts] = useState<Option[]>([]);
  const [sessionsOpts, setSessionsOpts] = useState<Option[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  // load existing doc (edit) or note content (create from note)
  useEffect(() => {
    (async () => {
      if (mode === "edit" && id) {
        // Edit existing session
        const snap = await getDoc(doc(db, col, id));
        if (snap.exists()) {
          const data = snap.data();
          setForm((s) => ({
            ...s,
            ...data,
            title: data.title || data.name || "",
            slug: data.slug || "",
            date: data.date || "",
            summary: data.summary || "",
            quote: data.quote || "",
            tldr: data.tldr || "",
            contentMarkdown:
              data.contentMarkdown ||
              data.detailsMarkdown ||
              data.overviewMarkdown ||
              "",
            imageUrl: data.imageUrl || null,
            linkedLocations: data.linkedLocations ?? [],
            linkedNpcs: data.linkedNpcs ?? [],
            linkedMonsters: data.linkedMonsters ?? [],
            linkedSessions: data.linkedSessions ?? [],
            linkedThreads: data.linkedThreads ?? [],
          }));
        }
      } else {
        // New session
        const today = new Date().toISOString().slice(0, 10);
        setForm((s) => ({ ...s, date: s.date || today }));
        
        // If noteId is provided, load content from session note
        if (noteId) {
          try {
            const noteSnap = await getDoc(doc(db, 'sessionNotes', noteId));
            if (noteSnap.exists()) {
              const noteData = noteSnap.data();
              let sessionTitle = '';
              
              // Get the session data to link it if sessionId exists
              if (noteData.sessionId) {
                try {
                  const sessionSnap = await getDoc(doc(db, 'sessions', noteData.sessionId));
                  if (sessionSnap.exists()) {
                    sessionTitle = sessionSnap.data().title || '';
                  }
                } catch (err) {
                  console.error('Error loading session:', err);
                }
              }
              
              // Generate a title based on whether it's a draft or session note
              const noteTitle = noteData.isDraft 
                ? `Session Log from Draft: ${noteData.title || 'Untitled'}` 
                : `Session Log: ${sessionTitle || 'Untitled'}`;
              
              // Update form with note content and relationships
              setForm((s) => ({
                ...s,
                title: noteTitle,
                contentMarkdown: noteData.content || '',
                // Use relationships from the note
                linkedLocations: noteData.linkedLocations || [],
                linkedNpcs: noteData.linkedNpcs || [],
                linkedMonsters: noteData.linkedMonsters || [],
                // Include the source session if it exists
                linkedSessions: noteData.sessionId 
                  ? [...(noteData.linkedSessions || []), noteData.sessionId].filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
                  : (noteData.linkedSessions || []),
              }));
              
              toast.success('Loaded content from session notes');
            }
          } catch (err) {
            console.error('Error loading note:', err);
            toast.error('Failed to load session note');
          }
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
  }, [mode, id, noteId]); // Remove toast from dependencies to prevent infinite loops

  // load relation options (sessions)
  async function loadRelationOptions() {
    setLoadingRefs(true);

    const toOptions = (docs: any[]) =>
      docs.map((d) => {
        const data = d.data();
        return { id: d.id, label: data.title || data.name || d.id } as Option;
      });

    const [locs, npcs, mons, sess] = await Promise.all([
      getDocs(collection(db, "locations")),
      getDocs(collection(db, "npcs")),
      getDocs(collection(db, "monsters")),
      getDocs(collection(db, "sessions")),
    ]);

    setLocationsOpts(toOptions(locs.docs));
    setNpcsOpts(toOptions(npcs.docs));
    setMonstersOpts(toOptions(mons.docs));
    setSessionsOpts(toOptions(sess.docs));
    setLoadingRefs(false);
  }
  useEffect(() => {
    loadRelationOptions();
  }, []);

  function slugify(v: string) {
    return v.toLowerCase().replace(/[^a-z0-9\- ]/g, "").replace(/\s+/g, "-");
  }

  async function save() {
    // Require a Title (slug is optional, will be derived if blank)
    const base = (form.slug || form.title || "").trim();
    if (!form.title?.trim() && !base) {
      toast.error("Please enter a Title.");
      return;
    }
  
    const slug = base ? slugify(base) : "";
  
    // normalize date
    let normalizedDate = form.date;
    if (normalizedDate) {
      try {
        const d = new Date(normalizedDate);
        normalizedDate = isNaN(+d)
          ? new Date().toISOString().slice(0, 10)
          : d.toISOString().slice(0, 10);
      } catch {
        normalizedDate = new Date().toISOString().slice(0, 10);
      }
    } else {
      normalizedDate = new Date().toISOString().slice(0, 10);
    }
  
    // common payload (without imageUrl; we may replace it after upload)
    const basePayload: AnyMap = {
      ...form,
      slug, // keep slug as a field for pretty links, not as doc id
      date: normalizedDate,
      published: !!form.published,
      updatedAt: serverTimestamp(),
      createdAt: form.createdAt || serverTimestamp(),
      contentMarkdown:
        form.contentMarkdown || form.detailsMarkdown || form.overviewMarkdown || "",
    };
    Object.keys(basePayload).forEach(
      (k) => basePayload[k] === undefined && delete basePayload[k]
    );
  
    try {
      let targetId = id || null;
  
      if (mode === "edit" && targetId) {
        // Update existing doc first (without image)
        await setDoc(doc(db, col, targetId), basePayload, { merge: true });
      } else {
        // Create new doc to get an ID
        const created = await addDoc(collection(db, col), basePayload);
        targetId = created.id;
        
        // If this session was created from a note, update the note to link it to this session
        if (noteId) {
          try {
            const noteRef = doc(db, 'sessionNotes', noteId);
            const noteSnap = await getDoc(noteRef);
            
            if (noteSnap.exists()) {
              // Update the note to link it to the new session
              await updateDoc(noteRef, {
                sessionId: targetId,
                isDraft: false, // No longer a draft
                updatedAt: serverTimestamp()
              });
              
              console.log(`Updated note ${noteId} to link to session ${targetId}`);
            }
          } catch (noteErr) {
            console.error('Error updating note with session link:', noteErr);
            // Don't fail the whole operation if this update fails
          }
        }
      }
  
      // Upload image if a new file was chosen
      let imageUrl = basePayload.imageUrl ?? null;
      if (imageFile && targetId) {
        const path = `uploads/${col}/${targetId}-${uuid()}`;
        await uploadBytes(ref(storage, path), imageFile);
        imageUrl = await getDownloadURL(ref(storage, path));
        await updateDoc(doc(db, col, targetId), {
          imageUrl,
          updatedAt: serverTimestamp(),
        });
      }
  
      // ✅ success toast
      toast.success("Session saved");
  
      // Navigate: stay in the editor (ID-based)
      nav(`/admin/${col}/${targetId}/edit`, { replace: true });
    } catch (e: any) {
      console.error(e);
      // ❌ error toast
      toast.error(e?.message || "Failed to save session.");
    }
  }
  
  if (isAdmin === null) return <div>Loading…</div>;
  if (!isAdmin) {
    return (
      <div className="alert alert-error mt-6">
        <h3 className="font-bold">Access Denied</h3>
        <p>You do not have permission to edit this content.</p>
      </div>
    );
  }

  const isSession = true; // this editor is specific to sessions

  return (
    <div className="container mx-auto max-w-3xl">
      <h1 className="text-2xl mb-4 capitalize">{mode} {col}</h1>

      <div className="flex flex-col gap-4">
        <Collapsible title="Basics" storageKey="sec-basics" defaultOpen>
          <BasicFields
            col={col}
            title={form.title || ""}
            slug={form.slug || ""}
            date={form.date || ""}
            summary={form.summary || ""}
            quote={form.quote || ""}
            onChange={(patch) => setForm((s) => ({ ...s, ...patch }))}
          />
        </Collapsible>

        <Collapsible title="TL;DR" storageKey="sec-tldr" defaultOpen>
          <TldrEditor
            value={form.tldr || ""}
            onChange={(v) => setForm((s) => ({ ...s, tldr: v }))}
          />
        </Collapsible>

        <Collapsible title="Content" storageKey="sec-content" defaultOpen>
          <MarkdownEditor
            value={
              form.contentMarkdown ||
              form.detailsMarkdown ||
              form.overviewMarkdown ||
              ""
            }
            onChange={(v) => setForm((s) => ({ ...s, contentMarkdown: v }))}
          />
        </Collapsible>

        <Collapsible title="Image" storageKey="sec-image">
          <ImageUpload onFile={setImageFile} currentUrl={form.imageUrl} />
        </Collapsible>

        <Collapsible title="Publish" storageKey="sec-publish">
          <PublishToggle
            published={!!form.published}
            onChange={(v) => setForm((s) => ({ ...s, published: v }))}
          />
        </Collapsible>

        {isSession && (
          <Collapsible title="Threads" storageKey="sec-threads" defaultOpen>
            <ThreadRelationPicker
              value={form.linkedThreads || []}
              onChange={(next) => setForm((s) => ({ ...s, linkedThreads: next }))}
            />
          </Collapsible>
        )}

        {isSession && (
          <Collapsible title="Relations" storageKey="sec-relations" defaultOpen>
            <SessionRelations
              loading={loadingRefs}
              locations={locationsOpts}
              npcs={npcsOpts}
              monsters={monstersOpts}
              sessions={sessionsOpts}
              value={{
                linkedLocations: form.linkedLocations || [],
                linkedNpcs: form.linkedNpcs || [],
                linkedMonsters: form.linkedMonsters || [],
                linkedSessions: form.linkedSessions || [],
              }}
              onChange={(patch) => setForm((s) => ({ ...s, ...patch }))}
              onRefresh={loadRelationOptions}
            />
          </Collapsible>
        )}

        <div className="pt-2">
          <button className="btn btn-primary" onClick={save}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
