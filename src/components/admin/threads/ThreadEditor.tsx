import { useNavigate, useParams } from "react-router-dom";
import { db } from "@/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  addDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase";
import { Thread, ThreadFormState, ThreadStatus, ThreadTimelineEvent } from "@/types/Thread";
import { Option } from "@/components/RelationPicker";
import { useToast } from "@/ui/ToastProvider";
import Collapsible from "@/components/admin/sessions/Collapsible";
import RelationPicker from "@/components/RelationPicker";
import ThreadBasicFields from "@/components/admin/threads/ThreadBasicFields";
import ThreadEventsEditor from "@/components/admin/threads/ThreadEventsEditor";

export default function ThreadEditor({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams();
  const col = "threads";
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
  const [form, setForm] = useState<ThreadFormState>({
    title: "",
    slug: "",
    description: "",
    status: "open",
    published: true,
    events: [],
    linkedLocations: [],
    linkedNpcs: [],
    linkedSessions: [],
    linkedMonsters: [],
  });

  // relation options
  const [locationsOpts, setLocationsOpts] = useState<Option[]>([]);
  const [npcsOpts, setNpcsOpts] = useState<Option[]>([]);
  const [sessionsOpts, setSessionsOpts] = useState<Option[]>([]);
  const [monstersOpts, setMonstersOpts] = useState<Option[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  // load existing doc (edit mode)
  useEffect(() => {
    (async () => {
      if (mode === "edit" && id) {
        // Edit existing thread
        const snap = await getDoc(doc(db, col, id));
        if (snap.exists()) {
          const data = snap.data() as Thread;
          setForm({
            title: data.title || "",
            slug: data.slug || "",
            description: data.description || "",
            status: data.status || "open",
            published: data.published ?? true,
            events: data.events || [],
            linkedLocations: data.linkedLocations || [],
            linkedNpcs: data.linkedNpcs || [],
            linkedSessions: data.linkedSessions || [],
            linkedMonsters: data.linkedMonsters || [],
          });
        }
      }
    })();
  }, [mode, id]);

  // load relation options
  async function loadRelationOptions() {
    setLoadingRefs(true);

    const toOptions = (docs: any[]) =>
      docs.map((d) => {
        const data = d.data();
        return { id: d.id, label: data.title || data.name || d.id } as Option;
      });

    const [locs, npcs, sess, mons] = await Promise.all([
      getDocs(collection(db, "locations")),
      getDocs(collection(db, "npcs")),
      getDocs(collection(db, "sessions")),
      getDocs(collection(db, "monsters")),
    ]);

    setLocationsOpts(toOptions(locs.docs));
    setNpcsOpts(toOptions(npcs.docs));
    setSessionsOpts(toOptions(sess.docs));
    setMonstersOpts(toOptions(mons.docs));
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

    // common payload
    const payload: Partial<Thread> = {
      title: form.title,
      slug,
      description: form.description,
      status: form.status,
      published: form.published,
      events: form.events,
      linkedLocations: form.linkedLocations,
      linkedNpcs: form.linkedNpcs,
      linkedSessions: form.linkedSessions,
      linkedMonsters: form.linkedMonsters,
      updatedAt: serverTimestamp(),
    };

    if (mode === "create") {
      payload.createdAt = serverTimestamp();
    }

    try {
      let targetId = id || null;

      if (mode === "edit" && targetId) {
        // Update existing doc
        await setDoc(doc(db, col, targetId), payload, { merge: true });
      } else {
        // Create new doc
        const created = await addDoc(collection(db, col), payload);
        targetId = created.id;
      }

      // Success toast
      toast.success("Thread saved");

      // Navigate to the editor (ID-based)
      nav(`/admin/${col}/${targetId}/edit`, { replace: true });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save thread.");
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

  return (
    <div className="container mx-auto max-w-3xl">
      <h1 className="text-2xl mb-4 capitalize">{mode} Thread</h1>

      <div className="flex flex-col gap-4">
        <Collapsible title="Basics" storageKey="thread-basics">
          <ThreadBasicFields
            title={form.title}
            slug={form.slug}
            description={form.description}
            status={form.status}
            onChange={(patch) => setForm((s) => ({ ...s, ...patch }))}
          />
        </Collapsible>

        <Collapsible title="Timeline Events" storageKey="thread-events">
          <ThreadEventsEditor
            events={form.events}
            sessions={sessionsOpts}
            onChange={(events) => setForm((s) => ({ ...s, events }))}
          />
        </Collapsible>

        <Collapsible title="Relations" storageKey="thread-relations">
          <div className="grid gap-4">
            <Collapsible title="Linked Sessions" storageKey="thread-rel-sessions">
              <RelationPicker
                title=""
                options={sessionsOpts}
                selected={form.linkedSessions}
                onChange={(next) => setForm((s) => ({ ...s, linkedSessions: next }))}
                loading={loadingRefs}
                createHref="/admin/sessions/new"
                onRefresh={loadRelationOptions}
              />
            </Collapsible>

            <Collapsible title="Linked NPCs" storageKey="thread-rel-npcs">
              <RelationPicker
                title=""
                options={npcsOpts}
                selected={form.linkedNpcs}
                onChange={(next) => setForm((s) => ({ ...s, linkedNpcs: next }))}
                loading={loadingRefs}
                createHref="/admin/npcs/new"
                onRefresh={loadRelationOptions}
              />
            </Collapsible>

            <Collapsible title="Linked Locations" storageKey="thread-rel-locations">
              <RelationPicker
                title=""
                options={locationsOpts}
                selected={form.linkedLocations}
                onChange={(next) => setForm((s) => ({ ...s, linkedLocations: next }))}
                loading={loadingRefs}
                createHref="/admin/locations/new"
                onRefresh={loadRelationOptions}
              />
            </Collapsible>

            <Collapsible title="Linked Monsters" storageKey="thread-rel-monsters">
              <RelationPicker
                title=""
                options={monstersOpts}
                selected={form.linkedMonsters}
                onChange={(next) => setForm((s) => ({ ...s, linkedMonsters: next }))}
                loading={loadingRefs}
                createHref="/admin/monsters/new"
                onRefresh={loadRelationOptions}
              />
            </Collapsible>
          </div>
        </Collapsible>

        <Collapsible title="Publish" storageKey="thread-publish">
          <div className="card bg-base-200">
            <div className="card-body">
              <div className="form-control">
                <label className="cursor-pointer label justify-start gap-4">
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={form.published}
                    onChange={(e) => setForm((s) => ({ ...s, published: e.target.checked }))}
                  />
                  <span className="label-text">
                    {form.published ? "Published" : "Draft (not visible to players)"}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </Collapsible>

        <div className="pt-2">
          <button className="btn btn-primary" onClick={save}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
