import { useEffect, useState } from "react";

export default function Collapsible({
  title,
  children,
  defaultOpen = false, // This prop is kept for backward compatibility but will be ignored
  storageKey, // optional: persist open/closed
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  storageKey?: string;
}) {
  const key = storageKey || `collapsible:${title}`;
  // Always initialize as closed regardless of defaultOpen prop
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      // Only check localStorage if we want to restore a previously saved state
      // Otherwise, always ensure it's closed on initial load
      const s = localStorage.getItem(key);
      if (s !== null) setOpen(s === "1");
      else localStorage.setItem(key, "0"); // Ensure it's saved as closed if no value exists
    } catch {}
  }, [key]);

  useEffect(() => {
    try {
      localStorage.setItem(key, open ? "1" : "0");
    } catch {}
  }, [key, open]);

  return (
    <div className="collapse collapse-arrow bg-base-200 border border-base-300">
      <input type="checkbox" checked={open} onChange={() => setOpen(!open)} />
      <div className="collapse-title text-lg font-semibold">{title}</div>
      <div className="collapse-content pt-3">{children}</div>
    </div>
  );
}
