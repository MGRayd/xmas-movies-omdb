import { Thread } from "@/types/Thread";

export default function ThreadDetailView({ data }: { data: Thread }) {
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
    <div className="mt-4">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-semibold">Status:</h2>
        {renderStatusBadge(data.status)}
      </div>

      {data.description && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Description</h2>
          <p className="whitespace-pre-wrap">{data.description}</p>
        </div>
      )}

      {/* Timeline Events */}
      {data.events && data.events.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Timeline</h2>
          <ul className="timeline timeline-vertical">
            {data.events.map((event, index) => (
              <li key={event.id}>
                <div className="timeline-start">{new Date(event.date).toLocaleDateString()}</div>
                <div className="timeline-middle">
                  <div className="w-3 h-3 rounded-full bg-primary"></div>
                </div>
                <div className="timeline-end timeline-box bg-base-200">
                  <p>{event.content}</p>
                </div>
                {index < data.events.length - 1 && <hr />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
