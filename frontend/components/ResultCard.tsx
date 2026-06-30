"use client";

import { downloadUrl, type PreviewResponse } from "@/lib/api";
import { PianoRoll } from "./PianoRoll";

interface Props {
  jobId: string;
  preview: PreviewResponse | null;
}

export function ResultCard({ jobId, preview }: Props) {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Result</h3>
        <a
          href={downloadUrl(jobId)}
          className="btn btn-primary"
          download
        >
          Download MIDI
        </a>
      </div>

      {preview && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Stat label="Notes" value={String(preview.note_count)} />
            <Stat
              label="Duration"
              value={`${preview.duration.toFixed(2)} s`}
            />
            <Stat
              label="Est. BPM"
              value={preview.estimated_bpm ? preview.estimated_bpm.toFixed(1) : "—"}
            />
            <Stat label="Job" value={jobId.slice(0, 8)} />
          </div>

          <div>
            <div className="field-label">Piano roll</div>
            <PianoRoll notes={preview.notes} duration={preview.duration} />
          </div>

          <div>
            <div className="field-label">First detected notes</div>
            <div className="max-h-44 overflow-y-auto text-sm bg-ink-700 rounded-lg p-2 font-mono">
              {preview.notes.slice(0, 60).map((n, i) => (
                <div key={i} className="flex justify-between">
                  <span>{n.name.padEnd(4, " ")}</span>
                  <span className="text-zinc-400">
                    {n.start.toFixed(2)}s – {n.end.toFixed(2)}s · v{n.velocity}
                  </span>
                </div>
              ))}
              {preview.notes.length === 0 && (
                <div className="text-zinc-500">No notes detected.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink-700 rounded-lg p-3">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
