export type Mode = "full" | "melody" | "bass" | "stem" | "piano";
export type StemName = "vocals" | "bass" | "other" | "drums" | "original";
export type Quantize = "none" | "1/16" | "1/8" | "1/4";

export interface ConvertRequest {
  file_id: string;
  mode: Mode;
  use_demucs: boolean;
  selected_stem: StemName;
  quantize: Quantize;
  min_note_duration_ms: number;
  min_velocity: number;
  transpose: number;
  estimate_tempo: boolean;
  merge_close_notes: boolean;
}

export interface JobStatus {
  job_id: string;
  state: "queued" | "running" | "done" | "error";
  progress: number;
  step: string;
  error: string | null;
  file_id: string | null;
  output_filename: string | null;
  created_at: number;
  updated_at: number;
}

export interface NotePreview {
  pitch: number;
  name: string;
  start: number;
  end: number;
  velocity: number;
}

export interface PreviewResponse {
  job_id: string;
  duration: number;
  note_count: number;
  estimated_bpm: number | null;
  notes: NotePreview[];
}

export interface HistoryEntry {
  job_id: string;
  filename: string;
  created_at: number;
  size_bytes: number;
}

async function jsonOrThrow<T>(r: Response): Promise<T> {
  if (!r.ok) {
    let detail = `${r.status} ${r.statusText}`;
    try {
      const body = await r.json();
      if (body?.detail) detail = String(body.detail);
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return (await r.json()) as T;
}

export async function uploadAudio(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch("/api/upload", { method: "POST", body: fd });
  return jsonOrThrow<{ file_id: string; filename: string; size_bytes: number }>(r);
}

export async function startConvert(req: ConvertRequest) {
  const r = await fetch("/api/convert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return jsonOrThrow<{ job_id: string }>(r);
}

export async function getStatus(jobId: string) {
  const r = await fetch(`/api/status/${jobId}`);
  return jsonOrThrow<JobStatus>(r);
}

export async function getPreview(jobId: string) {
  const r = await fetch(`/api/preview/${jobId}`);
  return jsonOrThrow<PreviewResponse>(r);
}

export async function listHistory() {
  const r = await fetch("/api/history");
  return jsonOrThrow<{ items: HistoryEntry[] }>(r);
}

export async function deleteHistoryEntry(jobId: string) {
  const r = await fetch(`/api/history/${jobId}`, { method: "DELETE" });
  return jsonOrThrow<{ deleted: string }>(r);
}

export const downloadUrl = (jobId: string) => `/api/download/${jobId}`;
