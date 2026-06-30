"use client";

import { useEffect, useState } from "react";
import {
  deleteHistoryEntry,
  downloadUrl,
  listHistory,
  type HistoryEntry,
} from "@/lib/api";

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const { items } = await listHistory();
      setItems(items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onDelete = async (jobId: string) => {
    try {
      await deleteHistoryEntry(jobId);
      setItems((prev) => prev.filter((i) => i.job_id !== jobId));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Previous conversions</h2>
        <button className="btn btn-ghost" onClick={refresh}>
          Refresh
        </button>
      </div>

      {error && (
        <div className="card p-4 border border-red-700 text-red-200 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-zinc-400">Loading…</div>
      ) : items.length === 0 ? (
        <div className="card p-6 text-zinc-400">
          No conversions yet. Drop an audio file on the Convert page to get
          started.
        </div>
      ) : (
        <div className="card divide-y divide-ink-600">
          {items.map((entry) => (
            <div
              key={entry.job_id}
              className="flex items-center justify-between p-4"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">{entry.filename}</div>
                <div className="text-xs text-zinc-400">
                  {new Date(entry.created_at * 1000).toLocaleString()} ·{" "}
                  {(entry.size_bytes / 1024).toFixed(1)} KB · job{" "}
                  {entry.job_id.slice(0, 8)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  className="btn btn-primary"
                  href={downloadUrl(entry.job_id)}
                  download
                >
                  Download
                </a>
                <button
                  className="btn btn-ghost"
                  onClick={() => onDelete(entry.job_id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
