import { useNavigate, useParams } from "react-router-dom";
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
import BasicFields from "@/components/admin/locations/BasicFields";
import MarkdownEditor from "@/components/admin/sessions/MarkdownEditor";
import PublishToggle from "@/components/admin/sessions/PublishToggle";
import ImageUpload from "@/components/admin/sessions/ImageUpload";
import LocationRelations from "@/components/admin/locations/LocationRelations";
import { Option } from "@/components/RelationPicker";
import { useToast } from "@/ui/ToastProvider";

type AnyMap = Record<string, any>;

export default function LocationEditor({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams();
  const col = "locations";
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
    name: "",
    slug: "",
    summary: "",
    quote: "",
    description: "",
    appearance: "",
    notableFeatures: "",
    descriptionMarkdown: "",
    appearanceMarkdown: "",
    featuresMarkdown: "",
    published: true,
    imageUrl: null as string | null,

    // relations
    linkedLocations: [] as string[],
    linkedNpcs: [] as string[],
    linkedMonsters: [] as string[],
    linkedSessions: [] as string[],
  });

  const [imageFile, setImageFile] = useState<File | null>(null);

  // relation options
  const [locationsOpts, setLocationsOpts] = useState<Option[]>([]);
  const [npcsOpts, setNpcsOpts] = useState<Option[]>([]);
  const [monstersOpts, setMonstersOpts] = useState<Option[]>([]);
  const [sessionsOpts, setSessionsOpts] = useState<Option[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  // load existing doc (edit)
  useEffect(() => {
    (async () => {
      if (mode === "edit" && id) {
        const snap = await getDoc(doc(db, col, id));
        if (snap.exists()) {
          const data = snap.data();
          setForm((s) => ({
            ...s,
            ...data,
            name: data.name || "",
            slug: data.slug || "",
            summary: data.summary || "",
            quote: data.quote || "",
            description: data.description || "",
            appearance: data.appearance || "",
            notableFeatures: data.notableFeatures || "",
            descriptionMarkdown: data.descriptionMarkdown || "",
            appearanceMarkdown: data.appearanceMarkdown || "",
            featuresMarkdown: data.featuresMarkdown || "",
            imageUrl: data.imageUrl || null,
            linkedLocations: data.linkedLocations ?? [],
            linkedNpcs: data.linkedNpcs ?? [],
            linkedMonsters: data.linkedMonsters ?? [],
            linkedSessions: data.linkedSessions ?? [],
          }));
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // Require a Name (slug is optional, will be derived if blank)
    const base = (form.slug || form.name || "").trim();
    if (!form.name?.trim() && !base) {
      toast.error("Please enter a Name.");
      return;
    }

    const slug = base ? slugify(base) : "";

    // common payload (without imageUrl; we may replace it after upload)
    const basePayload: AnyMap = {
      ...form,
      slug, // keep slug as a field for pretty links, not as doc id
      published: !!form.published,
      updatedAt: serverTimestamp(),
      createdAt: form.createdAt || serverTimestamp(),
      descriptionMarkdown: form.descriptionMarkdown || "",
      appearanceMarkdown: form.appearanceMarkdown || "",
      featuresMarkdown: form.featuresMarkdown || "",
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
      toast.success("Location saved");

      // Navigate: stay in the editor (ID-based)
      nav(`/admin/${col}/${targetId}/edit`, { replace: true });
    } catch (e: any) {
      console.error(e);
      // ❌ error toast
      toast.error(e?.message || "Failed to save location.");
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
      <h1 className="text-2xl mb-4 capitalize">{mode} {col}</h1>

      <div className="flex flex-col gap-4">
        <Collapsible title="Basics" storageKey="sec-basics">
          <BasicFields
            col={col}
            name={form.name || ""}
            slug={form.slug || ""}
            summary={form.summary || ""}
            quote={form.quote || ""}
            onChange={(patch) => setForm((s) => ({ ...s, ...patch }))}
          />
        </Collapsible>

        <Collapsible title="Description" storageKey="sec-description">
          <MarkdownEditor
            value={form.descriptionMarkdown || ""}
            onChange={(v) => setForm((s) => ({ ...s, descriptionMarkdown: v }))}
          />
        </Collapsible>

        <Collapsible title="Appearance" storageKey="sec-appearance">
          <MarkdownEditor
            value={form.appearanceMarkdown || ""}
            onChange={(v) => setForm((s) => ({ ...s, appearanceMarkdown: v }))}
          />
        </Collapsible>

        <Collapsible title="Notable Features" storageKey="sec-features">
          <MarkdownEditor
            value={form.featuresMarkdown || ""}
            onChange={(v) => setForm((s) => ({ ...s, featuresMarkdown: v }))}
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

        <Collapsible title="Relations" storageKey="sec-relations">
          <LocationRelations
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

        <div className="pt-2">
          <button className="btn btn-primary" onClick={save}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
