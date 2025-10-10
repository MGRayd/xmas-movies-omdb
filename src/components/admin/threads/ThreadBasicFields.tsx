import { ThreadStatus } from "@/types/Thread";

export default function ThreadBasicFields({
  title,
  slug,
  description,
  status,
  onChange,
}: {
  title: string;
  slug: string;
  description: string;
  status: ThreadStatus;
  onChange: (patch: Partial<{
    title: string;
    slug: string;
    description: string;
    status: ThreadStatus;
  }>) => void;
}) {
  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <div className="grid gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Title</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Thread title"
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Slug (URL path)</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={slug}
              onChange={(e) => onChange({ slug: e.target.value })}
              placeholder="thread-url-path"
            />
            <label className="label">
              <span className="label-text-alt">
                Optional. Will be generated from title if left blank.
              </span>
            </label>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Description</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-24"
              value={description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Brief description of this thread"
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Status</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={status}
              onChange={(e) => onChange({ status: e.target.value as ThreadStatus })}
            >
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
              <option value="abandoned">Abandoned</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
