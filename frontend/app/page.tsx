"use client";

import { useEffect, useRef, useState } from "react";
import {
  getPreview,
  getStatus,
  startConvert,
  uploadAudio,
  type JobStatus,
  type PreviewResponse,
} from "@/lib/api";
import { DropZone } from "@/components/DropZone";
import { ResultCard } from "@/components/ResultCard";
import {
  defaultSettings,
  SettingsPanel,
  type SettingsState,
} from "@/components/SettingsPanel";
import { StatusCard } from "@/components/StatusCard";

export default function HomePage() {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = () => {
    setJobId(null);
    setStatus(null);
    setPreview(null);
    setError(null);
    setUploadingName(null);
  };

  const onFile = async (file: File) => {
    reset();
    setUploadingName(file.name);
    try {
      const { file_id } = await uploadAudio(file);
      const { job_id } = await startConvert({
        file_id,
        mode: settings.mode,
        use_demucs: settings.use_demucs || settings.mode === "stem",
        selected_stem: settings.selected_stem,
        quantize: settings.quantize,
        min_note_duration_ms: settings.min_note_duration_ms,
        min_velocity: settings.min_velocity,
        transpose: settings.transpose,
        estimate_tempo: settings.estimate_tempo,
        merge_close_notes: settings.merge_close_notes,
      });
      setJobId(job_id);
      setUploadingName(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setUploadingName(null);
    }
  };

  useEffect(() => {
    if (!jobId) return;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const s = await getStatus(jobId);
        setStatus(s);
        if (s.state === "done") {
          if (pollRef.current) clearInterval(pollRef.current);
          try {
            setPreview(await getPreview(jobId));
          } catch (e) {
            console.warn("preview failed", e);
          }
        } else if (s.state === "error") {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch (e) {
        console.warn("status poll failed", e);
      }
    }, 1500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [jobId]);

  const busy =
    !!uploadingName ||
    (status !== null && (status.state === "queued" || status.state === "running"));

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6">
      <main className="space-y-6">
        <DropZone onFile={onFile} disabled={busy} />

        {error && (
          <div className="card p-4 border border-red-700 text-red-200 text-sm">
            {error}
          </div>
        )}

        <StatusCard status={status} uploadingName={uploadingName} />

        {jobId && status?.state === "done" && (
          <ResultCard jobId={jobId} preview={preview} />
        )}

        <div className="text-xs text-zinc-500">
          Tip: pick a mode and tweak quantize / min note length on the right.
          For full songs, enable Demucs and convert just the stem you need
          (e.g. bass or vocals) for cleaner MIDI.
        </div>
      </main>

      <SettingsPanel value={settings} onChange={setSettings} disabled={busy} />
    </div>
  );
}
