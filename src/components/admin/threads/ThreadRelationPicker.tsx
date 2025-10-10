import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import RelationPicker, { Option } from "@/components/RelationPicker";
import { Thread } from "@/types/Thread";

export default function ThreadRelationPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [threadOptions, setThreadOptions] = useState<Option[]>([]);

  // Load thread options
  async function loadThreads() {
    setLoading(true);
    try {
      const threadsRef = collection(db, "threads");
      const snapshot = await getDocs(threadsRef);
      
      const options = snapshot.docs.map(doc => {
        const data = doc.data() as Thread;
        return {
          id: doc.id,
          label: `${data.title} (${data.status.charAt(0).toUpperCase() + data.status.slice(1)})`,
        };
      });
      
      // Sort threads: open first, then resolved, then abandoned
      options.sort((a, b) => {
        const statusA = a.label.includes('(Open)') ? 0 : a.label.includes('(Resolved)') ? 1 : 2;
        const statusB = b.label.includes('(Open)') ? 0 : b.label.includes('(Resolved)') ? 1 : 2;
        
        if (statusA === statusB) {
          return a.label.localeCompare(b.label);
        }
        return statusA - statusB;
      });
      
      setThreadOptions(options);
    } catch (error) {
      console.error("Error loading threads:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadThreads();
  }, []);

  return (
    <div className="card bg-base-200">
      <div className="card-body gap-3">
        <h3 className="card-title">Thread Connections</h3>
        
        <RelationPicker
          title="Threads"
          options={threadOptions}
          selected={value}
          onChange={onChange}
          loading={loading}
          createHref="/admin/threads/new"
          onRefresh={loadThreads}
        />
        
        <div className="text-sm opacity-70 mt-2">
          Connect this session to existing threads or create new ones.
        </div>
      </div>
    </div>
  );
}
