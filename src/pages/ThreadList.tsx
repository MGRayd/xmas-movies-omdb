import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "@/firebase";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Thread, ThreadStatus } from "@/types/Thread";

export default function ThreadList() {
  const { isAdmin } = useIsAdmin();
  const safeIsAdmin = isAdmin === true;
  
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ThreadStatus | 'all'>('all');

  useEffect(() => {
    let cancelled = false;
    
    (async () => {
      setLoading(true);

      const threadsRef = collection(db, "threads");

      try {
        let threadsQuery;
        
        // Build query based on admin status and filters
        if (safeIsAdmin) {
          threadsQuery = query(threadsRef, orderBy("updatedAt", "desc"));
        } else {
          threadsQuery = query(
            threadsRef, 
            where("published", "==", true),
            orderBy("updatedAt", "desc")
          );
        }
        
        const snap = await getDocs(threadsQuery);
        
        let docs = snap.docs.map((d) => ({ 
          id: d.id, 
          ...(d.data() as any) 
        })) as Thread[];

        // Apply status filter client-side if needed
        if (statusFilter !== 'all') {
          docs = docs.filter(thread => thread.status === statusFilter);
        }

        if (!cancelled) {
          setThreads(docs);
          setLoading(false);
        }
      } catch (err) {
        console.error("Thread list fetch error:", err);
        if (!cancelled) {
          setThreads([]);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [safeIsAdmin, statusFilter]);

  // Status badge renderer
  const renderStatusBadge = (status: ThreadStatus) => {
    switch (status) {
      case 'open':
        return <span className="badge badge-primary">Open</span>;
      case 'resolved':
        return <span className="badge badge-success">Resolved</span>;
      case 'abandoned':
        return <span className="badge badge-warning">Abandoned</span>;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">Threads</h1>

        <div className="flex flex-wrap gap-2">
          {/* Status filter */}
          <div className="form-control">
            <div className="flex flex-wrap items-center gap-2">
              <label className="label-text text-sm whitespace-nowrap">Status:</label>
              <select
                className="select select-bordered select-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ThreadStatus | 'all')}
              >
                <option value="all">All Threads</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
                <option value="abandoned">Abandoned</option>
              </select>
            </div>
          </div>

          {/* Status filter only */}
        </div>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : threads.length === 0 ? (
        <div>
          {statusFilter !== 'all' ? (
            <div>No {statusFilter} threads found.</div>
          ) : (
            <div>No threads found.</div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {threads.map((thread) => (
            <Link 
              to={`/threads/${thread.slug || thread.id}`} 
              key={thread.id} 
              className="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer"
            >
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <h3 className="card-title">{thread.title}</h3>
                  {renderStatusBadge(thread.status)}
                </div>
                {thread.description && (
                  <p className="opacity-80 line-clamp-2">{thread.description}</p>
                )}
                <div className="text-sm mt-2 text-primary">View thread →</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
