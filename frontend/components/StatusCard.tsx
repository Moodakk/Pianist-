"use client";

import type { JobStatus } from "@/lib/api";

interface Props {
  status: JobStatus | null;
  uploadingName?: string | null;
}

export function StatusCard({ status, uploadingName }: Props) {
  if (!status && !uploadingName) return null;

  const progress = status ? Math.round(status.progress * 100) : 5;
  const state = status?.state || "queued";

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Processing</h3>
        <span
          className={
            "text-xs px-2 py-1 rounded-md " +
            (state === "done"
              ? "bg-emerald-700 text-emerald-100"
              : state === "error"
                ? "bg-red-700 text-red-100"
                : "bg-ink-600 text-zinc-300")
          }
        >
          {state}
        </span>
      </div>
      <div className="text-sm text-zinc-400 mb-2">
        {status?.step || (uploadingName ? `Uploading ${uploadingName}…` : "")}
      </div>
      <div className="w-full h-2 bg-ink-600 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      {status?.error && (
        <div className="mt-3 text-sm text-red-300">{status.error}</div>
      )}
    </div>
  );
}
